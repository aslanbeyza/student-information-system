import { z } from 'zod';
import { UserRole } from '@/types';

// Auth validations
export const registerSchema = z.object({
  email: z.string().email('Geçerli bir email adresi giriniz'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
  firstName: z.string().min(1, 'Ad alanı zorunludur').max(50, 'Ad en fazla 50 karakter olabilir'),
  lastName: z.string().min(1, 'Soyad alanı zorunludur').max(50, 'Soyad en fazla 50 karakter olabilir'),
  role: z.nativeEnum(UserRole)
});

export const loginSchema = z.object({
  email: z.string().email('Geçerli bir email adresi giriniz'),
  password: z.string().min(1, 'Şifre alanı zorunludur')
});

// User validations
export const updateUserSchema = z.object({
  firstName: z.string().min(1, 'Ad alanı zorunludur').max(50, 'Ad en fazla 50 karakter olabilir').optional(),
  lastName: z.string().min(1, 'Soyad alanı zorunludur').max(50, 'Soyad en fazla 50 karakter olabilir').optional(),
  isActive: z.boolean().optional()
});

// Student validations
export const createStudentSchema = z.object({
  userId: z.string().min(1, 'Kullanıcı ID zorunludur'),
  studentNumber: z.string().min(1, 'Öğrenci numarası zorunludur'),
  classLevel: z.string().min(1, 'Sınıf seviyesi zorunludur'),
  department: z.string().min(1, 'Bölüm alanı zorunludur'),
  phoneNumber: z.string().regex(/^[0-9+\-\s()]+$/, 'Geçerli bir telefon numarası giriniz').optional(),
  address: z.string().max(200, 'Adres en fazla 200 karakter olabilir').optional(),
  enrollmentDate: z.string().datetime().optional()
});

export const updateStudentSchema = createStudentSchema.partial().omit({ userId: true });

// Teacher validations
export const createTeacherSchema = z.object({
  userId: z.string().min(1, 'Kullanıcı ID zorunludur'),
  employeeNumber: z.string().min(1, 'Personel numarası zorunludur'),
  department: z.string().min(1, 'Bölüm alanı zorunludur'),
  title: z.enum(['Araştırma Görevlisi', 'Öğretim Görevlisi', 'Öğretim Üyesi', 'Doçent', 'Profesör']),
  specialization: z.string().min(1, 'Uzmanlık alanı zorunludur'),
  phoneNumber: z.string().regex(/^[0-9+\-\s()]+$/, 'Geçerli bir telefon numarası giriniz').optional(),
  officeLocation: z.string().optional(),
  hireDate: z.string().datetime().optional()
});

export const updateTeacherSchema = createTeacherSchema.partial().omit({ userId: true });

// Course validations
export const scheduleSchema = z.object({
  day: z.enum(['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Geçerli bir saat formatı giriniz (HH:MM)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Geçerli bir saat formatı giriniz (HH:MM)'),
  classroom: z.string().min(1, 'Sınıf alanı zorunludur')
});

export const createCourseSchema = z.object({
  name: z.string().min(1, 'Ders adı zorunludur').max(100, 'Ders adı en fazla 100 karakter olabilir'),
  code: z.string().regex(/^[A-Z]{2,4}[0-9]{3}$/, 'Geçerli bir ders kodu giriniz (örn: MAT101)'),
  description: z.string().max(500, 'Açıklama en fazla 500 karakter olabilir').optional(),
  credits: z.number().min(1, 'Kredi sayısı en az 1 olmalıdır').max(8, 'Kredi sayısı en fazla 8 olabilir'),
  teacherId: z.string().min(1, 'Öğretmen ID zorunludur'),
  department: z.string().min(1, 'Bölüm alanı zorunludur'),
  semester: z.enum(['Güz', 'Bahar', 'Yaz']),
  academicYear: z.string().regex(/^\d{4}-\d{4}$/, 'Akademik yıl formatı: YYYY-YYYY (örn: 2023-2024)'),
  schedule: z.array(scheduleSchema),
  maxCapacity: z.number().min(1, 'Maksimum kapasite en az 1 olmalıdır').max(200, 'Maksimum kapasite en fazla 200 olabilir'),
  isActive: z.boolean().optional()
});

export const updateCourseSchema = createCourseSchema.partial();

// Query validations
export const paginationSchema = z.object({
  page: z.string().transform(val => parseInt(val) || 1),
  limit: z.string().transform(val => Math.min(parseInt(val) || 10, 50))
});

export const idParamSchema = z.object({
  id: z.string().min(1, 'ID parametresi gerekli')
}); 