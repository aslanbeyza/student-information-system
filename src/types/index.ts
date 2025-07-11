export enum UserRole {
  STUDENT = 'student',
  TEACHER = 'teacher',
  ADMIN = 'admin'
}

export interface IUser {
  _id?: string;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IStudent {
  _id?: string;
  userId: string;
  studentNumber: string;
  classLevel: string;
  department: string;
  phoneNumber?: string;
  address?: string;
  enrollmentDate: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITeacher {
  _id?: string;
  userId: string;
  employeeNumber: string;
  department: string;
  title: string;
  specialization: string;
  phoneNumber?: string;
  officeLocation?: string;
  hireDate: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICourse {
  _id?: string;
  name: string;
  code: string;
  description: string;
  credits: number;
  teacherId: string;
  department: string;
  semester: string;
  academicYear: string;
  schedule: {
    day: string;
    startTime: string;
    endTime: string;
    classroom: string;
  }[];
  enrolledStudents: string[];
  maxCapacity: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IGrade {
  _id?: string;
  studentId: string;
  courseId: string;
  examType: 'midterm' | 'final' | 'quiz' | 'assignment';
  score: number;
  maxScore: number;
  examDate: Date;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAttendance {
  _id?: string;
  studentId: string;
  courseId: string;
  date: Date;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
} 