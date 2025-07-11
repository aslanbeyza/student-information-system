import { Elysia,t } from 'elysia';
import { Course } from '@/models/Course';
import { Teacher } from '@/models/Teacher';
import { Student } from '@/models/Student';
import { ResponseHelper } from '@/utils/responses';
import { createCourseSchema, updateCourseSchema, paginationSchema, idParamSchema } from '@/utils/validation';
import { requireAuth, requireTeacherOrAdmin, requireAdmin } from '@/middleware/auth';
import { UserRole } from '@/types';
import { z } from 'zod';

export const courseRoutes = new Elysia({ prefix: '/courses' })
  .use(requireAuth)
  // Ders listesi (herkese açık - öğrenciler ders arama için gerekli)
  .get('/', async ({ query, set, user }: any) => {
    try {
      const { page, limit } = paginationSchema.parse(query);
      const skip = (page - 1) * limit;

      // Öğretmenler sadece kendi derslerini görebilir (isActive filtresi yok)
      let filter: any = {};
      if (user!.role === UserRole.TEACHER) {
        const teacherData = await Teacher.findOne({ userId: user!.userId });
        if (teacherData) {
          filter.teacherId = teacherData._id;
        }
      } else {
        // Öğrenciler ve admin sadece aktif dersleri görür
        filter.isActive = true;
      }

      const [courses, total] = await Promise.all([
        Course.find(filter)
          .populate('teacherId', 'userId department title specialization')
          .populate({
            path: 'teacherId',
            populate: {
              path: 'userId',
              select: 'firstName lastName'
            }
          })
          .skip(skip)
          .limit(limit)
          .sort({ department: 1, academicYear: -1, semester: 1 }),
        Course.countDocuments(filter)
      ]);

      return ResponseHelper.successWithPagination(
        courses,
        { page, limit, total },
        'Ders listesi'
      );
    } catch (error: any) {
      if (error.name === 'ZodError') {
        set.status = 400;
        return ResponseHelper.badRequest(error.errors[0]?.message || 'Geçersiz sorgu parametreleri');
      }

      set.status = 500;
      return ResponseHelper.serverError('Ders listesi alınırken hata oluştu', error.message);
    }
  }, {
    detail: {
      tags: ['Courses'],
      summary: 'Ders Listesi',
      description: 'Derslerin listesini döner. Öğretmenler sadece kendi derslerini, öğrenciler aktif dersleri görebilir.',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'page',
          in: 'query',
          description: 'Sayfa numarası',
          required: false,
          schema: { type: 'integer', minimum: 1, default: 1 }
        },
        {
          name: 'limit',
          in: 'query',
          description: 'Sayfa başına ders sayısı',
          required: false,
          schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 }
        }
      ],
      responses: {
        200: {
          description: 'Ders listesi başarıyla alındı',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ApiResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Course' }
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        400: { description: 'Geçersiz sorgu parametreleri' },
        401: { description: 'Kimlik doğrulama gerekli' }
      }
    }
  })
  // Belirli ders bilgilerini getir
  .get('/:id', async ({ params, set, user }: any) => {
    try {
      const { id } = idParamSchema.parse(params);

      const course = await Course.findById(id)
        .populate('teacherId', 'userId department title specialization')
        .populate({
          path: 'teacherId',
          populate: {
            path: 'userId',
            select: 'firstName lastName'
          }
        })
        .populate('enrolledStudents', 'userId studentNumber')
        .populate({
          path: 'enrolledStudents',
          populate: {
            path: 'userId',
            select: 'firstName lastName'
          }
        });

      if (!course) {
        set.status = 404;
        return ResponseHelper.notFound('Ders');
      }

      // Öğretmen sadece kendi derslerini, öğrenci kayıtlı olduğu dersleri görebilir
      if (user!.role === UserRole.TEACHER) {
        const teacherData = await Teacher.findOne({ userId: user!.userId });
        if (teacherData && course.teacherId.toString() !== teacherData._id.toString()) {
          set.status = 403;
          return ResponseHelper.forbidden('Bu dersi görme yetkiniz yok');
        }
      } else if (user!.role === UserRole.STUDENT) {
        const studentData = await Student.findOne({ userId: user!.userId });
        if (studentData) {
          const isEnrolled = course.enrolledStudents.some(
            (student: any) => student._id.toString() === studentData._id.toString()
          );
          if (!isEnrolled && !course.isActive) {
            set.status = 403;
            return ResponseHelper.forbidden('Bu dersi görme yetkiniz yok');
          }
        }
      }

      return ResponseHelper.success(course, 'Ders bilgileri');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        set.status = 400;
        return ResponseHelper.badRequest(error.errors[0]?.message || 'Geçersiz ID parametresi');
      }

      set.status = 500;
      return ResponseHelper.serverError('Ders bilgileri alınırken hata oluştu', error.message);
    }
  })
  // Yeni ders oluştur (öğretmen ve admin)
  .use(requireTeacherOrAdmin)
  .post('/', async ({ body, set, user }: any) => {
    try {
      const validatedData = createCourseSchema.parse(body);

      // Öğretmen sadece kendini atayabilir
      if (user!.role === UserRole.TEACHER) {
        const teacherData = await Teacher.findOne({ userId: user!.userId });
        if (!teacherData) {
          set.status = 404;
          return ResponseHelper.notFound('Öğretmen profili');
        }
        validatedData.teacherId = teacherData._id!.toString();
      }

      // Öğretmenin var olduğunu kontrol et
      const teacher = await Teacher.findById(validatedData.teacherId);
      if (!teacher) {
        set.status = 404;
        return ResponseHelper.notFound('Öğretmen');
      }

      // Ders kodu benzersiz mi kontrol et
      const existingCourse = await Course.findOne({ code: validatedData.code });
      if (existingCourse) {
        set.status = 409;
        return ResponseHelper.conflict('Bu ders kodu zaten kullanılmaktadır');
      }

      const course = new Course({
        ...validatedData,
        enrolledStudents: []
      });
      await course.save();

      const populatedCourse = await Course.findById(course._id)
        .populate('teacherId', 'userId department title specialization')
        .populate({
          path: 'teacherId',
          populate: {
            path: 'userId',
            select: 'firstName lastName'
          }
        });

      set.status = 201;
      return ResponseHelper.success(populatedCourse, 'Ders başarıyla oluşturuldu');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        set.status = 400;
        return ResponseHelper.badRequest(error.errors[0]?.message || 'Geçersiz veri');
      }

      if (error.code === 11000 && error.keyPattern?.code) {
        set.status = 409;
        return ResponseHelper.conflict('Bu ders kodu zaten kullanılmaktadır');
      }

      set.status = 500;
      return ResponseHelper.serverError('Ders oluşturulurken hata oluştu', error.message);
    }
  }, {
    detail: {
      tags: ['Courses'],
      summary: 'Yeni Ders Oluştur',
      description: 'Yeni bir ders oluşturur. Öğretmenler sadece kendilerini atayabilir.',
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'Matematik I' },
                code: { type: 'string', example: 'MAT101' },
                description: { type: 'string', example: 'Temel matematik dersi' },
                credits: { type: 'number', minimum: 1, maximum: 8, example: 4 },
                teacherId: { type: 'string', example: '507f1f77bcf86cd799439011' },
                department: { type: 'string', example: 'Matematik' },
                semester: { type: 'string', enum: ['Güz', 'Bahar', 'Yaz'], example: 'Güz' },
                academicYear: { type: 'string', example: '2024-2025' },
                schedule: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      day: { type: 'string', example: 'Pazartesi' },
                      startTime: { type: 'string', example: '09:00' },
                      endTime: { type: 'string', example: '10:30' },
                      classroom: { type: 'string', example: 'A101' }
                    }
                  }
                },
                maxCapacity: { type: 'number', minimum: 1, maximum: 200, example: 50 }
              },
              required: ['name', 'code', 'credits', 'teacherId', 'department', 'semester', 'academicYear', 'schedule', 'maxCapacity']
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Ders başarıyla oluşturuldu',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ApiResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/Course' }
                    }
                  }
                ]
              }
            }
          }
        },
        400: { description: 'Geçersiz veri' },
        401: { description: 'Kimlik doğrulama gerekli' },
        403: { description: 'Yetki yetersiz (öğretmen/admin gerekli)' },
        404: { description: 'Öğretmen bulunamadı' },
        409: { description: 'Ders kodu zaten kullanılmakta' }
      }
    }
  })
  // Ders bilgilerini güncelle
  .put('/:id', async ({ params, body, set, user }: any) => {
    try {
      const { id } = idParamSchema.parse(params);
      const validatedData = updateCourseSchema.parse(body);

      const course = await Course.findById(id);
      if (!course) {
        set.status = 404;
        return ResponseHelper.notFound('Ders');
      }

      // Öğretmen sadece kendi derslerini güncelleyebilir
      if (user!.role === UserRole.TEACHER) {
        const teacherData = await Teacher.findOne({ userId: user!.userId });
        if (teacherData && course.teacherId.toString() !== teacherData._id.toString()) {
          set.status = 403;
          return ResponseHelper.forbidden('Bu dersi güncelleme yetkiniz yok');
        }
        // Öğretmenler ders kodu ve öğretmen atamasını değiştiremez
        delete validatedData.code;
        delete validatedData.teacherId;
      }

      // Ders kodu güncelleniyorsa benzersizlik kontrolü
      if (validatedData.code) {
        const existingCourse = await Course.findOne({ 
          code: validatedData.code, 
          _id: { $ne: id } 
        });
        if (existingCourse) {
          set.status = 409;
          return ResponseHelper.conflict('Bu ders kodu zaten kullanılmaktadır');
        }
      }

      const updatedCourse = await Course.findByIdAndUpdate(
        id,
        { $set: validatedData },
        { new: true, runValidators: true }
      ).populate('teacherId', 'userId department title specialization')
       .populate({
         path: 'teacherId',
         populate: {
           path: 'userId',
           select: 'firstName lastName'
         }
       });

      return ResponseHelper.success(updatedCourse, 'Ders bilgileri güncellendi');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        set.status = 400;
        return ResponseHelper.badRequest(error.errors[0]?.message || 'Geçersiz veri');
      }

      if (error.code === 11000 && error.keyPattern?.code) {
        set.status = 409;
        return ResponseHelper.conflict('Bu ders kodu zaten kullanılmaktadır');
      }

      set.status = 500;
      return ResponseHelper.serverError('Ders güncellenirken hata oluştu', error.message);
    }
  })
  // Dersi sil (sadece admin)
  .use(requireAdmin)
  .delete('/:id', async ({ params, set }) => {
    try {
      const { id } = idParamSchema.parse(params);

      const course = await Course.findById(id);
      if (!course) {
        set.status = 404;
        return ResponseHelper.notFound('Ders');
      }

      // Kayıtlı öğrenci varsa silme
      if (course.enrolledStudents.length > 0) {
        set.status = 400;
        return ResponseHelper.badRequest('Bu derste kayıtlı öğrenciler bulunmaktadır. Önce tüm öğrencilerin kaydını silin.');
      }

      await Course.findByIdAndDelete(id);

      return ResponseHelper.success(null, 'Ders başarıyla silindi');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        set.status = 400;
        return ResponseHelper.badRequest(error.errors[0]?.message || 'Geçersiz ID parametresi');
      }

      set.status = 500;
      return ResponseHelper.serverError('Ders silinirken hata oluştu', error.message);
    }
  })
  // Derse öğrenci kaydet
  .post('/:id/enroll', async ({ params, body, set, user }: any) => {
    try {
      const { id } = idParamSchema.parse(params);
      const { studentId } = z.object({ 
        studentId: z.string().min(1, 'Öğrenci ID gerekli').optional() 
      }).parse(body);

      const course = await Course.findById(id);
      if (!course) {
        set.status = 404;
        return ResponseHelper.notFound('Ders');
      }

      if (!course.isActive) {
        set.status = 400;
        return ResponseHelper.badRequest('Pasif derslere kayıt olunamaz');
      }

      // Öğrenci kendi kaydını yapabilir, öğretmen/admin istediği öğrenciyi kaydedebilir
      let targetStudentId = studentId;
      if (user!.role === UserRole.STUDENT && !studentId) {
        const studentData = await Student.findOne({ userId: user!.userId });
        if (!studentData) {
          set.status = 404;
          return ResponseHelper.notFound('Öğrenci profili');
        }
        targetStudentId = studentData._id!.toString();
      }

      if (!targetStudentId) {
        set.status = 400;
        return ResponseHelper.badRequest('Öğrenci ID gerekli');
      }

      // Öğrencinin var olduğunu kontrol et
      const student = await Student.findById(targetStudentId);
      if (!student) {
        set.status = 404;
        return ResponseHelper.notFound('Öğrenci');
      }

      // Zaten kayıtlı mı kontrol et
      if (course.enrolledStudents.includes(targetStudentId)) {
        set.status = 409;
        return ResponseHelper.conflict('Öğrenci zaten bu derse kayıtlı');
      }

      // Kapasite kontrolü
      if (course.enrolledStudents.length >= course.maxCapacity) {
        set.status = 400;
        return ResponseHelper.badRequest('Ders kapasitesi dolu');
      }

      // Öğrenciyi derse ekle
      course.enrolledStudents.push(targetStudentId);
      await course.save();

      const updatedCourse = await Course.findById(id)
        .populate('enrolledStudents', 'userId studentNumber')
        .populate({
          path: 'enrolledStudents',
          populate: {
            path: 'userId',
            select: 'firstName lastName'
          }
        });

      return ResponseHelper.success(updatedCourse, 'Öğrenci başarıyla derse kaydedildi');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        set.status = 400;
        return ResponseHelper.badRequest(error.errors[0]?.message || 'Geçersiz veri');
      }

      set.status = 500;
      return ResponseHelper.serverError('Ders kaydı yapılırken hata oluştu', error.message);
    }
  }, {
    detail: {
      tags: ['Courses'],
      summary: 'Derse Öğrenci Kaydı',
      description: 'Bir öğrenciyi derse kaydeder. Öğrenciler kendilerini, öğretmenler/adminler istediği öğrenciyi kaydedebilir.',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'Ders ID',
          required: true,
          schema: { type: 'string' }
        }
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                studentId: { 
                  type: 'string', 
                  description: 'Öğrenci ID (öğrenci kendi kaydını yapıyorsa boş bırakılabilir)',
                  example: '507f1f77bcf86cd799439011' 
                }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Öğrenci başarıyla derse kaydedildi',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ApiResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/Course' }
                    }
                  }
                ]
              }
            }
          }
        },
        400: { description: 'Geçersiz veri veya ders kapasitesi dolu' },
        401: { description: 'Kimlik doğrulama gerekli' },
        404: { description: 'Ders veya öğrenci bulunamadı' },
        409: { description: 'Öğrenci zaten bu derse kayıtlı' }
      }
    }
  })
  // Dersten öğrenci kaydını sil
  .delete('/:id/enroll/:studentId', async ({ params, set, user }: any) => {
    try {
      const { id, studentId } = z.object({
        id: z.string().min(1),
        studentId: z.string().min(1)
      }).parse(params);

      const course = await Course.findById(id);
      if (!course) {
        set.status = 404;
        return ResponseHelper.notFound('Ders');
      }

      // Öğrenci kendi kaydını silebilir, öğretmen/admin istediği öğrenciyi silebilir
      if (user!.role === UserRole.STUDENT) {
        const studentData = await Student.findOne({ userId: user!.userId });
        if (!studentData || studentData._id!.toString() !== studentId) {
          set.status = 403;
          return ResponseHelper.forbidden('Bu öğrencinin kaydını silme yetkiniz yok');
        }
      }

      // Öğrenci kayıtlı mı kontrol et
      if (!course.enrolledStudents.includes(studentId)) {
        set.status = 404;
        return ResponseHelper.notFound('Öğrenci bu derse kayıtlı değil');
      }

      // Öğrenciyi dersten çıkar
      course.enrolledStudents = course.enrolledStudents.filter(
        (id: string) => id.toString() !== studentId
      );
      await course.save();

      return ResponseHelper.success(null, 'Öğrenci başarıyla dersten çıkarıldı');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        set.status = 400;
        return ResponseHelper.badRequest(error.errors[0]?.message || 'Geçersiz parametreler');
      }

      set.status = 500;
      return ResponseHelper.serverError('Ders kaydı silinirken hata oluştu', error.message);
    }
  }); 