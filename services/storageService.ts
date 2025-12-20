
import { Booking, AccessLog, User, UserRole, AppNotification, Suggestion } from '../types';
import { EXTERNAL_DB_CONFIG } from '../constants';
import { supabase } from './supabaseClient';

const KEYS = {
  USER: 'albrook_current_user',
};

/**
 * Mapea el rol interno de la App al valor esperado por el ENUM de la DB (MemberCategory).
 * Si "individual" e "INDIVIDUAL" fallaron, es muy probable que sea "Individual" (Capitalizado)
 */
const toDBCategory = (role: UserRole): string => {
  switch (role) {
    case UserRole.ADMIN: return 'Administrador';
    case UserRole.PRINCIPAL: return 'Principal';
    case UserRole.DEPENDENT: return 'Dependiente';
    case UserRole.INDIVIDUAL: return 'Individual';
    default: return 'Individual';
  }
};

/**
 * Convierte cualquier valor de la DB al rol interno de la App de forma segura.
 */
const fromDBCategory = (dbValue: string): UserRole => {
  const val = (dbValue || '').toUpperCase();
  if (val.includes('ADMIN')) return UserRole.ADMIN;
  if (val.includes('PRINCIPAL')) return UserRole.PRINCIPAL;
  if (val.includes('DEPENDENT') || val.includes('DEPENDIENTE')) return UserRole.DEPENDENT;
  return UserRole.INDIVIDUAL;
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
  return {
    id: row.id?.toString() || '',
    name: row.fullName || row.name || row.username || 'Usuario',
    username: row.username,
    role: fromDBCategory(row.category),
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
    userRole: fromDBCategory(row.user_role),
    userPhotoUrl: row.user_photo_url,
    date: row.date,
    hour: row.hour,
    headCount: row.head_count,
    status: row.status as 'CONFIRMED' | 'CANCELLED',
    laneNumbers: row.lane_number?.toString() || row.lane_numbers?.toString() || '',
    bookingCode: row.booking_code
});

export const getBookings = async (): Promise<Booking[]> => {
  try {
      const { data, error } = await supabase.from(EXTERNAL_DB_CONFIG.BOOKINGS_TABLE).select('*');
      if (error) throw error;
      return data.map(mapRowToBooking);
  } catch (err) {
      console.error("Error fetching bookings:", err);
      return [];
  }
};

export const saveBooking = async (booking: Booking): Promise<void> => {
  const { data: userExists } = await supabase.from(EXTERNAL_DB_CONFIG.SUBSCRIPTION_TABLE).select('id').eq('id', booking.userId).maybeSingle();
  if (!userExists) {
    await supabase.from(EXTERNAL_DB_CONFIG.SUBSCRIPTION_TABLE).insert({
      id: booking.userId, 
      fullName: booking.userName,
      username: booking.userId, 
      category: toDBCategory(booking.userRole),
      status: 'ACTIVO'
    });
  }
  const { error } = await supabase.from(EXTERNAL_DB_CONFIG.BOOKINGS_TABLE).insert({
        id: booking.id, user_id: booking.userId, user_name: booking.userName, user_role: booking.userRole,
        user_photo_url: booking.userPhotoUrl, date: booking.date, hour: booking.hour, head_count: booking.headCount,
        status: booking.status, lane_number: booking.laneNumbers, booking_code: booking.bookingCode
    });
  if (error) throw new Error(error.message);
};

export const updateBookingStatus = async (id: string, status: 'CONFIRMED' | 'CANCELLED'): Promise<void> => {
    const { error } = await supabase.from(EXTERNAL_DB_CONFIG.BOOKINGS_TABLE).update({ status: status }).eq('id', id);
    if (error) throw new Error(error.message);
}

export const deleteBooking = async (id: string): Promise<void> => {
    const { error } = await supabase.from(EXTERNAL_DB_CONFIG.BOOKINGS_TABLE).delete().eq('id', id);
    if (error) throw new Error(error.message);
};

export const getLogs = async (): Promise<AccessLog[]> => {
  try {
      const { data, error } = await supabase.from(EXTERNAL_DB_CONFIG.LOGS_TABLE).select('*');
      if (error) throw error;
      return data.map((row: any) => ({
          id: row.id,
          bookingId: row.booking_id,
          checkInTime: row.check_in_time,
          checkOutTime: row.check_out_time,
          laps: parseInt(row.laps || 0)
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
        laps: parseInt(log.laps?.toString() || '0')
    };
  const { error } = await supabase.from(EXTERNAL_DB_CONFIG.LOGS_TABLE).upsert(payload);
  if (error) throw new Error(error.message);
};

export const getSwimmerStats = async (userId: string): Promise<PersonalStats> => {
    try {
        const [allLogs, allBookings] = await Promise.all([getLogs(), getBookings()]);
        const userBookingsIds = allBookings.filter(b => b.userId === userId).map(b => b.id);
        const userLogs = allLogs.filter(l => userBookingsIds.includes(l.bookingId) && l.checkOutTime);

        const now = new Date();
        const startOfWeek = new Date(new Date().setDate(now.getDate() - now.getDay() + 1));
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        const filterLogs = (date: Date) => userLogs.filter(l => new Date(l.checkOutTime!) >= date);

        const weekly = filterLogs(startOfWeek);
        const monthly = filterLogs(startOfMonth);
        const yearly = filterLogs(startOfYear);

        const sumLaps = (logs: AccessLog[]) => logs.reduce((acc, l) => acc + (l.laps || 0), 0);
        const sumTime = (logs: AccessLog[]) => logs.reduce((acc, l) => {
            if (!l.checkInTime || !l.checkOutTime) return acc;
            const diff = (new Date(l.checkOutTime).getTime() - new Date(l.checkInTime).getTime()) / 60000;
            return acc + Math.max(0, diff);
        }, 0);

        const logsByDate: Record<string, number> = {};
        userLogs.forEach(l => {
            const d = l.checkOutTime!.split('T')[0];
            logsByDate[d] = (logsByDate[d] || 0) + (l.laps || 0);
        });
        
        let bestDayDate = '-';
        let bestDayLaps = 0;
        Object.entries(logsByDate).forEach(([date, laps]) => {
            if (laps > bestDayLaps) { bestDayLaps = laps; bestDayDate = date; }
        });

        return {
            weeklyLaps: sumLaps(weekly), weeklyMeters: sumLaps(weekly) * 50, weeklyTimeMinutes: Math.round(sumTime(weekly)),
            monthlyLaps: sumLaps(monthly), monthlyMeters: sumLaps(monthly) * 50, monthlyTimeMinutes: Math.round(sumTime(monthly)),
            yearlyLaps: sumLaps(yearly), yearlyMeters: sumLaps(yearly) * 50, yearlyTimeMinutes: Math.round(sumTime(yearly)),
            bestDayLaps, bestDayMeters: bestDayLaps * 50, bestDayDate
        };
    } catch (e) {
        console.error("Stats Error:", e);
        return { weeklyLaps: 0, weeklyMeters: 0, weeklyTimeMinutes: 0, monthlyLaps: 0, monthlyMeters: 0, monthlyTimeMinutes: 0, yearlyLaps: 0, yearlyMeters: 0, yearlyTimeMinutes: 0, bestDayLaps: 0, bestDayMeters: 0, bestDayDate: '-' };
    }
};

export const getLeaderboard = async (): Promise<RankingItem[]> => {
    try {
        const [allLogs, allBookings] = await Promise.all([getLogs(), getBookings()]);
        const userStats: Record<string, { name: string, laps: number, time: number }> = {};

        allLogs.forEach(log => {
            if (!log.checkOutTime) return;
            const booking = allBookings.find(b => b.id === log.bookingId);
            if (!booking) return;

            if (!userStats[booking.userId]) {
                userStats[booking.userId] = { name: booking.userName, laps: 0, time: 0 };
            }

            userStats[booking.userId].laps += (log.laps || 0);
            if (log.checkInTime && log.checkOutTime) {
                const diff = (new Date(log.checkOutTime).getTime() - new Date(log.checkInTime).getTime()) / 60000;
                userStats[booking.userId].time += Math.max(0, diff);
            }
        });

        return Object.entries(userStats)
            .map(([userId, stats]) => ({
                rank: 0, userId, userName: stats.name, totalLaps: stats.laps, totalMeters: stats.laps * 50, totalTimeMinutes: Math.round(stats.time)
            }))
            .sort((a, b) => b.totalLaps - a.totalLaps)
            .map((item, index) => ({ ...item, rank: index + 1 }))
            .slice(0, 10);
    } catch (e) {
        console.error("Leaderboard Error:", e);
        return [];
    }
};

export const getAllUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase.from(EXTERNAL_DB_CONFIG.SUBSCRIPTION_TABLE).select('*');
  if (error) return [];
  return data.map(mapRowToUser);
};

export const registerUser = async (user: User) => {
  const { error } = await supabase.from(EXTERNAL_DB_CONFIG.SUBSCRIPTION_TABLE).insert({
      id: user.id, 
      fullName: user.name, 
      username: user.username, 
      password: user.password, 
      category: toDBCategory(user.role),
      email: user.email, 
      phone: user.phone, 
      status: user.status
    });
  if (error) throw error;
};

export const updateUser = async (user: User) => {
  const payload: any = { 
    fullName: user.name, 
    username: user.username, // CRITICAL: Asegurar que el username se persista
    category: toDBCategory(user.role),
    email: user.email, 
    phone: user.phone, 
    status: user.status 
  };
  if (user.password) payload.password = user.password;
  
  const { error } = await supabase.from(EXTERNAL_DB_CONFIG.SUBSCRIPTION_TABLE)
    .update(payload)
    .eq('id', user.id);
    
  if (error) throw error;
};

export const deleteUser = async (id: string) => {
  const { error } = await supabase.from(EXTERNAL_DB_CONFIG.SUBSCRIPTION_TABLE).delete().eq('id', id);
  if (error) throw error;
};

export const loginUser = async (username: string, password?: string): Promise<User | null> => {
  try {
    if (username === 'admin' && password === 'admin123') {
        const masterAdmin: User = { id: 'master-admin-001', username: 'admin', name: 'Administrador Maestro', role: UserRole.ADMIN, status: 'ACTIVO' };
        localStorage.setItem(KEYS.USER, JSON.stringify(masterAdmin));
        return masterAdmin;
    }
    const { data, error } = await supabase.from(EXTERNAL_DB_CONFIG.SUBSCRIPTION_TABLE).select('*').eq('username', username).maybeSingle();
    if (error || !data) return null;
    if (password && data.password === password) {
      const user = mapRowToUser(data);
      localStorage.setItem(KEYS.USER, JSON.stringify(user));
      return user;
    }
  } catch (err) { console.error(err); }
  return null;
};

export const syncSocialUser = async (authUser: any) => {
  const { data, error } = await supabase.from(EXTERNAL_DB_CONFIG.SUBSCRIPTION_TABLE).select('*').eq('email', authUser.email).maybeSingle();
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
  const { data, error } = await supabase.from(EXTERNAL_DB_CONFIG.SUBSCRIPTION_TABLE).select('*').eq('phone', phone).maybeSingle();
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
