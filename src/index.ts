import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { connectDatabase } from '@/config/database';
import { authRoutes } from '@/routes/auth';
import { userRoutes } from '@/routes/users';
import { studentRoutes } from '@/routes/students';
import { teacherRoutes } from '@/routes/teachers';
import { courseRoutes } from '@/routes/courses';
import { ResponseHelper } from '@/utils/responses';

const PORT = process.env.PORT || 7777;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5000', 'http://localhost:5173'];

// Veritabanı bağlantısını başlat
await connectDatabase();

const app = new Elysia()
  // CORS middleware
  .use(cors({
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }))
    // API Routes
    .group('/api', (app) => 
      app
        .use(authRoutes)
        .use(userRoutes)
        .use(studentRoutes)
        .use(teacherRoutes)
        .use(courseRoutes)
    )
    
  // Swagger documentation
  .use(swagger({
    documentation: {
      info: {
        title: 'Öğrenci Bilgi Sistemi API',
        version: '1.0.0',
        description: 'Öğrenci, öğretmen ve ders bilgilerini yönetmek için geliştirilmiş modern API. TypeScript, Elysia.js ve MongoDB kullanarak geliştirilmiştir.',
        contact: {
          name: 'API Support',
          email: 'support@ogrencibilgisistemi.edu.tr'
        }
      },
      servers: [
        {
          url: `http://localhost:${PORT}`,
          description: 'Development server'
        }
      ],
      tags: [
        { name: 'Authentication', description: 'Kimlik doğrulama işlemleri' },
        { name: 'Users', description: 'Kullanıcı yönetimi' },
        { name: 'Students', description: 'Öğrenci yönetimi' },
        { name: 'Teachers', description: 'Öğretmen yönetimi' },
        { name: 'Courses', description: 'Ders yönetimi' },
        { name: 'System', description: 'Sistem bilgileri' }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT token ile kimlik doğrulama'
          }
        },
        schemas: {
          ApiResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'object' },
              error: { type: 'string' },
              pagination: {
                type: 'object',
                properties: {
                  page: { type: 'number' },
                  limit: { type: 'number' },
                  total: { type: 'number' },
                  totalPages: { type: 'number' }
                }
              }
            }
          },
          User: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              email: { type: 'string', format: 'email' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              role: { type: 'string', enum: ['student', 'teacher', 'admin'] },
              isActive: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' }
            }
          },
          Student: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              userId: { type: 'string' },
              studentNumber: { type: 'string' },
              classLevel: { type: 'string' },
              department: { type: 'string' },
              phoneNumber: { type: 'string' },
              address: { type: 'string' },
              enrollmentDate: { type: 'string', format: 'date-time' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' }
            }
          },
          Teacher: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              userId: { type: 'string' },
              employeeNumber: { type: 'string' },
              department: { type: 'string' },
              title: { type: 'string', enum: ['Araştırma Görevlisi', 'Öğretim Görevlisi', 'Öğretim Üyesi', 'Doçent', 'Profesör'] },
              specialization: { type: 'string' },
              phoneNumber: { type: 'string' },
              officeLocation: { type: 'string' },
              hireDate: { type: 'string', format: 'date-time' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' }
            }
          },
          Course: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              name: { type: 'string' },
              code: { type: 'string' },
              description: { type: 'string' },
              credits: { type: 'number' },
              teacherId: { type: 'string' },
              department: { type: 'string' },
              semester: { type: 'string', enum: ['Güz', 'Bahar', 'Yaz'] },
              academicYear: { type: 'string' },
              schedule: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    day: { type: 'string' },
                    startTime: { type: 'string' },
                    endTime: { type: 'string' },
                    classroom: { type: 'string' }
                  }
                }
              },
              enrolledStudents: { type: 'array', items: { type: 'string' } },
              maxCapacity: { type: 'number' },
              isActive: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    }
  }))
  
  // Global error handler
  .onError(({ code, error, set, path }) => {
    console.error(`Global error on ${path}:`, error);
    
    switch (code) {
      case 'VALIDATION':
        set.status = 400;
        return ResponseHelper.badRequest('Doğrulama hatası');
      
      case 'NOT_FOUND':
        set.status = 404;
        return ResponseHelper.notFound(`${path} endpoint'i`);
      
      case 'PARSE':
        set.status = 400;
        return ResponseHelper.badRequest('JSON parse hatası');
      
      case 'INTERNAL_SERVER_ERROR':
      default:
        set.status = 500;
        const errorMessage =
          process.env.NODE_ENV === 'development'
            ? (typeof error === 'object' && error !== null && 'message' in error
                ? (error as any).message
                : String(error))
            : undefined;
        return ResponseHelper.serverError('Sunucu hatası', errorMessage);
    }
  })
  
  // Health check endpoint
  .get('/', () => ResponseHelper.success({
    message: 'Öğrenci Bilgi Sistemi API',
    version: '1.0.0',
    status: 'active',
    timestamp: new Date().toISOString()
  }, 'API aktif'), {
    detail: {
      tags: ['System'],
      summary: 'API Ana Sayfası',
      description: 'API\'nin çalışır durumda olduğunu kontrol eder'
    }
  })
  
  .get('/health', () => ResponseHelper.success({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  }, 'Sistem sağlıklı'), {
    detail: {
      tags: ['System'],
      summary: 'Sistem Sağlık Kontrolü',
      description: 'Sistemin sağlık durumunu ve çalışma süresini gösterir'
    }
  })
  

  
  // 404 handler - fallback route (en sona ekle)
  .all('*', ({ path, set }) => {
    set.status = 404;
    return ResponseHelper.notFound(`${path} endpoint'i`);
  })
  
  // Graceful shutdown handler
  .onStop(async () => {
    console.log('🛑 Server kapanıyor...');
    const { closeDatabaseConnection } = await import('@/config/database');
    await closeDatabaseConnection();
    console.log('✅ MongoDB bağlantısı kapatıldıdsgfs');
  });


  console.log(`🚀 Öğrenci Bilgi Sistemi API ${PORT} portunda çalışıyor`);
  console.log(`📖 Swagger Dokümantasyonu: http://localhost:${PORT}/swagger`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log(`📋 API Ana Sayfa: http://localhost:${PORT}`);


// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n📡 SIGINT sinyali alındı, sunucu kapatılıyor...');
  await app.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n📡 SIGTERM sinyali alındı, sunucu kapatılıyor...');
  await app.stop();
  process.exit(0);
});

export default app;