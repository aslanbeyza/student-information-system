import { Elysia,t } from 'elysia';
import { User } from '@/models/User';
import { ResponseHelper } from '@/utils/responses';
import { updateUserSchema, paginationSchema, idParamSchema } from '@/utils/validation';
import { requireAuth, requireAdmin } from '@/middleware/auth';
import { JWTPayload } from '@/types';

interface AuthContext {
  user: JWTPayload;
  set: any;
  params?: any;
  body?: any;
  query?: any;
}

export const userRoutes = new Elysia({ prefix: '/users' })
  .use(requireAuth)
  // Kullanıcı listesi (sadece admin)
  .use(requireAdmin)
  .get('/', async ({ query, set }) => {
    try {
      const { page, limit } = paginationSchema.parse(query);
      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        User.find()
          .select('-password')
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 }),
        User.countDocuments()
      ]);

      return ResponseHelper.successWithPagination(
        users,
        { page, limit, total },
        'Kullanıcı listesi'
      );
    } catch (error: any) {
      if (error.name === 'ZodError') {
        set.status = 400;
        return ResponseHelper.badRequest(error.errors[0]?.message || 'Geçersiz sorgu parametreleri');
      }

      set.status = 500;
      return ResponseHelper.serverError('Kullanıcı listesi alınırken hata oluştu', error.message);
    }
  })
  // Belirli kullanıcı bilgilerini getir
  .get('/:id', async ({ params, set, user }: { params: any; set: any; user: JWTPayload }) => {
    try {
      const { id } = idParamSchema.parse(params);

      // Kullanıcı sadece kendi bilgilerini görebilir veya admin olmalı
      if (user!.userId !== id && user!.role !== 'admin') {
        set.status = 403;
        return ResponseHelper.forbidden('Bu kullanıcının bilgilerini görme yetkiniz yok');
      }

      const userData = await User.findById(id).select('-password');
      if (!userData) {
        set.status = 404;
        return ResponseHelper.notFound('Kullanıcı');
      }

      return ResponseHelper.success(userData, 'Kullanıcı bilgileri');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        set.status = 400;
        return ResponseHelper.badRequest(error.errors[0]?.message || 'Geçersiz ID parametresi');
      }

      set.status = 500;
      return ResponseHelper.serverError('Kullanıcı bilgileri alınırken hata oluştu', error.message);
    }
  })
  // Kullanıcı bilgilerini güncelle
  .put('/:id', async ({ params, body, set, user }: { params: any; body: any; set: any; user: JWTPayload }) => {
    try {
      const { id } = idParamSchema.parse(params);
      const validatedData = updateUserSchema.parse(body);

      // Kullanıcı sadece kendi bilgilerini güncelleyebilir veya admin olmalı
      if (user!.userId !== id && user!.role !== 'admin') {
        set.status = 403;
        return ResponseHelper.forbidden('Bu kullanıcının bilgilerini güncelleme yetkiniz yok');
      }

      const userData = await User.findById(id);
      if (!userData) {
        set.status = 404;
        return ResponseHelper.notFound('Kullanıcı');
      }

      // Admin olmayan kullanıcılar isActive alanını değiştiremez
      if (user!.role !== 'admin' && validatedData.isActive !== undefined) {
        delete validatedData.isActive;
      }

      const updatedUser = await User.findByIdAndUpdate(
        id,
        { $set: validatedData },
        { new: true, runValidators: true }
      ).select('-password');

      return ResponseHelper.success(updatedUser, 'Kullanıcı bilgileri güncellendi');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        set.status = 400;
        return ResponseHelper.badRequest(error.errors[0]?.message || 'Geçersiz veri');
      }

      set.status = 500;
      return ResponseHelper.serverError('Kullanıcı güncellenirken hata oluştu', error.message);
    }
  })
  // Kullanıcıyı sil (sadece admin)
  .use(requireAdmin)
  .delete('/:id', async ({ params, set, user }: { params: any; set: any; user: JWTPayload }) => {
    try {
      const { id } = idParamSchema.parse(params);

      // Admin kendi hesabını silemez
      if (user!.userId === id) {
        set.status = 400;
        return ResponseHelper.badRequest('Kendi hesabınızı silemezsiniz');
      }

      const userData = await User.findById(id);
      if (!userData) {
        set.status = 404;
        return ResponseHelper.notFound('Kullanıcı');
      }

      await User.findByIdAndDelete(id);

      return ResponseHelper.success(null, 'Kullanıcı başarıyla silindi');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        set.status = 400;
        return ResponseHelper.badRequest(error.errors[0]?.message || 'Geçersiz ID parametresi');
      }

      set.status = 500;
      return ResponseHelper.serverError('Kullanıcı silinirken hata oluştu', error.message);
    }
  }); 