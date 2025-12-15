import React, { useState, useEffect } from 'react';
import { User, Booking, UserRole } from '../types';
import { POOL_CONFIG, ALLOWED_DAYS } from '../constants';
import { getBookings, saveBooking } from '../services/storageService';
import { sendSMS } from '../services/smsService';
import { Button } from './Button';
import { WeeklySchedule } from './WeeklySchedule';

interface BookingCalendarProps {
  user: User;
}

export const BookingCalendar: React.FC<BookingCalendarProps> = ({ user }) => {
  // View Toggle State
  const [viewMode, setViewMode] = useState<'DAILY' | 'WEEKLY'>('DAILY');

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state (For regular users / Admin overrides)
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [headCount, setHeadCount] = useState<number>(1);
  const [duration, setDuration] = useState<number>(1); 

  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // Admin Detail View State
  const [viewingHour, setViewingHour] = useState<number | null>(null);

  const isAdmin = user.role === UserRole.ADMIN;

  // Helper to get local date string YYYY-MM-DD correctly
  const getLocalTodayDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const today = getLocalTodayDate();
    setSelectedDate(today);
    loadBookings();
  }, []);

  const loadBookings = async () => {
    setLoading(true);
    try {
        const data = await getBookings();
        setBookings(data);
    } catch (e) {
        console.error("Failed to load bookings");
    } finally {
        setLoading(false);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
    setSelectedHour(null);
    setViewingHour(null); // Reset detail view
    setError(null);
    setSuccess(null);
  };

  const getCapacityForHour = (date: string, hour: number) => {
    const relevantBookings = bookings.filter(b => b.date === date && b.hour === hour && b.status === 'CONFIRMED');
    const totalPeople = relevantBookings.reduce((sum, b) => sum + b.headCount, 0);
    return totalPeople;
  };

  // Step 1: Validate rules before opening modal
  const handlePreValidation = () => {
    setError(null);
    setSuccess(null);

    if (!selectedDate || selectedHour === null) return;
    
    const [y, m, d] = selectedDate.split('-').map(Number);
    const localDate = new Date(y, m - 1, d);
    const dayOfWeek = localDate.getDay();

    if (!ALLOWED_DAYS.includes(dayOfWeek)) {
      setError("La piscina está cerrada este día de la semana.");
      return;
    }

    // Validate Availability for ALL selected hours
    for (let i = 0; i < duration; i++) {
        const checkHour = selectedHour + i;
        
        const isSaturday = dayOfWeek === 6;
        const closeHour = isSaturday ? POOL_CONFIG.CLOSE_HOUR_SATURDAY : POOL_CONFIG.CLOSE_HOUR_WEEKDAY;
        
        if (checkHour >= closeHour) {
            setError(`La reserva excede el horario de cierre (${closeHour}:00).`);
            return;
        }

        const currentOccupancy = getCapacityForHour(selectedDate, checkHour);
        if (currentOccupancy + headCount > POOL_CONFIG.MAX_CAPACITY_PER_HOUR) {
            setError(`No hay espacio suficiente a las ${checkHour}:00. Disponibles: ${POOL_CONFIG.MAX_CAPACITY_PER_HOUR - currentOccupancy}`);
            return;
        }
    }

    setShowConfirmModal(true);
  };

  // Step 2: Actually save to DB
  const finalizeBooking = async () => {
    if (!selectedDate || selectedHour === null) return;
    
    setShowConfirmModal(false);
    setLoading(true);

    try {
        const promises = [];
        for (let i = 0; i < duration; i++) {
            const h = selectedHour + i;
            const newBooking: Booking = {
                id: crypto.randomUUID(),
                userId: user.id,
                userName: user.name,
                userRole: user.role,
                date: selectedDate,
                hour: h,
                headCount: headCount,
                status: 'CONFIRMED'
            };
            promises.push(saveBooking(newBooking));
        }

        await Promise.all(promises);
        
        if (user.phone) {
            const timeRange = `${selectedHour}:00 - ${selectedHour + duration}:00`;
            await sendSMS(
                user.phone, 
                `Albrook Pool: Reserva Confirmada ✅\nFecha: ${selectedDate}\nHora: ${timeRange}\nPersonas: ${headCount}`
            );
        }

        await loadBookings();
        
        const smsMsg = user.phone ? ' SMS de confirmación enviado.' : '';
        setSuccess(`Reserva confirmada por ${duration} hora(s).${smsMsg}`);
        setError(null);
        setSelectedHour(null);
        setDuration(1);
    } catch (err) {
        setError("Error al guardar la reserva.");
    } finally {
        setLoading(false);
    }
  };

  const renderSlots = () => {
    if (!selectedDate) return null;
    if (loading && bookings.length === 0) return <div className="p-4">Cargando disponibilidad...</div>;

    const [y, m, d] = selectedDate.split('-').map(Number);
    const localDate = new Date(y, m - 1, d);
    const dayOfWeek = localDate.getDay();

    if (!ALLOWED_DAYS.includes(dayOfWeek)) {
        return <div className="p-4 text-center text-gray-500 bg-gray-100 rounded">La piscina permanece cerrada este día.</div>;
    }

    const isSaturday = dayOfWeek === 6;
    const closeHour = isSaturday ? POOL_CONFIG.CLOSE_HOUR_SATURDAY : POOL_CONFIG.CLOSE_HOUR_WEEKDAY;
    const startHour = POOL_CONFIG.OPEN_HOUR;

    const todayStr = getLocalTodayDate();
    const isToday = selectedDate === todayStr;
    const currentHour = new Date().getHours();

    const slots = [];
    for (let h = startHour; h < closeHour; h++) {
      const occupancy = getCapacityForHour(selectedDate, h);
      const isFull = occupancy >= POOL_CONFIG.MAX_CAPACITY_PER_HOUR;
      const isPastHour = isToday && h < currentHour; 
      const percentFull = (occupancy / POOL_CONFIG.MAX_CAPACITY_PER_HOUR) * 100;
      
      const isDisabled = isFull || isPastHour;

      // --- LOGIC FOR ADMIN VIEW (TRAFFIC LIGHT) ---
      if (isAdmin) {
          let bgClass = 'bg-green-50 border-green-200 hover:bg-green-100';
          let textClass = 'text-green-800';
          let icon = '🟢';

          if (percentFull > 50) {
              bgClass = 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100';
              textClass = 'text-yellow-800';
              icon = '🟡';
          }
          if (percentFull > 85) {
              bgClass = 'bg-red-50 border-red-200 hover:bg-red-100';
              textClass = 'text-red-800';
              icon = '🔴';
          }
          if (isPastHour) {
              bgClass = 'bg-gray-100 border-gray-200 opacity-60';
              textClass = 'text-gray-500';
              icon = '⚪';
          }

          slots.push(
            <div key={h} 
                onClick={() => setViewingHour(h)}
                className={`
                    relative p-3 rounded-lg border-2 cursor-pointer transition-all flex flex-col items-center justify-center h-24
                    ${bgClass}
                `}
            >
                <span className={`text-lg font-bold ${textClass}`}>{h}:00</span>
                <div className={`text-xs font-semibold ${textClass} mt-1`}>
                    {icon} {occupancy} / {POOL_CONFIG.MAX_CAPACITY_PER_HOUR}
                </div>
                <span className="text-[10px] text-gray-500 mt-1 uppercase font-medium">Ver Detalle</span>
            </div>
          );

      } else {
          // --- LOGIC FOR REGULAR USER (SELECTION) ---
          let barColor = 'bg-green-500';
          if (percentFull > 50) barColor = 'bg-yellow-500';
          if (percentFull > 90) barColor = 'bg-red-500';
          
          const isSelected = selectedHour === h;
          const isInRange = selectedHour !== null && h > selectedHour && h < selectedHour + duration;

          slots.push(
            <div key={h} 
                onClick={() => !isDisabled && !loading && setSelectedHour(h)}
                className={`
                    relative p-3 rounded-lg border cursor-pointer transition-all
                    ${isSelected ? 'border-blue-600 ring-2 ring-blue-200 bg-blue-100' : ''}
                    ${isInRange ? 'bg-blue-50 border-blue-300' : ''}
                    ${!isSelected && !isInRange ? 'border-gray-200 hover:border-blue-300 bg-white' : ''}
                    ${isDisabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}
                `}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={`font-bold ${isPastHour ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                    {h}:00 - {h + 1}:00
                </span>
                <span className="text-xs font-mono text-gray-500">
                    {isPastHour ? 'Cerrado' : `${occupancy}/${POOL_CONFIG.MAX_CAPACITY_PER_HOUR}`}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className={`${barColor} h-2 rounded-full transition-all duration-500`} style={{ width: `${percentFull}%` }}></div>
              </div>
            </div>
          );
      }
    }

    return <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">{slots}</div>;
  };

  // Helper for Admin Detail Modal
  const getBookingsForViewingHour = () => {
      if (viewingHour === null || !selectedDate) return [];
      return bookings.filter(b => b.date === selectedDate && b.hour === viewingHour && b.status === 'CONFIRMED');
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 relative">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold text-gray-800">
              {viewMode === 'DAILY' 
                 ? (isAdmin ? '👮 Tablero de Control Diario' : '📅 Nueva Reserva') 
                 : '🗓️ Disponibilidad Semanal'}
          </h2>
          <div className="flex bg-gray-100 p-1 rounded-lg">
              <button 
                onClick={() => setViewMode('DAILY')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'DAILY' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                  {isAdmin ? 'Vista Diaria' : 'Nueva Reserva'}
              </button>
              <button 
                onClick={() => setViewMode('WEEKLY')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'WEEKLY' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                  Ver Semana
              </button>
          </div>
      </div>
      
      {viewMode === 'WEEKLY' ? (
          <WeeklySchedule bookings={bookings} user={user} />
      ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Fecha</label>
                <input 
                    type="date" 
                    value={selectedDate}
                    min={isAdmin ? undefined : getLocalTodayDate()} // Admin can see past/future freely
                    onChange={handleDateChange}
                    className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {selectedDate === getLocalTodayDate() && (
                    <span className="text-xs text-green-600 mt-1 block font-medium">📅 Reservando para Hoy</span>
                )}
                </div>
                
                {/* Inputs for making reservation - Hide for Admin unless they really want to, 
                    but requirement says "Admin sees what others request", so we prioritize the grid view.
                    We keep inputs visible for Admin just in case they need to override, but visually de-emphasized? 
                    Actually, if Admin clicks grid, it opens details. So Admin can't easily click to book. 
                    Let's hide inputs for Admin to clean up the interface as requested. */}
                {!isAdmin && (
                    <>
                        <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad de Personas</label>
                        <select 
                            value={headCount}
                            onChange={(e) => setHeadCount(Number(e.target.value))}
                            className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                            disabled={user.role === UserRole.INDIVIDUAL} 
                        >
                            {[1, 2, 3, 4, 5, 10, 15, 20].map(n => (
                                <option key={n} value={n}>{n} persona{n > 1 ? 's' : ''}</option>
                            ))}
                        </select>
                        </div>

                        <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Duración (Horas)</label>
                        <select 
                            value={duration}
                            onChange={(e) => {
                                setDuration(Number(e.target.value));
                                setError(null); 
                            }}
                            className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value={1}>1 Hora</option>
                            <option value={2}>2 Horas</option>
                            <option value={3}>3 Horas</option>
                            <option value={4}>4 Horas</option>
                        </select>
                        </div>
                    </>
                )}
                {isAdmin && (
                    <div className="md:col-span-2 flex items-center bg-blue-50 p-3 rounded text-blue-800 text-sm">
                        ℹ️ Seleccione un bloque horario para ver la lista de usuarios.
                    </div>
                )}
            </div>

            <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-800 mb-2">
                    {isAdmin ? `Estado de Ocupación (${selectedDate})` : 'Horarios Disponibles'}
                </h3>
                {renderSlots()}
            </div>

            {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md border border-red-200">⚠️ {error}</div>}
            {success && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md border border-green-200">✅ {success}</div>}

            {!isAdmin && (
                <div className="flex justify-end">
                    <Button 
                        disabled={!selectedDate || selectedHour === null || loading}
                        onClick={handlePreValidation}
                        className="w-full md:w-auto"
                    >
                        {loading ? 'Procesando...' : `Confirmar Reserva (${selectedHour !== null ? `${selectedHour}:00 - ${selectedHour + duration}:00` : '--:--'})`}
                    </Button>
                </div>
            )}
          </>
      )}

      {/* Booking Confirmation Modal (User) */}
      {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-50">
              <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 animate-fade-in-up border-t-4 border-blue-500">
                  <div className="text-center mb-4">
                      <h3 className="text-xl font-bold text-gray-900">Confirmar Reserva</h3>
                      <p className="text-sm text-gray-500 mt-1">Por favor verifique los detalles antes de continuar.</p>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg mb-6 text-left space-y-2">
                      <div className="flex justify-between">
                          <span className="text-gray-600 text-sm">Fecha:</span>
                          <span className="font-bold text-gray-800">{selectedDate}</span>
                      </div>
                      <div className="flex justify-between">
                          <span className="text-gray-600 text-sm">Horario:</span>
                          <span className="font-bold text-gray-800">
                            {selectedHour !== null ? `${selectedHour}:00 - ${selectedHour + duration}:00` : ''}
                          </span>
                      </div>
                      <div className="flex justify-between">
                          <span className="text-gray-600 text-sm">Personas:</span>
                          <span className="font-bold text-gray-800">{headCount}</span>
                      </div>
                  </div>

                  <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setShowConfirmModal(false)} className="w-full">
                          Cancelar
                      </Button>
                      <Button variant="primary" onClick={finalizeBooking} className="w-full">
                          Confirmar
                      </Button>
                  </div>
              </div>
          </div>
      )}

      {/* Admin Slot Detail Modal */}
      {viewingHour !== null && isAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-50">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-0 animate-fade-in-up overflow-hidden">
                  <div className="bg-blue-700 text-white p-4 flex justify-between items-center">
                      <div>
                          <h3 className="text-lg font-bold">Detalle de Ocupación</h3>
                          <p className="text-blue-200 text-xs">{selectedDate} | {viewingHour}:00 - {viewingHour + 1}:00</p>
                      </div>
                      <button onClick={() => setViewingHour(null)} className="text-blue-200 hover:text-white">✕</button>
                  </div>
                  
                  <div className="p-4 max-h-96 overflow-y-auto">
                      {getBookingsForViewingHour().length === 0 ? (
                          <div className="text-center py-8 text-gray-400">
                              <p>No hay reservas en este horario.</p>
                          </div>
                      ) : (
                          <div className="space-y-3">
                              {getBookingsForViewingHour().map(b => (
                                  <div key={b.id} className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-100">
                                      <div>
                                          <p className="font-bold text-gray-800">{b.userName}</p>
                                          <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">{b.userRole}</span>
                                      </div>
                                      <div className="text-right">
                                          <p className="font-bold text-lg text-gray-700">{b.headCount} <span className="text-xs font-normal text-gray-500">pers.</span></p>
                                      </div>
                                  </div>
                              ))}
                              
                              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                                  <span className="text-sm font-bold text-gray-600">Total Personas:</span>
                                  <span className="text-xl font-bold text-blue-600">
                                      {getBookingsForViewingHour().reduce((sum, b) => sum + b.headCount, 0)} 
                                      <span className="text-sm text-gray-400 font-normal"> / {POOL_CONFIG.MAX_CAPACITY_PER_HOUR}</span>
                                  </span>
                              </div>
                          </div>
                      )}
                  </div>

                  <div className="p-4 bg-gray-50 text-right">
                      <Button variant="outline" size="sm" onClick={() => setViewingHour(null)}>
                          Cerrar
                      </Button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};