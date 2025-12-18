
import { Booking, AccessLog, User, UserRole, AppNotification, Suggestion } from '../types';
import { EXTERNAL_DB_CONFIG } from '../constants';
import { supabase } from './supabaseClient';

const KEYS = {
  USER: 'albrook_current_user',
};

export interface AccountStatus {
  exists: boolean;
  data?: any;
  message?: string;
}

export interface PersonalStats {
  weeklyLaps: number;
  weeklyMeters: number;
  weeklyTimeMinutes: number;
  monthlyLaps: number;
  monthlyMeters: number;
  monthlyTimeMinutes: number;
  yearlyLaps: number;
  yearlyMeters: number;
  yearlyTimeMinutes: number;
  bestDayLaps: number;
  bestDayMeters: number;
  bestDayDate: string;
}

export interface RankingItem {
  rank: number;
  userId: string;
  userName: string;
  totalLaps: number;
  totalMeters: number;
  totalTimeMinutes: number;
}

const mapRowToUser = (row: any): User => {
  const rawRole = (row.role || row.category || '').toUpperCase();
  
  let finalRole = UserRole.INDIVIDUAL;
  if (Object.values(UserRole).includes(rawRole as UserRole)) {
    finalRole = rawRole as UserRole;
  }

  return {
    id: row.id?.toString() || '',
    name: row.fullName || row.name || row.username || 'Usuario',
    username: row.username,
    role: finalRole,
    password: row.password,
    email: row.email,
    phone: row.phone,
    status: row.status,
    photoUrl: row.photo_url || row.photoUrl,
    lastPaymentDate: row.last_payment_date || row.lastPaymentDate
  };
};

const mapRowToBooking = (row: any): Booking => ({
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userRole: (row.user_role?.toUpperCase() as UserRole) || UserRole.INDIVIDUAL,
    userPhotoUrl: row.user_photo_url,
    date: row.date,
    hour: row.hour,
    headCount: row.head_count,
    status: row.status as 'CONFIRMED' | 'CANCELLED',
    // Mapeo flexible para leer de ambas versiones si existen
    laneNumbers: row.lane_number?.toString() || row.lane_numbers?.toString() || '',
    bookingCode: row.booking_code
});

export const getBookings = async (): Promise<Booking[]> => {
  try {
      const { data, error } = await supabase
        .from(EXTERNAL_DB_CONFIG.BOOKINGS_TABLE)
        .select('*');
      if (error) throw error;
      return data.map(mapRowToBooking);
  } catch (err) {
      console.error("Error fetching bookings:", err);
      return [];
  }
};

export const saveBooking = async (booking: Booking): Promise<void> => {
  // 1. Asegurar que el usuario existe en la tabla 'members' para evitar errores de Foreign Key
  const { data: userExists } = await supabase
    .from(EXTERNAL_DB_CONFIG.SUBSCRIPTION_TABLE)
    .select('id')
    .eq('id', booking.userId)
    .maybeSingle();

  if (!userExists) {
    // Si es el admin maestro o un usuario social no sincronizado, creamos un perfil mínimo
    await supabase.from(EXTERNAL_DB_CONFIG.SUBSCRIPTION_TABLE).insert({
      id: booking.userId,
      name: booking.userName,
      username: booking.userId,
      role: booking.userRole,
      status: 'ACTIVO'
    });
  }

  // 2. Intentar guardar la reserva usando 'lane_number' (singular)
  const { error } = await supabase
    .from(EXTERNAL_DB_CONFIG.BOOKINGS_TABLE)
    .insert({
        id: booking.id,
        user_id: booking.userId,
        user_name: booking.userName,
        user_role: booking.userRole,
        user_photo_url: booking.userPhotoUrl,
        date: booking.date,
        hour: booking.hour,
        head_count: booking.headCount,
        status: booking.status,
        lane_number: booking.laneNumbers, // Corregido a singular
        booking_code: booking.bookingCode
    });
    
  if (error) {
    console.error("Supabase Save Error:", error);
    throw new Error(error.message);
  }
};

export const updateBookingStatus = async (id: string, status: 'CONFIRMED' | 'CANCELLED'): Promise<void> => {
    const { error } = await supabase
        .from(EXTERNAL_DB_CONFIG.BOOKINGS_TABLE)
        .update({ status: status })
        .eq('id', id);
    if (error) throw new Error(error.message);
}

export const deleteBooking = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from(EXTERNAL_DB_CONFIG.BOOKINGS_TABLE)
        .delete()
        .eq('id', id);
    if (error) throw new Error(error.message);
};

export const getLogs = async (): Promise<AccessLog[]> => {
  try {
      const { data, error } = await supabase
        .from(EXTERNAL_DB_CONFIG.LOGS_TABLE)
        .select('*');
      if (error) throw error;
      return data.map((row: any) => ({
          id: row.id,
          bookingId: row.booking_id,
          check_in_time: row.check_in_time,
          check_out_time: row.check_out_time,
          laps: row.laps || 0
      }));
  } catch (err) {
      console.error("Error fetching logs:", err);
      return [];
  }
};

export const saveLog = async (log: AccessLog): Promise<void> => {
  const payload: any = {
        id: log.id,
        booking_id: log.bookingId,
        check_in_time: log.checkInTime,
        check_out_time: log.checkOutTime,
        laps: log.laps || 0
    };
  const { error } = await supabase.from(EXTERNAL_DB_CONFIG.LOGS_TABLE).upsert(payload);
  if (error) throw new Error(error.message);
};

export const getSwimmerStats = async (userId: string): Promise<PersonalStats> => {
    return { weeklyLaps: 0, weeklyMeters: 0, weeklyTimeMinutes: 0, monthlyLaps: 0, monthlyMeters: 0, monthlyTimeMinutes: 0, yearlyLaps: 0, yearlyMeters: 0, yearlyTimeMinutes: 0, bestDayLaps: 0, bestDayMeters: 0, bestDayDate: '-' };
};

export const getLeaderboard = async (): Promise<RankingItem[]> => [];

export const getAllUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from(EXTERNAL_DB_CONFIG.SUBSCRIPTION_TABLE)
    .select('*');
  if (error) {
    console.error("Error fetching all users:", error);
    return [];
  }
  return data.map(mapRowToUser);
};

export const registerUser = async (user: User) => {
  const { error } = await supabase
    .from(EXTERNAL_DB_CONFIG.SUBSCRIPTION_TABLE)
    .insert({
      id: user.id,
      name: user.name,
      username: user.username,
      password: user.password,
      role: user.role,
      email: user.email,
      phone: user.phone,
      status: user.status
    });
  if (error) throw error;
};

export const updateUser = async (user: User) => {
  const payload: any = {
    name: user.name,
    role: user.role,
    email: user.email,
    phone: user.phone,
    status: user.status
  };
  if (user.password) payload.password = user.password;

  const { error } = await supabase
    .from(EXTERNAL_DB_CONFIG.SUBSCRIPTION_TABLE)
    .update(payload)
    .eq('id', user.id);
  if (error) throw error;
};

export const deleteUser = async (id: string) => {
  const { error } = await supabase
    .from(EXTERNAL_DB_CONFIG.SUBSCRIPTION_TABLE)
    .delete()
    .eq('id', id);
  if (error) throw error;
};

export const loginUser = async (username: string, password?: string): Promise<User | null> => {
  try {
    if (username === 'admin' && password === 'admin123') {
        const masterAdmin: User = {
            id: 'master-admin-001',
            username: 'admin',
            name: 'Administrador Maestro',
            role: UserRole.ADMIN,
            status: 'ACTIVO'
        };
        localStorage.setItem(KEYS.USER, JSON.stringify(masterAdmin));
        return masterAdmin;
    }

    const { data, error } = await supabase
      .from(EXTERNAL_DB_CONFIG.SUBSCRIPTION_TABLE)
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (error || !data) return null;

    if (password && data.password === password) {
      const user = mapRowToUser(data);
      localStorage.setItem(KEYS.USER, JSON.stringify(user));
      return user;
    }
  } catch (err) {
    console.error("Login exception:", err);
  }
  return null;
};

export const syncSocialUser = async (authUser: any) => {
  const { data, error } = await supabase
    .from(EXTERNAL_DB_CONFIG.SUBSCRIPTION_TABLE)
    .select('*')
    .eq('email', authUser.email)
    .maybeSingle();

  if (data) {
    const user = mapRowToUser(data);
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
    return user;
  }
  throw new Error("Usuario no registrado en la base de datos de la piscina.");
};

export const getCurrentUser = (): User | null => {
  const data = localStorage.getItem(KEYS.USER);
  return data ? JSON.parse(data) : null;
};

export const logoutUser = async () => { 
  localStorage.removeItem(KEYS.USER); 
  await supabase.auth.signOut();
};

export const getAccountStatusByPhone = async (phone: string): Promise<AccountStatus> => {
  const { data, error } = await supabase
    .from(EXTERNAL_DB_CONFIG.SUBSCRIPTION_TABLE)
    .select('*')
    .eq('phone', phone)
    .maybeSingle();
  
  if (error || !data) return { exists: false };
  return { exists: true, data };
};

export const getNotifications = async (userId: string) => [];
export const markNotificationAsRead = async (id: string) => {};
export const sendNotification = async (recipientId: string, title: string, message: string) => {};
export const broadcastNotification = async (title: string, message: string, role?: UserRole) => {};
export const getSuggestions = async () => [];
export const saveSuggestion = async (userId: string, userName: string, message: string) => {};
export const markSuggestionRead = async (id: string, isRead: boolean) => {};
