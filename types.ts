
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
  password?: string; // In a real app, hashed.
  email?: string;
  phone?: string;
  status?: string; // Added to match DB 'status' column
  photoUrl?: string; // URL de foto de perfil (Google/Facebook)
  lastPaymentDate?: string; // YYYY-MM-DD Fecha del último pago registrado
}

export interface Booking {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  date: string; // YYYY-MM-DD
  hour: number; // 0-23
  headCount: number; // Number of people in this group
  status: 'CONFIRMED' | 'CANCELLED';
}

export interface AccessLog {
  id: string;
  bookingId: string;
  checkInTime: string | null; // ISO Timestamp
  checkOutTime: string | null; // ISO Timestamp
  laps?: number; // Cantidad de piscinas nadadas en la sesión
}

export interface Suggestion {
  id: string;
  userId: string;
  userName: string;
  date: string; // ISO Timestamp
  message: string;
  isRead: boolean;
}

export interface DailyStats {
  date: string;
  totalVisitors: number;
  peakHour: number;
  peakCount: number;
}

export interface AppNotification {
  id: string;
  userId: string; // The recipient ID
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  type: 'INFO' | 'WARNING' | 'ALERT';
}
