import { Schema, model } from 'mongoose';
import { IStudent } from '@/types';

const studentSchema = new Schema<IStudent>({
  userId: {
    type: String,
    required: [true, 'Kullanıcı ID alanı zorunludur'],
    ref: 'User',

  },
  studentNumber: {
    type: String,
    required: [true, 'Öğrenci numarası zorunludur'],
   
    trim: true
  },
  classLevel: {
    type: String,
    required: [true, 'Sınıf seviyesi zorunludur'],
    trim: true
  },
  department: {
    type: String,
    required: [true, 'Bölüm alanı zorunludur'],
    trim: true
  },
  phoneNumber: {
    type: String,
    trim: true,
    match: [/^[0-9+\-\s()]+$/, 'Geçerli bir telefon numarası giriniz']
  },
  address: {
    type: String,
    trim: true,
    maxlength: [200, 'Adres en fazla 200 karakter olabilir']
  },
  enrollmentDate: {
    type: Date,
    required: [true, 'Kayıt tarihi zorunludur'],
    default: Date.now
  }
}, {
  timestamps: true
});

// İndeksler
studentSchema.index({ userId: 1 });
studentSchema.index({ studentNumber: 1 });
studentSchema.index({ department: 1 });

export const Student = model<IStudent>('Student', studentSchema); 