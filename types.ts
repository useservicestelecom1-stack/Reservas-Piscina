
export enum UserRole {
  ADMIN = 'ADMIN',
  PRINCIPAL = 'PRINCIPAL', // Responsable / Titular de cuenta
  DEPENDENT = 'DEPENDENT', // Dependiente (Hijo/Familiar)
  INDIVIDUAL = 'INDIVIDUAL' // Usuarios privados independientes
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  password?: string;
  email?: string;
  phone?: string;
  status?: string;
  photoUrl?: string;
  lastPaymentDate?: string;
}

export interface Booking {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  userPhotoUrl?: string;
  date: string;
  hour: number;
  headCount: number;
  status: 'CONFIRMED' | 'CANCELLED';
  laneNumbers?: string; 
  bookingCode?: string;
}

export interface AccessLog {
  id: string;
  bookingId: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  laps?: number;
}

export interface Suggestion {
  id: string;
  userId: string;
  userName: string;
  date: string;
  message: string;
  isRead: boolean;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  type: 'INFO' | 'WARNING' | 'ALERT';
}
