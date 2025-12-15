export enum UserRole {
  ADMIN = 'ADMIN',
  CLUB = 'CLUB',      // Clubes que imparten clases
  SCHOOL = 'SCHOOL',  // Colegios
  INDIVIDUAL = 'INDIVIDUAL' // Usuarios privados
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