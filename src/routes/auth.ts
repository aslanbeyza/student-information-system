import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { User } from '@/models/User';
import { ResponseHelper } from '@/utils/responses';
import { registerSchema, loginSchema } from '@/utils/validation';
import { requireAuth } from '@/middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'beyzoş';

export const authRoutes = new Elysia({ prefix: '/auth' })
  .use(
    jwt({
      name: 'jwt',
      secret: JWT_SECRET,
      exp: process.env.JWT_EXPIRES_IN || '7d'
    })
  )
  .post('/register', async ({ body, set, jwt }) => {
    try {
      const validatedData = registerSchema.parse(body);

      // Email kontrolü
      const existingUser = await User.findOne({ email: validatedData.email });
      if (existingUser) {
        set.status = 409;
        return ResponseHelper.conflict('Bu email adresi zaten kullanılmaktadır');
      }

      // Yeni kullanıcı oluştur
      const user = new User(validatedData);
      await user.save();

      // JWT token oluştur
      const token = await jwt.sign({
        userId: user._id!.toString(),
        email: user.email,
        role: user.role
      });

      set.status = 201;
      return ResponseHelper.success(
        {
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isActive: user.isActive
          },
          token
        },
        'Kullanıcı başarıyla oluşturuldu'
      );
    } catch (error: any) {
      if (error.name === 'ZodError') {
        set.status = 400;
        return ResponseHelper.badRequest(error.errors[0]?.message || 'Geçersiz veri');
      }

      if (error.code === 11000) {
        set.status = 409;
        return ResponseHelper.conflict('Bu email adresi zaten kullanılmaktadır');
      }

      set.status = 500;
      return ResponseHelper.serverError('Kullanıcı oluşturulurken hata oluştu', error.message);
    }
  }, {
    detail: {
      tags: ['Authentication'],
      summary: 'Kullanıcı Kaydı',
      description: 'Yeni bir kullanıcı hesabı oluşturur ve JWT token döner',
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                email: { type: 'string', format: 'email', example: 'admin@okul.edu.tr' },
                password: { type: 'string', minLength: 6, example: '123456' },
                firstName: { type: 'string', example: 'Ahmet' },
                lastName: { type: 'string', example: 'Yılmaz' },
                role: { type: 'string', enum: ['student', 'teacher', 'admin'], example: 'student' }
              },
              required: ['email', 'password', 'firstName', 'lastName', 'role']
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Kullanıcı başarıyla oluşturuldu',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ApiResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'object',
                        properties: {
                          user: { $ref: '#/components/schemas/User' },
                          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        400: { description: 'Geçersiz veri' },
        409: { description: 'Email adresi zaten kullanılmakta' }
      }
    }
  })
  .post('/login', async ({ body, set, jwt }) => {
    try {
      const validatedData = loginSchema.parse(body);

      // Kullanıcıyı bul
      const user = await User.findOne({ email: validatedData.email });
      if (!user) {
        set.status = 401;
        return ResponseHelper.unauthorized('Email veya şifre hatalı');
      }

      // Kullanıcı aktif mi kontrol et
      if (!user.isActive) {
        set.status = 401;
        return ResponseHelper.unauthorized('Hesabınız devre dışı bırakılmıştır');
      }

      // Şifre kontrolü
      const isPasswordValid = await User.schema.methods.comparePassword.call(user, validatedData.password);
      if (!isPasswordValid) {
        set.status = 401;
        return ResponseHelper.unauthorized('Email veya şifre hatalı');
      }

      // JWT token oluştur
      const token = await jwt.sign({
        userId: user._id!.toString(),
        email: user.email,
        role: user.role
      });

      return ResponseHelper.success(
        {
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isActive: user.isActive
          },
          token
        },
        'Giriş başarılı'
      );
    } catch (error: any) {
      if (error.name === 'ZodError') {
        set.status = 400;
        return ResponseHelper.badRequest(error.errors[0]?.message || 'Geçersiz veri');
      }

      set.status = 500;
      return ResponseHelper.serverError('Giriş yapılırken hata oluştu', error.message);
    }
  }, {
    detail: {
      tags: ['Authentication'],
      summary: 'Kullanıcı Girişi',
      description: 'Email ve şifre ile giriş yapar, JWT token döner',
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                email: { type: 'string', format: 'email', example: 'admin@okul.edu.tr' },
                password: { type: 'string', example: '123456' }
              },
              required: ['email', 'password']
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Giriş başarılı',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ApiResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'object',
                        properties: {
                          user: { $ref: '#/components/schemas/User' },
                          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        400: { description: 'Geçersiz veri' },
        401: { description: 'Email veya şifre hatalı' }
      }
    }
  })
  .use(requireAuth)
  .post('/logout', ({ set }) => {
    // JWT ile logout, client tarafında token'ı silmek yeterli
    return ResponseHelper.success(null, 'Çıkış başarılı');
  }, {
    detail: {
      tags: ['Authentication'],
      summary: 'Kullanıcı Çıkışı',
      description: 'Kullanıcının oturumunu kapatır (JWT token client tarafında silinir)',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Çıkış başarılı',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiResponse' }
            }
          }
        },
        401: { description: 'Kimlik doğrulama gerekli' }
      }
    }
  })
  .use(requireAuth)
  .get('/me', async ({ user, set }: any) => {
    try {
      if (!user) {
        set.status = 401;
        console.log(user);
        return ResponseHelper.unauthorized('Kimlik doğrulama gerekli');
      }
      
      const userData = await User.findById(user.userId);
      if (!userData) {
        set.status = 404;
        return ResponseHelper.notFound('Kullanıcı');
      }

      return ResponseHelper.success({
        id: userData._id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        isActive: userData.isActive,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt
      }, 'Kullanıcı bilgileri');
    } catch (error: any) {
      set.status = 500;
      return ResponseHelper.serverError('Kullanıcı bilgileri alınırken hata oluştu', error.message);
    }
  }, {
    detail: {
      tags: ['Authentication'],
      summary: 'Mevcut Kullanıcı Bilgileri',
      description: 'JWT token ile kimlik doğrulaması yapılmış kullanıcının bilgilerini döner',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Kullanıcı bilgileri',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ApiResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/User' }
                    }
                  }
                ]
              }
            }
          }
        },
        401: { description: 'Kimlik doğrulama gerekli' },
        404: { description: 'Kullanıcı bulunamadı' }
      }
    }
  }); 