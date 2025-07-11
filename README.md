# Öğrenci Bilgi Sistemi Backend API

Bu proje, bir okulun öğrenci, öğretmen ve ders bilgilerini yönetmek için geliştirilmiş modern bir backend API'sidir. Elysia.js, TypeScript ve MongoDB kullanarak geliştirilmiştir.

## 🚀 Özellikler

- **Modern TypeScript**: Tip güvenli geliştirme
- **Elysia.js**: Hızlı ve hafif web framework
- **MongoDB**: NoSQL veritabanı
- **JWT Authentication**: Güvenli kimlik doğrulama
- **Role-based Authorization**: Rol tabanlı yetkilendirme
- **Zod Validation**: Veri doğrulama
- **Swagger Documentation**: Otomatik API dokümantasyonu
- **Modüler Yapı**: Kolay geliştirme ve bakım

## 📋 Gereksinimler

- **Bun** v1.0+ (Node.js v18+ alternatif olarak kullanılabilir)
- **MongoDB** v5.0+
- **TypeScript** v5.0+

## 🛠️ Kurulum

1. **Bağımlılıkları yükleyin:**
   ```bash
   bun install
   ```

2. **Environment dosyasını oluşturun:**
   ```bash
   cp .env.example .env
   # .env dosyasını kendi ayarlarınızla güncelleyin
   ```

3. **MongoDB'yi başlatın:**
   ```bash
   # MongoDB'nin kurulu ve çalışır durumda olduğundan emin olun
   mongod
   ```

4. **Geliştirme sunucusunu başlatın:**
   ```bash
   bun run dev
   ```

5. **Swagger dokümantasyonuna erişin:**
   ```
   http://localhost:3000/swagger
   ```

## 🏗️ Proje Yapısı

```
backend/
├── src/
│   ├── config/          # Veritabanı konfigürasyonu
│   ├── middleware/      # Authentication, validation middleware
│   ├── models/          # MongoDB Mongoose modelleri
│   ├── routes/          # API route'ları
│   ├── types/           # TypeScript tip tanımlamaları
│   ├── utils/           # Yardımcı fonksiyonlar
│   └── index.ts         # Ana server dosyası
├── package.json
├── tsconfig.json
└── README.md
```

## 📖 Swagger API Dokümantasyonu

Bu proje, tüm API endpoint'leri için otomatik olarak oluşturulan **Swagger/OpenAPI 3.0** dokümantasyonuna sahiptir.

### Dokümantasyon Erişimi

Sunucu çalıştırıldıktan sonra aşağıdaki URL'den interaktif API dokümantasyonuna erişebilirsiniz:

```
http://localhost:3000/swagger
```

### Swagger Özellikleri

- 🔍 **Interaktif API Explorer**: Tüm endpoint'leri tarayıcıdan test edin
- 🔐 **Authentication**: JWT token ile kimlik doğrulama desteği
- 📝 **Request/Response Örnekleri**: Her endpoint için detaylı örnekler
- 🏷️ **Kategorize Edilmiş Endpoint'ler**: Authentication, Users, Students, Teachers, Courses
- ✅ **Validation Schemas**: Request ve response şemaları
- 📋 **Error Codes**: Tüm hata kodları ve açıklamaları

### Swagger'da Kimlik Doğrulama

1. `/api/auth/login` endpoint'i ile giriş yapın
2. Dönen `token`'i kopyalayın
3. Swagger UI'da sağ üstteki **Authorize** butonuna tıklayın
4. `Bearer YOUR_TOKEN_HERE` formatında token'i girin
5. Artık tüm korumalı endpoint'leri test edebilirsiniz

## 🔐 Kullanıcı Rolleri

- **Admin**: Tüm işlemleri gerçekleştirebilir
- **Teacher**: Kendi derslerini yönetebilir, öğrenci bilgilerini görüntüleyebilir
- **Student**: Kendi bilgilerini yönetebilir, derslere kaydolabilir

## 📚 API Endpoints

### Authentication Endpoints

| Method | Endpoint | Açıklama | Rol |
|--------|----------|-----------|-----|
| POST | `/api/auth/register` | Yeni kullanıcı kaydı | Herkese açık |
| POST | `/api/auth/login` | Kullanıcı girişi | Herkese açık |
| POST | `/api/auth/logout` | Kullanıcı çıkışı | Authenticated |
| GET | `/api/auth/me` | Mevcut kullanıcı bilgileri | Authenticated |

### User Endpoints

| Method | Endpoint | Açıklama | Rol |
|--------|----------|-----------|-----|
| GET | `/api/users` | Tüm kullanıcıları listele | Admin |
| GET | `/api/users/:id` | Kullanıcı detayları | Owner/Admin |
| PUT | `/api/users/:id` | Kullanıcı güncelle | Owner/Admin |
| DELETE | `/api/users/:id` | Kullanıcı sil | Admin |

### Student Endpoints

| Method | Endpoint | Açıklama | Rol |
|--------|----------|-----------|-----|
| GET | `/api/students` | Öğrenci listesi | Teacher/Admin |
| GET | `/api/students/:id` | Öğrenci detayları | Owner/Teacher/Admin |
| POST | `/api/students` | Yeni öğrenci | Admin |
| PUT | `/api/students/:id` | Öğrenci güncelle | Owner/Admin |
| DELETE | `/api/students/:id` | Öğrenci sil | Admin |
| GET | `/api/students/by-department/:department` | Bölüm öğrencileri | Teacher/Admin |

### Teacher Endpoints

| Method | Endpoint | Açıklama | Rol |
|--------|----------|-----------|-----|
| GET | `/api/teachers` | Öğretmen listesi | Authenticated |
| GET | `/api/teachers/:id` | Öğretmen detayları | Authenticated |
| POST | `/api/teachers` | Yeni öğretmen | Admin |
| PUT | `/api/teachers/:id` | Öğretmen güncelle | Owner/Admin |
| DELETE | `/api/teachers/:id` | Öğretmen sil | Admin |
| GET | `/api/teachers/by-department/:department` | Bölüm öğretmenleri | Authenticated |
| GET | `/api/teachers/by-title/:title` | Unvan öğretmenleri | Authenticated |

### Course Endpoints

| Method | Endpoint | Açıklama | Rol |
|--------|----------|-----------|-----|
| GET | `/api/courses` | Ders listesi | Authenticated |
| GET | `/api/courses/:id` | Ders detayları | Enrolled/Teacher/Admin |
| POST | `/api/courses` | Yeni ders | Teacher/Admin |
| PUT | `/api/courses/:id` | Ders güncelle | Owner Teacher/Admin |
| DELETE | `/api/courses/:id` | Ders sil | Admin |
| POST | `/api/courses/:id/enroll` | Derse kaydol | Student/Teacher/Admin |
| DELETE | `/api/courses/:id/enroll/:studentId` | Dersten çıkar | Owner/Teacher/Admin |

## 🔧 Environment Variables

```env
# Database
MONGODB_URI=mongodb://localhost:27017/ogrenci_bilgi_sistemi

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# Server
PORT=3000
NODE_ENV=development

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

## 📝 Örnek Kullanım

### 1. Kullanıcı Kaydı
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@okul.edu.tr",
    "password": "123456",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin"
  }'
```

### 2. Giriş Yapma
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@okul.edu.tr",
    "password": "123456"
  }'
```

### 3. Ders Oluşturma
```bash
curl -X POST http://localhost:3000/api/courses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Matematik I",
    "code": "MAT101",
    "description": "Temel matematik dersi",
    "credits": 4,
    "teacherId": "TEACHER_ID",
    "department": "Matematik",
    "semester": "Güz",
    "academicYear": "2024-2025",
    "schedule": [
      {
        "day": "Pazartesi",
        "startTime": "09:00",
        "endTime": "10:30",
        "classroom": "A101"
      }
    ],
    "maxCapacity": 50
  }'
```

## 🧪 Test Etme

```bash
# Tip kontrolü
bun run type-check

# Geliştirme sunucusu
bun run dev

# Production build
bun run build

# Production sunucu
bun run start
```

## 🚀 Production Deployment

1. **Environment değişkenlerini ayarlayın**
2. **MongoDB bağlantı string'ini güncelleyin**
3. **JWT secret'ını güvenli bir değerle değiştirin**
4. **Build alın ve çalıştırın:**
   ```bash
   bun run build
   bun run start
   ```

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/AmazingFeature`)
3. Commit yapın (`git commit -m 'Add some AmazingFeature'`)
4. Push edin (`git push origin feature/AmazingFeature`)
5. Pull Request açın

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 🆘 Destek

Sorularınız için issue açabilir veya e-posta gönderebilirsiniz. # OBS
