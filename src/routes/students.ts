import { Elysia,t } from 'elysia';
import { Student } from '@/models/Student';
import { User } from '@/models/User';
import { ResponseHelper } from '@/utils/responses';
import { createStudentSchema, updateStudentSchema, paginationSchema, idParamSchema } from '@/utils/validation';
import { requireAuth, requireTeacherOrAdmin, requireAdmin } from '@/middleware/auth';
import { UserRole } from '@/types';
import { z } from 'zod';

export const studentRoutes = new Elysia({ prefix: '/students' })
  .use(requireAuth)
  // Öğrenci listesi (öğretmen ve admin görebilir)
  .use(requireTeacherOrAdmin)
  .get('/', async ({ query, set, user }: any) => {
    try {
      const { page, limit } = paginationSchema.parse(query);
      const skip = (page - 1) * limit;

      // Öğretmenler sadece kendi bölümlerindeki öğrencileri görebilir
      let filter = {};
      if (user!.role === UserRole.TEACHER) {
        // Öğretmenin bölüm bilgisini al
        const Teacher = (await import('@/models/Teacher')).Teacher;
        const teacherData = await Teacher.findOne({ userId: user!.userId });
        if (teacherData) {
          filter = { department: teacherData.department };
        }
      }

      const [students, total] = await Promise.all([
        Student.find(filter)
          .populate('userId', 'firstName lastName email isActive')
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 }),
        Student.countDocuments(filter)
      ]);

      return ResponseHelper.successWithPagination(
        students,
        { page, limit, total },
        'Öğrenci listesi'
      );
    } catch (error: any) {
      if (error.name === 'ZodError') {
        set.status = 400;
        return ResponseHelper.badRequest(error.errors[0]?.message || 'Geçersiz sorgu parametreleri');
      }

      set.status = 500;
      return ResponseHelper.serverError('Öğrenci listesi alınırken hata oluştu', error.message);
    }
  }, {
    detail: {
      tags: ['Students'],
      summary: 'Öğrenci Listesi',
      description: 'Öğrencilerin listesini döner. Öğretmenler sadece kendi bölümlerindeki öğrencileri görebilir.',
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
          description: 'Sayfa başına öğrenci sayısı',
          required: false,
          schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 }
        }
      ],
      responses: {
        200: {
          description: 'Öğrenci listesi başarıyla alındı',
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
                        items: { $ref: '#/components/schemas/Student' }
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        400: { description: 'Geçersiz sorgu parametreleri' },
        401: { description: 'Kimlik doğrulama gerekli' },
        403: { description: 'Yetki yetersiz (öğretmen/admin gerekli)' }
      }
    }
  })
  // Belirli öğrenci bilgilerini getir
  .get('/:id', async ({ params, set, user }: any) => {
    try {
      const { id } = idParamSchema.parse(params);

      const student = await Student.findById(id)
        .populate('userId', 'firstName lastName email isActive createdAt updatedAt');

      if (!student) {
        set.status = 404;
        return ResponseHelper.notFound('Öğrenci');
      }

      // Öğrenci kendi bilgilerini görebilir, öğretmenler kendi bölümlerindeki öğrencileri, admin hepsini
      if (user!.role === UserRole.STUDENT && student.userId !== user!.userId) {
        set.status = 403;
        return ResponseHelper.forbidden('Bu öğrencinin bilgilerini görme yetkiniz yok');
      }

      if (user!.role === UserRole.TEACHER) {
        const Teacher = (await import('@/models/Teacher')).Teacher;
        const teacherData = await Teacher.findOne({ userId: user!.userId });
        if (teacherData && student.department !== teacherData.department) {
          set.status = 403;
          return ResponseHelper.forbidden('Bu öğrencinin bilgilerini görme yetkiniz yok');
        }
      }

      return ResponseHelper.success(student, 'Öğrenci bilgileri');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        set.status = 400;
        return ResponseHelper.badRequest(error.errors[0]?.message || 'Geçersiz ID parametresi');
      }

      set.status = 500;
      return ResponseHelper.serverError('Öğrenci bilgileri alınırken hata oluştu', error.message);
    }
  })
  // Yeni öğrenci oluştur (sadece admin)
  .use(requireAdmin)
  .post('/', async ({ body, set }) => {
    try {
      const validatedData = createStudentSchema.parse(body);

      // Kullanıcının var olduğunu ve öğrenci rolünde olduğunu kontrol et
      const user = await User.findById(validatedData.userId);
      if (!user) {
        set.status = 404;
        return ResponseHelper.notFound('Kullanıcı');
      }

      if (user.role !== UserRole.STUDENT) {
        set.status = 400;
        return ResponseHelper.badRequest('Kullanıcı öğrenci rolünde değil');
      }

      // Bu kullanıcı için zaten öğrenci kaydı var mı kontrol et
      const existingStudent = await Student.findOne({ userId: validatedData.userId });
      if (existingStudent) {
        set.status = 409;
        return ResponseHelper.conflict('Bu kullanıcı için zaten öğrenci kaydı mevcut');
      }

      // Öğrenci numarası benzersiz mi kontrol et
      const existingStudentNumber = await Student.findOne({ studentNumber: validatedData.studentNumber });
      if (existingStudentNumber) {
        set.status = 409;
        return ResponseHelper.conflict('Bu öğrenci numarası zaten kullanılmaktadır');
      }

      const student = new Student(validatedData);
      await student.save();

      const populatedStudent = await Student.findById(student._id)
        .populate('userId', 'firstName lastName email isActive');

      set.status = 201;
      return ResponseHelper.success(populatedStudent, 'Öğrenci başarıyla oluşturuldu');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        set.status = 400;
        return ResponseHelper.badRequest(error.errors[0]?.message || 'Geçersiz veri');
      }

      if (error.code === 11000) {
        if (error.keyPattern?.userId) {
          set.status = 409;
          return ResponseHelper.conflict('Bu kullanıcı için zaten öğrenci kaydı mevcut');
        }
        if (error.keyPattern?.studentNumber) {
          set.status = 409;
          return ResponseHelper.conflict('Bu öğrenci numarası zaten kullanılmaktadır');
        }
      }

      set.status = 500;
      return ResponseHelper.serverError('Öğrenci oluşturulurken hata oluştu', error.message);
    }
  }, {
    detail: {
      tags: ['Students'],
      summary: 'Yeni Öğrenci Oluştur',
      description: 'Mevcut bir kullanıcı için öğrenci profili oluşturur (sadece admin)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                userId: { type: 'string', example: '507f1f77bcf86cd799439011' },
                studentNumber: { type: 'string', example: '20240001' },
                classLevel: { type: 'string', example: '1. Sınıf' },
                department: { type: 'string', example: 'Bilgisayar Mühendisliği' },
                phoneNumber: { type: 'string', example: '+90 555 123 4567' },
                address: { type: 'string', example: 'İstanbul, Türkiye' },
                enrollmentDate: { type: 'string', format: 'date-time', example: '2024-01-15T00:00:00.000Z' }
              },
              required: ['userId', 'studentNumber', 'classLevel', 'department']
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Öğrenci başarıyla oluşturuldu',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ApiResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/Student' }
                    }
                  }
                ]
              }
            }
          }
        },
        400: { description: 'Geçersiz veri' },
        401: { description: 'Kimlik doğrulama gerekli' },
        403: { description: 'Yetki yetersiz (admin gerekli)' },
        404: { description: 'Kullanıcı bulunamadı' },
        409: { description: 'Öğrenci kaydı veya numara zaten mevcut' }
      }
    }
  })
  // Öğrenci bilgilerini güncelle
  .put('/:id', async ({ params, body, set, user }: any) => {
    try {
      const { id } = idParamSchema.parse(params);
      const validatedData = updateStudentSchema.parse(body);

      const student = await Student.findById(id);
      if (!student) {
        set.status = 404;
        return ResponseHelper.notFound('Öğrenci');
      }

      // Öğrenci kendi bilgilerini güncelleyebilir, admin hepsini
      if (user!.role === UserRole.STUDENT && student.userId !== user!.userId) {
        set.status = 403;
        return ResponseHelper.forbidden('Bu öğrencinin bilgilerini güncelleme yetkiniz yok');
      }

      // Öğrenci numarası güncelleniyorsa benzersizlik kontrolü
      if (validatedData.studentNumber) {
        const existingStudentNumber = await Student.findOne({ 
          studentNumber: validatedData.studentNumber, 
          _id: { $ne: id } 
        });
        if (existingStudentNumber) {
          set.status = 409;
          return ResponseHelper.conflict('Bu öğrenci numarası zaten kullanılmaktadır');
        }
      }

      const updatedStudent = await Student.findByIdAndUpdate(
        id,
        { $set: validatedData },
        { new: true, runValidators: true }
      ).populate('userId', 'firstName lastName email isActive');

      return ResponseHelper.success(updatedStudent, 'Öğrenci bilgileri güncellendi');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        set.status = 400;
        return ResponseHelper.badRequest(error.errors[0]?.message || 'Geçersiz veri');
      }

      if (error.code === 11000 && error.keyPattern?.studentNumber) {
        set.status = 409;
        return ResponseHelper.conflict('Bu öğrenci numarası zaten kullanılmaktadır');
      }

      set.status = 500;
      return ResponseHelper.serverError('Öğrenci güncellenirken hata oluştu', error.message);
    }
  })
  // Öğrenciyi sil (sadece admin)
  .use(requireAdmin)
  .delete('/:id', async ({ params, set }) => {
    try {
      const { id } = idParamSchema.parse(params);

      const student = await Student.findById(id);
      if (!student) {
        set.status = 404;
        return ResponseHelper.notFound('Öğrenci');
      }

      await Student.findByIdAndDelete(id);

      return ResponseHelper.success(null, 'Öğrenci başarıyla silindi');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        set.status = 400;
        return ResponseHelper.badRequest(error.errors[0]?.message || 'Geçersiz ID parametresi');
      }

      set.status = 500;
      return ResponseHelper.serverError('Öğrenci silinirken hata oluştu', error.message);
    }
  })
  // Bölüme göre öğrenci listesi
  .get('/by-department/:department', async ({ params, query, set, user }: any) => {
    try {
      const { department } = z.object({ department: z.string().min(1) }).parse(params);
      const { page, limit } = paginationSchema.parse(query);
      const skip = (page - 1) * limit;

      // Öğretmenler sadece kendi bölümlerini görebilir
      if (user!.role === UserRole.TEACHER) {
        const Teacher = (await import('@/models/Teacher')).Teacher;
        const teacherData = await Teacher.findOne({ userId: user!.userId });
        if (teacherData && teacherData.department !== department) {
          set.status = 403;
          return ResponseHelper.forbidden('Bu bölümün öğrencilerini görme yetkiniz yok');
        }
      }

      const [students, total] = await Promise.all([
        Student.find({ department })
          .populate('userId', 'firstName lastName email isActive')
          .skip(skip)
          .limit(limit)
          .sort({ studentNumber: 1 }),
        Student.countDocuments({ department })
      ]);

      return ResponseHelper.successWithPagination(
        students,
        { page, limit, total },
        `${department} bölümü öğrencileri`
      );
    } catch (error: any) {
      if (error.name === 'ZodError') {
        set.status = 400;
        return ResponseHelper.badRequest(error.errors[0]?.message || 'Geçersiz parametreler');
      }

      set.status = 500;
      return ResponseHelper.serverError('Bölüm öğrencileri alınırken hata oluştu', error.message);
    }
  }); 