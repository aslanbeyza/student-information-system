import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { bearer } from '@elysiajs/bearer';
import { JWTPayload, UserRole } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'beyzoş';

export const authPlugin = new Elysia()
  .use(
    jwt({
      name: 'jwt',
      secret: JWT_SECRET,
      exp: process.env.JWT_EXPIRES_IN || '7d'
    })
  )
  .use(bearer())
  .derive(async ({ jwt, bearer, set }) => {
    console.log('🔍 Auth middleware - Bearer token:', bearer ? 'Present' : 'Missing');
    
    if (!bearer) {
      console.log('❌ No bearer token found');
      set.status = 401;
      return {
        user: null,
        error: 'Token bulunamadı'
      };
    }

    try {
      console.log('🔑 Attempting to verify token...');
      const payload = await jwt.verify(bearer);
      console.log('✅ Token verification result:', payload);
      
      if (!payload || typeof payload === 'boolean') {
        console.log('❌ Invalid payload:', payload);
        set.status = 401;
        return {
          user: null,
          error: 'Geçersiz token'
        };
      }

      console.log('✅ Authentication successful, user:', payload);
      return {
        user: payload as unknown as JWTPayload,
        error: null
      };
    } catch (error) {
      console.error('❌ JWT verification error:', error);
      set.status = 401;
      return {
        user: null,
        error: 'Token doğrulama hatası'
      };
    }
  });

// Role-based authorization guards
export const requireAuth = (app: Elysia) => 
  app.use(authPlugin).guard({
    beforeHandle: ({ user, set }: any) => {
      if (!user) {
        set.status = 401;
        return {
          success: false,
          message: 'Kimlik doğrulama gerekli'
        };
      }
    }
  });

export const requireRole = (allowedRoles: UserRole[]) => (app: Elysia) =>
  app.use(requireAuth).guard({
    beforeHandle: ({ user, set }: any) => {
      if (!user || !allowedRoles.includes(user.role)) {
        set.status = 403;
        return {
          success: false,
          message: 'Bu işlem için yetkiniz bulunmamaktadır'
        };
      }
    }
  });

export const requireStudent = (app: Elysia) => 
  requireRole([UserRole.STUDENT])(app);

export const requireTeacher = (app: Elysia) => 
  requireRole([UserRole.TEACHER])(app);

export const requireAdmin = (app: Elysia) => 
  requireRole([UserRole.ADMIN])(app);

export const requireTeacherOrAdmin = (app: Elysia) => 
  requireRole([UserRole.TEACHER, UserRole.ADMIN])(app);

export const requireStudentOrTeacher = (app: Elysia) => 
  requireRole([UserRole.STUDENT, UserRole.TEACHER])(app); 