import { UserRole } from './types';

export const POOL_CONFIG = {
  OPEN_HOUR: 5, // 5:00 AM
  CLOSE_HOUR_WEEKDAY: 20, // 8:00 PM (20:00)
  CLOSE_HOUR_SATURDAY: 14, // 2:00 PM (14:00)
  MAX_CAPACITY_PER_HOUR: 50, // Max people allowed in the water per hour
};

// Dias de la semana para validación (0 = Domingo, 1 = Lunes, ...)
// Martes (2) a Viernes (5), y Sábado (6)
export const ALLOWED_DAYS = [2, 3, 4, 5, 6]; 

// Configuración de Tablas Externas (Supabase)
export const EXTERNAL_DB_CONFIG = {
    // Nombre de la tabla en Supabase que contiene la info de pagos/suscripción.
    SUBSCRIPTION_TABLE: 'members', 
    // Nombre de la tabla para las reservas
    BOOKINGS_TABLE: 'bookings',
    // Nombre de la tabla para registros de entrada/salida
    LOGS_TABLE: 'access_logs',
    // Nombre de la tabla para notificaciones
    NOTIFICATIONS_TABLE: 'notifications',
    // Nombre de la tabla para sugerencias
    SUGGESTIONS_TABLE: 'suggestions',
    PHONE_COLUMN: 'phone'
};

export const DEMO_USERS = [
  { id: 'u1', username: 'admin', name: 'Administrador Albrook', role: UserRole.ADMIN, password: '123', email: 'admin@albrook.com', phone: '6000-0001' },
  { id: 'u2', username: 'familia_perez', name: 'Sr. Roberto Pérez (Titular)', role: UserRole.PRINCIPAL, password: '123', email: 'roberto@email.com', phone: '6000-0002' },
  { id: 'u3', username: 'hijo_perez', name: 'Carlitos Pérez (Hijo)', role: UserRole.DEPENDENT, password: '123', email: 'carlitos@email.com', phone: '6000-0003' },
  { id: 'u4', username: 'juan_individual', name: 'Juan Individual', role: UserRole.INDIVIDUAL, password: '123', email: 'juan.perez@email.com', phone: '6000-0004' },
];