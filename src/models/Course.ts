import { Schema, model } from 'mongoose';
import { ICourse } from '@/types';

const scheduleSchema = new Schema({
  day: {
    type: String,
    required: true,
    enum: ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
  },
  startTime: {
    type: String,
    required: true,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Geçerli bir saat formatı giriniz (HH:MM)']
  },
  endTime: {
    type: String,
    required: true,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Geçerli bir saat formatı giriniz (HH:MM)']
  },
  classroom: {
    type: String,
    required: true,
    trim: true
  }
}, { _id: false });

const courseSchema = new Schema<ICourse>({
  name: {
    type: String,
    required: [true, 'Ders adı zorunludur'],
    trim: true,
    maxlength: [100, 'Ders adı en fazla 100 karakter olabilir']
  },
  code: {
    type: String,
    required: [true, 'Ders kodu zorunludur'],
   
    trim: true,
    uppercase: true,
    match: [/^[A-Z]{2,4}[0-9]{3}$/, 'Geçerli bir ders kodu giriniz (örn: MAT101)']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Açıklama en fazla 500 karakter olabilir']
  },
  credits: {
    type: Number,
    required: [true, 'Kredi sayısı zorunludur'],
    min: [1, 'Kredi sayısı en az 1 olmalıdır'],
    max: [8, 'Kredi sayısı en fazla 8 olabilir']
  },
  teacherId: {
    type: String,
    required: [true, 'Öğretmen ID alanı zorunludur'],
    ref: 'Teacher'
  },
  department: {
    type: String,
    required: [true, 'Bölüm alanı zorunludur'],
    trim: true
  },
  semester: {
    type: String,
    required: [true, 'Dönem alanı zorunludur'],
    enum: ['Güz', 'Bahar', 'Yaz']
  },
  academicYear: {
    type: String,
    required: [true, 'Akademik yıl zorunludur'],
    match: [/^\d{4}-\d{4}$/, 'Akademik yıl formatı: YYYY-YYYY (örn: 2023-2024)']
  },
  schedule: [scheduleSchema],
  enrolledStudents: [{
    type: String,
    ref: 'Student'
  }],
  maxCapacity: {
    type: Number,
    required: [true, 'Maksimum kapasite zorunludur'],
    min: [1, 'Maksimum kapasite en az 1 olmalıdır'],
    max: [200, 'Maksimum kapasite en fazla 200 olabilir']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// İndeksler
courseSchema.index({ code: 1 });
courseSchema.index({ teacherId: 1 });
courseSchema.index({ department: 1 });
courseSchema.index({ semester: 1, academicYear: 1 });

export const Course = model<ICourse>('Course', courseSchema); 