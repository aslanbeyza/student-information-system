import { Schema, model } from 'mongoose';
import { ITeacher } from '@/types';

const teacherSchema = new Schema<ITeacher>({
  userId: {
    type: String,
    required: [true, 'Kullanıcı ID alanı zorunludur'],
    ref: 'User',
  },
  employeeNumber: {
    type: String,
    required: [true, 'Personel numarası zorunludur'],
    trim: true
  },
  department: {
    type: String,
    required: [true, 'Bölüm alanı zorunludur'],
    trim: true
  },
  title: {
    type: String,
    required: [true, 'Unvan alanı zorunludur'],
    trim: true,
    enum: [
      'Araştırma Görevlisi',
      'Öğretim Görevlisi',
      'Öğretim Üyesi',
      'Doçent',
      'Profesör'
    ]
  },
  specialization: {
    type: String,
    required: [true, 'Uzmanlık alanı zorunludur'],
    trim: true
  },
  phoneNumber: {
    type: String,
    trim: true,
    match: [/^[0-9+\-\s()]+$/, 'Geçerli bir telefon numarası giriniz']
  },
  officeLocation: {
    type: String,
    trim: true
  },
  hireDate: {
    type: Date,
    required: [true, 'İşe başlama tarihi zorunludur'],
    default: Date.now
  }
}, {
  timestamps: true
});

// İndeksler
teacherSchema.index({ userId: 1 });
teacherSchema.index({ employeeNumber: 1 });
teacherSchema.index({ department: 1 });

export const Teacher = model<ITeacher>('Teacher', teacherSchema); 