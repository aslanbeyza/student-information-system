import { Elysia,t } from 'elysia';
import { Teacher } from '@/models/Teacher';
import { User } from '@/models/User';
import { ResponseHelper } from '@/utils/responses';
import { createTeacherSchema, updateTeacherSchema, paginationSchema, idParamSchema } from '@/utils/validation';
import { requireAuth, requireAdmin } from '@/middleware/auth';
import { UserRole } from '@/types';
import { z } from 'zod';

export const teacherRoutes = new Elysia({ prefix: '/teachers' })
  .use(requireAuth)
  // Öğretmen listesi (herkese açık - öğrenciler ders arama için gerekli)
  .get('/', async ({ query, set }) => {
    try {
      const { page, limit } = paginationSchema.parse(query);
      const skip = (page - 1) * limit;

      const [teachers, total] = await Promise.all([
        Teacher.find()
          .populate('userId', 'firstName lastName email isActive')
          .skip(skip)
          .limit(limit)
          .sort({ department: 1, title: -1 }),
        Teacher.countDocuments()
      ]);

      return ResponseHelper.successWithPagination(
        teachers,
        { page, limit, total },
        'Öğretmen listesi'
      );
    } catch (error: any) {
      if (error.name === 'ZodError') {
        set.status = 400;
        return ResponseHelper.badRequest(error.errors[0]?.message || 'Geçersiz sorgu parametreleri');
      }

      set.status = 500;
      return ResponseHelper.serverError('Öğretmen listesi alınırken hata oluştu', error.message);
    }
  })
  // Belirli öğretmen bilgilerini getir
  .get('/:id', async ({ params, set, request }) => {
    try {
      // user bilgisini request'ten al
      const user = (request as any).user;
      const { id } = idParamSchema.parse(params);

      const teacher = await Teacher.findById(id)
        .populate('userId', 'firstName lastName email isActive createdAt updatedAt');

      if (!teacher) {
        set.status = 404;
        return ResponseHelper.notFound('Öğretmen');
      }

      // Öğretmen kendi bilgilerini görebilir, admin hepsini
      // Öğrenciler sadece temel bilgileri görebilir
      let teacherData: any = teacher.toObject();
      
      if (user!.role === UserRole.TEACHER && teacher.userId !== user!.userId) {
        // Başka öğretmenin detay bilgilerini gizle
        const { phoneNumber, officeLocation, employeeNumber, ...filteredData } = teacherData;
        teacherData = filteredData as any;
      } else if (user!.role === UserRole.STUDENT) {
        // Öğrenciler sadece genel bilgileri görebilir
        const { phoneNumber, officeLocation, employeeNumber, hireDate, ...filteredData } = teacherData;
        teacherData = filteredData as any;
      }

      return ResponseHelper.success(teacherData, 'Öğretmen bilgileri');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        set.status = 400;
        return ResponseHelper.badRequest(error.errors[0]?.message || 'Geçersiz ID parametresi');
      }

      set.status = 500;
      return ResponseHelper.serverError('Öğretmen bilgileri alınırken hata oluştu', error.message);
    }
  })
  // Yeni öğretmen oluştur (sadece admin)
  .use(requireAdmin)
  .post('/', async ({ body, set }) => {
    try {
      const validatedData = createTeacherSchema.parse(body);

      // Kullanıcının var olduğunu ve öğretmen rolünde olduğunu kontrol et
      const user = await User.findById(validatedData.userId);
      if (!user) {
        set.status = 404;
        return ResponseHelper.notFound('Kullanıcı');
      }

      if (user.role !== UserRole.TEACHER) {
        set.status = 400;
        return ResponseHelper.badRequest('Kullanıcı öğretmen rolünde değil');
      }

      // Bu kullanıcı için zaten öğretmen kaydı var mı kontrol et
      const existingTeacher = await Teacher.findOne({ userId: validatedData.userId });
      if (existingTeacher) {
        set.status = 409;
        return ResponseHelper.conflict('Bu kullanıcı için zaten öğretmen kaydı mevcut');
      }

      // Personel numarası benzersiz mi kontrol et
      const existingEmployeeNumber = await Teacher.findOne({ employeeNumber: validatedData.employeeNumber });
      if (existingEmployeeNumber) {
        set.status = 409;
        return ResponseHelper.conflict('Bu personel numarası zaten kullanılmaktadır');
      }

      const teacher = new Teacher(validatedData);
      await teacher.save();

      const populatedTeacher = await Teacher.findById(teacher._id)
        .populate('userId', 'firstName lastName email isActive');

      set.status = 201;
      return ResponseHelper.success(populatedTeacher, 'Öğretmen başarıyla oluşturuldu');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        set.status = 400;
        return ResponseHelper.badRequest(error.errors[0]?.message || 'Geçersiz veri');
      }

      if (error.code === 11000) {
        if (error.keyPattern?.userId) {
          set.status = 409;
          return ResponseHelper.conflict('Bu kullanıcı için zaten öğretmen kaydı mevcut');
        }
        if (error.keyPattern?.employeeNumber) {
          set.status = 409;
          return ResponseHelper.conflict('Bu personel numarası zaten kullanılmaktadır');
        }
      }

      set.status = 500;
      return ResponseHelper.serverError('Öğretmen oluşturulurken hata oluştu', error.message);
    }
  })
  // Öğretmen bilgilerini güncelle
  .put('/:id', async ({ params, body, set, user }: any) => {
    try {
      const { id } = idParamSchema.parse(params);
      const validatedData = updateTeacherSchema.parse(body);

      const teacher = await Teacher.findById(id);
      if (!teacher) {
        set.status = 404;
        return ResponseHelper.notFound('Öğretmen');
      }

      // Öğretmen kendi bilgilerini güncelleyebilir, admin hepsini
      if (user!.role === UserRole.TEACHER && teacher.userId !== user!.userId) {
        set.status = 403;
        return ResponseHelper.forbidden('Bu öğretmenin bilgilerini güncelleme yetkiniz yok');
      }

      // Öğretmenler kendi unvan ve bölüm bilgilerini değiştiremez (sadece admin)
      if (user!.role === UserRole.TEACHER) {
        delete validatedData.title;
        delete validatedData.department;
        delete validatedData.employeeNumber;
        delete validatedData.hireDate;
      }

      // Personel numarası güncelleniyorsa benzersizlik kontrolü
      if (validatedData.employeeNumber) {
        const existingEmployeeNumber = await Teacher.findOne({ 
          employeeNumber: validatedData.employeeNumber, 
          _id: { $ne: id } 
        });
        if (existingEmployeeNumber) {
          set.status = 409;
          return ResponseHelper.conflict('Bu personel numarası zaten kullanılmaktadır');
        }
      }

      const updatedTeacher = await Teacher.findByIdAndUpdate(
        id,
        { $set: validatedData },
        { new: true, runValidators: true }
      ).populate('userId', 'firstName lastName email isActive');

      return ResponseHelper.success(updatedTeacher, 'Öğretmen bilgileri güncellendi');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        set.status = 400;
        return ResponseHelper.badRequest(error.errors[0]?.message || 'Geçersiz veri');
      }

      if (error.code === 11000 && error.keyPattern?.employeeNumber) {
        set.status = 409;
        return ResponseHelper.conflict('Bu personel numarası zaten kullanılmaktadır');
      }

      set.status = 500;
      return ResponseHelper.serverError('Öğretmen güncellenirken hata oluştu', error.message);
    }
  })
  // Öğretmeni sil (sadece admin)
  .delete('/:id', async ({ params, set }) => {
    try {
      const { id } = idParamSchema.parse(params);

      const teacher = await Teacher.findById(id);
      if (!teacher) {
        set.status = 404;
        return ResponseHelper.notFound('Öğretmen');
      }

      // Öğretmenin aktif dersleri var mı kontrol et
      const Course = (await import('@/models/Course')).Course;
      const activeCourses = await Course.countDocuments({ 
        teacherId: teacher._id, 
        isActive: true 
      });

      if (activeCourses > 0) {
        set.status = 400;
        return ResponseHelper.badRequest('Bu öğretmenin aktif dersleri bulunmaktadır. Önce dersleri başka bir öğretmene atayın veya pasif hale getirin.');
      }

      await Teacher.findByIdAndDelete(id);

      return ResponseHelper.success(null, 'Öğretmen başarıyla silindi');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        set.status = 400;
        return ResponseHelper.badRequest(error.errors[0]?.message || 'Geçersiz ID parametresi');
      }

      set.status = 500;
      return ResponseHelper.serverError('Öğretmen silinirken hata oluştu', error.message);
    }
  })
  // Bölüme göre öğretmen listesi
  .get('/by-department/:department', async ({ params, query, set }) => {
    try {
      const { department } = z.object({ department: z.string().min(1) }).parse(params);
      const { page, limit } = paginationSchema.parse(query);
      const skip = (page - 1) * limit;

      const [teachers, total] = await Promise.all([
        Teacher.find({ department })
          .populate('userId', 'firstName lastName email isActive')
          .skip(skip)
          .limit(limit)
          .sort({ title: -1, employeeNumber: 1 }),
        Teacher.countDocuments({ department })
      ]);

      return ResponseHelper.successWithPagination(
        teachers,
        { page, limit, total },
        `${department} bölümü öğretmenleri`
      );
    } catch (error: any) {
      if (error.name === 'ZodError') {
        set.status = 400;
        return ResponseHelper.badRequest(error.errors[0]?.message || 'Geçersiz parametreler');
      }

      set.status = 500;
      return ResponseHelper.serverError('Bölüm öğretmenleri alınırken hata oluştu', error.message);
    }
  })
  // Unvana göre öğretmen listesi
  .get('/by-title/:title', async ({ params, query, set }) => {
    try {
      const { title } = z.object({ 
        title: z.enum(['Araştırma Görevlisi', 'Öğretim Görevlisi', 'Öğretim Üyesi', 'Doçent', 'Profesör']) 
      }).parse(params);
      const { page, limit } = paginationSchema.parse(query);
      const skip = (page - 1) * limit;

      const [teachers, total] = await Promise.all([
        Teacher.find({ title })
          .populate('userId', 'firstName lastName email isActive')
          .skip(skip)
          .limit(limit)
          .sort({ department: 1, employeeNumber: 1 }),
        Teacher.countDocuments({ title })
      ]);

      return ResponseHelper.successWithPagination(
        teachers,
        { page, limit, total },
        `${title} unvanlı öğretmenler`
      );
    } catch (error: any) {
      if (error.name === 'ZodError') {
        set.status = 400;
        return ResponseHelper.badRequest(error.errors[0]?.message || 'Geçersiz parametreler');
      }

      set.status = 500;
      return ResponseHelper.serverError('Unvan bazlı öğretmen listesi alınırken hata oluştu', error.message);
    }
  }); 