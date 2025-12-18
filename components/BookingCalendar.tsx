
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
  const [viewMode, setViewMode] = useState<'DAILY' | 'WEEKLY'>('DAILY');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{msg: string, code: string, lanes: string} | null>(null);

  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [headCount, setHeadCount] = useState<number>(1);
  const [duration, setDuration] = useState<number>(1); 

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAssignment, setPendingAssignment] = useState<{lanes: string, code: string} | null>(null);
  const [viewingHour, setViewingHour] = useState<number | null>(null);

  const isAdmin = user.role === UserRole.ADMIN;
  const isClubRep = user.role === UserRole.PRINCIPAL || isAdmin;

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
    setViewingHour(null);
    setError(null);
    setSuccess(null);
  };

  const getCapacityForHour = (date: string, hour: number) => {
    const relevantBookings = bookings.filter(b => b.date === date && b.hour === hour && b.status === 'CONFIRMED');
    return relevantBookings.reduce((sum, b) => sum + b.headCount, 0);
  };

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

    for (let i = 0; i < duration; i++) {
        const checkHour = selectedHour + i;
        const isSaturday = dayOfWeek === 6;
        const closeHour = isSaturday ? POOL_CONFIG.CLOSE_HOUR_SATURDAY : POOL_CONFIG.CLOSE_HOUR_WEEKDAY;
        
        if (checkHour >= closeHour) {
            setError(`La reserva excede el horario de cierre (${closeHour}:00).`);
            return;
        }

        if (POOL_CONFIG.CLUB_EXCLUSIVE_HOURS.includes(checkHour) && !isClubRep) {
            setError(`El horario ${checkHour}:00 es exclusivo para Clubs y Representantes.`);
            return;
        }

        const currentOccupancy = getCapacityForHour(selectedDate, checkHour);
        if (currentOccupancy + headCount > POOL_CONFIG.MAX_CAPACITY_PER_HOUR) {
            setError(`No hay espacio suficiente a las ${checkHour}:00. Disponibles: ${POOL_CONFIG.MAX_CAPACITY_PER_HOUR - currentOccupancy}`);
            return;
        }
    }

    // MULTI-LANE LOGIC
    const currentPax = getCapacityForHour(selectedDate, selectedHour);
    const startLane = Math.floor(currentPax / 6) + 1;
    const endLane = Math.floor((currentPax + headCount - 1) / 6) + 1;
    
    const lanesArray = [];
    for (let l = startLane; l <= endLane; l++) {
        lanesArray.push(l);
    }
    const lanesStr = lanesArray.join(', ');

    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const code = `ALB-${selectedDate.replace(/-/g, '')}-${selectedHour.toString().padStart(2, '0')}-${randomSuffix}`;
    
    setPendingAssignment({ lanes: lanesStr, code });
    setShowConfirmModal(true);
  };

  const finalizeBooking = async () => {
    if (!selectedDate || selectedHour === null || !pendingAssignment) return;
    
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
                userPhotoUrl: user.photoUrl,
                date: selectedDate,
                hour: h,
                headCount: headCount,
                status: 'CONFIRMED',
                laneNumbers: pendingAssignment.lanes,
                bookingCode: pendingAssignment.code 
            };
            promises.push(saveBooking(newBooking));
        }

        await Promise.all(promises);
        
        if (user.phone) {
            const timeRange = `${selectedHour}:00 - ${selectedHour + duration}:00`;
            await sendSMS(
                user.phone, 
                `Albrook Pool: Reserva Confirmada ✅\nCódigo: ${pendingAssignment.code}\nCarriles: ${pendingAssignment.lanes}\nFecha: ${selectedDate}\nHora: ${timeRange}`
            );
        }

        await loadBookings();
        
        setSuccess({
            msg: `¡Reserva exitosa! Toma una captura de tu ticket.`,
            code: pendingAssignment.code,
            lanes: pendingAssignment.lanes
        });
        setError(null);
        setSelectedHour(null);
        setDuration(1);
    } catch (err) {
        setError("Error al guardar la reserva.");
    } finally {
        setLoading(false);
    }
  };

  // Remaining render logic updated to use success.lanes and b.laneNumbers
  const renderSlots = () => {
    if (!selectedDate) return null;
    if (loading && bookings.length === 0) return <div className="p-4">Cargando disponibilidad...</div>;
    const [y, m, d] = selectedDate.split('-').map(Number);
    const localDate = new Date(y, m - 1, d);
    const dayOfWeek = localDate.getDay();
    if (!ALLOWED_DAYS.includes(dayOfWeek)) return <div className="p-4 text-center text-gray-500 bg-gray-100 rounded">Cerrado</div>;

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
      const isExclusive = POOL_CONFIG.CLUB_EXCLUSIVE_HOURS.includes(h);
      const isRestrictedForMe = isExclusive && !isClubRep;
      const isDisabled = isFull || isPastHour || isRestrictedForMe;

      if (isAdmin) {
          slots.push(
            <div key={h} onClick={() => setViewingHour(h)} className={`relative p-3 rounded-lg border-2 cursor-pointer transition-all flex flex-col items-center justify-center h-24 ${isPastHour ? 'bg-gray-100 border-gray-200' : 'bg-green-50 border-green-200'} ${isExclusive ? 'ring-1 ring-blue-400' : ''}`}>
                {isExclusive && <span className="absolute top-1 left-1 bg-blue-600 text-white text-[9px] px-1 rounded font-bold uppercase">Club</span>}
                <span className="text-lg font-bold">{h}:00</span>
                <div className="text-xs font-semibold mt-1">{occupancy} / {POOL_CONFIG.MAX_CAPACITY_PER_HOUR}</div>
                <span className="text-[10px] text-gray-500 mt-1 uppercase">Detalle</span>
            </div>
          );
      } else {
          const isSelected = selectedHour === h;
          const isInRange = selectedHour !== null && h > selectedHour && h < selectedHour + duration;
          slots.push(
            <div key={h} onClick={() => !isDisabled && !loading && setSelectedHour(h)} className={`relative p-3 rounded-lg border cursor-pointer transition-all min-h-[90px] flex flex-col justify-between ${isSelected ? 'border-blue-600 ring-2 ring-blue-200 bg-blue-100' : ''} ${isInRange ? 'bg-blue-50 border-blue-300' : ''} ${isDisabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'bg-white'}`}>
              <div className="flex justify-between items-center mb-1">
                <span className={`font-bold ${isPastHour ? 'text-gray-400' : 'text-gray-700'}`}>{h}:00</span>
                <span className="text-xs font-mono">{occupancy}/{POOL_CONFIG.MAX_CAPACITY_PER_HOUR}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div className={`h-2 rounded-full transition-all duration-500 ${percentFull > 80 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${percentFull}%` }}></div>
              </div>
            </div>
          );
      }
    }
    return <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">{slots}</div>;
  };

  const getBookingsForViewingHour = () => {
      if (viewingHour === null || !selectedDate) return [];
      return bookings.filter(b => b.date === selectedDate && b.hour === viewingHour && b.status === 'CONFIRMED');
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 relative">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold text-gray-800">{viewMode === 'DAILY' ? (isAdmin ? '👮 Tablero Control' : '📅 Nueva Reserva') : '🗓️ Disponibilidad Semanal'}</h2>
          <div className="flex bg-gray-100 p-1 rounded-lg">
              <button onClick={() => setViewMode('DAILY')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'DAILY' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>Vista Diaria</button>
              <button onClick={() => setViewMode('WEEKLY')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'WEEKLY' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>Ver Semana</button>
          </div>
      </div>
      
      {viewMode === 'WEEKLY' ? <WeeklySchedule bookings={bookings} user={user} /> : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Fecha</label>
                  <input type="date" value={selectedDate} min={isAdmin ? undefined : getLocalTodayDate()} onChange={handleDateChange} className="w-full border rounded-md p-2" />
                </div>
                {!isAdmin && (
                    <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad de Personas</label>
                          <select value={headCount} onChange={(e) => setHeadCount(Number(e.target.value))} className="w-full border rounded-md p-2" disabled={user.role === UserRole.INDIVIDUAL}>
                              {[1, 2, 3, 4, 5, 10, 15, 20].map(n => <option key={n} value={n}>{n} persona{n > 1 ? 's' : ''}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Duración (Horas)</label>
                          <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full border rounded-md p-2">
                              {[1, 2, 3, 4].map(h => <option key={h} value={h}>{h} Hora{h > 1 ? 's' : ''}</option>)}
                          </select>
                        </div>
                    </>
                )}
            </div>

            <div className="mb-6">{renderSlots()}</div>
            {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">⚠️ {error}</div>}
            {success && (
                <div className="mb-6 p-6 bg-green-50 rounded-xl border-2 border-green-200 flex flex-col items-center animate-fade-in">
                    <div className="flex items-center gap-3 mb-4">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        <span className="font-bold text-green-800 text-lg">{success.msg}</span>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-md border border-gray-100 flex flex-col items-center">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Pase de Acceso Albrook</p>
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${success.code}`} className="w-32 h-32 mb-2" alt="QR" />
                        <div className="text-center">
                            <p className="text-xs font-mono text-gray-600">{success.code}</p>
                            <p className="text-sm font-black text-blue-700">CARRILES: {success.lanes}</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setSuccess(null)} className="mt-4">Cerrar</Button>
                </div>
            )}
            {!isAdmin && (
                <div className="flex justify-end">
                    <Button disabled={!selectedDate || selectedHour === null || loading} onClick={handlePreValidation} className="w-full md:w-auto">
                        {loading ? 'Procesando...' : 'Reservar'}
                    </Button>
                </div>
            )}
          </>
      )}

      {showConfirmModal && pendingAssignment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-50">
              <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 border-t-4 border-blue-500">
                  <h3 className="text-xl font-bold text-gray-900 text-center">Confirmar Reserva</h3>
                  <p className="text-center text-xs text-blue-600 font-bold mt-1">CARRILES ASIGNADOS: {pendingAssignment.lanes}</p>
                  <div className="bg-blue-50 p-4 rounded-lg my-6 space-y-2">
                      <div className="flex justify-between"><span className="text-gray-600">Fecha:</span><span className="font-bold">{selectedDate}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Horario:</span><span className="font-bold">{selectedHour}:00 - {selectedHour! + duration}:00</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Personas:</span><span className="font-bold">{headCount}</span></div>
                  </div>
                  <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setShowConfirmModal(false)} className="w-full">Cancelar</Button>
                      <Button variant="primary" onClick={finalizeBooking} className="w-full">Confirmar</Button>
                  </div>
              </div>
          </div>
      )}

      {viewingHour !== null && isAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-50">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-0 overflow-hidden">
                  <div className="bg-blue-700 text-white p-4 flex justify-between items-center">
                      <div><h3 className="text-lg font-bold">Detalle Ocupación</h3><p className="text-xs">{selectedDate} | {viewingHour}:00</p></div>
                      <button onClick={() => setViewingHour(null)}>✕</button>
                  </div>
                  <div className="p-4 max-h-96 overflow-y-auto">
                      {getBookingsForViewingHour().map(b => (
                          <div key={b.id} className="flex justify-between items-center p-3 bg-gray-50 rounded mb-2">
                              <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold">{b.userName.charAt(0)}</div>
                                  <div>
                                      <p className="font-bold text-sm">{b.userName}</p>
                                      <p className="text-[10px] bg-blue-600 text-white px-1 rounded inline-block">Carriles: {b.laneNumbers}</p>
                                  </div>
                              </div>
                              <p className="font-bold">{b.headCount} pax</p>
                          </div>
                      ))}
                  </div>
                  <div className="p-4 bg-gray-50 text-right"><Button variant="outline" size="sm" onClick={() => setViewingHour(null)}>Cerrar</Button></div>
              </div>
          </div>
      )}
    </div>
  );
};
