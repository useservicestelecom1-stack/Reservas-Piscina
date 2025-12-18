
import { UserRole } from './types';

export const POOL_CONFIG = {
  OPEN_HOUR: 5, // 5:00 AM
  CLOSE_HOUR_WEEKDAY: 20, // 8:00 PM (20:00)
  CLOSE_HOUR_SATURDAY: 14, // 2:00 PM (14:00)
  MAX_CAPACITY_PER_HOUR: 50, // Capacidad máxima establecida
  // Horarios exclusivos para Clubs (Representantes/Principales)
  // 5-7am (5, 6) y 3-6pm (15, 16, 17)
  CLUB_EXCLUSIVE_HOURS: [5, 6, 15, 16, 17] 
};

// Dias de la semana para validación (0 = Domingo, 1 = Lunes, ...)
// Martes (2) a Viernes (5), y Sábado (6)
export const ALLOWED_DAYS = [2, 3, 4, 5, 6]; 

// Configuración de Tablas Externas (Supabase)
export const EXTERNAL_DB_CONFIG = {
    // Nombre de la tabla en Supabase que contiene la info de socios (se cambia a plural)
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
