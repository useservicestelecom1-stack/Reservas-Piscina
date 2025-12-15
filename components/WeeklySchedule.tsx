import React, { useState, useEffect } from 'react';
import { Booking, User } from '../types';
import { POOL_CONFIG, ALLOWED_DAYS } from '../constants';
import { Button } from './Button';

interface WeeklyScheduleProps {
  bookings: Booking[];
  user: User;
}

export const WeeklySchedule: React.FC<WeeklyScheduleProps> = ({ bookings, user }) => {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(new Date());

  // Helper: Get Monday of the current week based on a date
  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
    return new Date(date.setDate(diff));
  };

  useEffect(() => {
    setCurrentWeekStart(getMonday(new Date()));
  }, []);

  const changeWeek = (offset: number) => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + (offset * 7));
    setCurrentWeekStart(newDate);
  };

  const formatDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Generate days for the header
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return {
      dateObj: d,
      dateString: formatDateKey(d),
      dayName: d.toLocaleDateString('es-PA', { weekday: 'short' }),
      dayNumber: d.getDate(),
      dayIndex: d.getDay() // 0=Sun, 1=Mon...
    };
  });

  const getCellData = (dateStr: string, hour: number) => {
    const cellBookings = bookings.filter(b => b.date === dateStr && b.hour === hour && b.status === 'CONFIRMED');
    const totalPax = cellBookings.reduce((sum, b) => sum + b.headCount, 0);
    const hasMyBooking = cellBookings.some(b => b.userId === user.id);
    
    return { totalPax, hasMyBooking };
  };

  return (
    <div className="bg-white rounded-lg shadow-inner p-4 overflow-hidden border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <Button variant="outline" size="sm" onClick={() => changeWeek(-1)}>← Anterior</Button>
        <h3 className="text-lg font-bold text-gray-700 capitalize">
          {currentWeekStart.toLocaleDateString('es-PA', { month: 'long', year: 'numeric' })}
        </h3>
        <Button variant="outline" size="sm" onClick={() => changeWeek(1)}>Siguiente →</Button>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header Row */}
          <div className="grid grid-cols-8 gap-1 mb-2">
            <div className="font-bold text-gray-400 text-xs flex items-end justify-center pb-2">HORA</div>
            {weekDays.map(day => (
              <div key={day.dateString} className={`text-center p-2 rounded-t-lg ${
                day.dateString === formatDateKey(new Date()) ? 'bg-blue-100 ring-2 ring-blue-400' : 'bg-gray-50'
              }`}>
                <div className="text-xs font-bold uppercase text-gray-500">{day.dayName}</div>
                <div className="text-lg font-bold text-gray-800">{day.dayNumber}</div>
              </div>
            ))}
          </div>

          {/* Grid Rows */}
          {Array.from({ length: POOL_CONFIG.CLOSE_HOUR_WEEKDAY - POOL_CONFIG.OPEN_HOUR }, (_, i) => {
            const hour = POOL_CONFIG.OPEN_HOUR + i;
            return (
              <div key={hour} className="grid grid-cols-8 gap-1 mb-1">
                {/* Time Label */}
                <div className="text-xs text-gray-500 font-mono flex items-center justify-center bg-gray-50 rounded">
                  {hour}:00
                </div>

                {/* Day Cells */}
                {weekDays.map(day => {
                   const isAllowedDay = ALLOWED_DAYS.includes(day.dayIndex);
                   const isSaturday = day.dayIndex === 6;
                   const isClosedHour = isSaturday && hour >= POOL_CONFIG.CLOSE_HOUR_SATURDAY;
                   
                   if (!isAllowedDay || isClosedHour) {
                       return <div key={`${day.dateString}-${hour}`} className="bg-gray-200 rounded opacity-50 flex items-center justify-center text-[10px] text-gray-400">●</div>;
                   }

                   const { totalPax, hasMyBooking } = getCellData(day.dateString, hour);
                   const capacityPercent = (totalPax / POOL_CONFIG.MAX_CAPACITY_PER_HOUR) * 100;
                   
                   let bgColor = 'bg-green-100 hover:bg-green-200';
                   let textColor = 'text-green-800';
                   
                   if (capacityPercent > 50) { bgColor = 'bg-yellow-100 hover:bg-yellow-200'; textColor = 'text-yellow-800'; }
                   if (capacityPercent > 90) { bgColor = 'bg-red-100 hover:bg-red-200'; textColor = 'text-red-800'; }
                   
                   if (hasMyBooking) {
                       bgColor = 'bg-blue-600 hover:bg-blue-700';
                       textColor = 'text-white';
                   }

                   return (
                     <div key={`${day.dateString}-${hour}`} className={`${bgColor} rounded p-1 flex flex-col items-center justify-center transition-colors cursor-default h-10 border border-transparent ${hasMyBooking ? 'shadow-md' : ''}`}>
                        <span className={`text-xs font-bold ${textColor}`}>
                            {hasMyBooking ? '★' : ''} {totalPax}
                        </span>
                        <span className={`text-[9px] ${hasMyBooking ? 'text-blue-100' : 'text-gray-500'}`}>
                            / {POOL_CONFIG.MAX_CAPACITY_PER_HOUR}
                        </span>
                     </div>
                   );
                })}
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="mt-4 flex gap-4 text-xs text-gray-500 justify-center">
          <div className="flex items-center gap-1"><span className="w-3 h-3 bg-green-100 rounded border border-green-200"></span> Disponible</div>
          <div className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-100 rounded border border-yellow-200"></span> Concurrido</div>
          <div className="flex items-center gap-1"><span className="w-3 h-3 bg-red-100 rounded border border-red-200"></span> Lleno</div>
          <div className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-600 rounded"></span> Mi Reserva</div>
          <div className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-200 rounded"></span> Cerrado</div>
      </div>
    </div>
  );
};