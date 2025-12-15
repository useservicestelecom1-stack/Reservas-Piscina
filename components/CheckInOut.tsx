import React, { useState, useEffect } from 'react';
import { Booking, AccessLog, User, UserRole } from '../types';
import { getBookings, getLogs, saveLog } from '../services/storageService';
import { Button } from './Button';

interface CheckInOutProps {
    user: User;
}

export const CheckInOut: React.FC<CheckInOutProps> = ({ user }) => {
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(false);

  // Confirmation Modal State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'CHECK_IN' | 'CHECK_OUT';
    bookingId: string;
    userName: string;
  } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    refreshData();
  }, []);

  // Use the same date generation logic as BookingCalendar to ensure matches
  const getLocalTodayDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const refreshData = async () => {
    setLoading(true);
    const allBookings = await getBookings();
    const allLogs = await getLogs();
    
    // Filter for Today using robust string matching
    const localToday = getLocalTodayDate();
    
    let relevantBookings = allBookings
      .filter(b => b.date === localToday && b.status === 'CONFIRMED');

    // If NOT admin, only show my own bookings
    if (user.role !== UserRole.ADMIN) {
        relevantBookings = relevantBookings.filter(b => b.userId === user.id);
    }

    const sorted = relevantBookings.sort((a, b) => a.hour - b.hour);

    setTodayBookings(sorted);
    setLogs(allLogs);
    setLoading(false);
  };

  const getLogForBooking = (bookingId: string) => {
    return logs.find(l => l.bookingId === bookingId);
  };

  // --- Action Handlers (Logic only) ---

  const executeCheckIn = async (bookingId: string) => {
    const existingLog = getLogForBooking(bookingId);
    if (existingLog) return; 

    // Generate specific ID for Supabase compatibility
    const newLogId = crypto.randomUUID();

    const newLog: AccessLog = {
      id: newLogId,
      bookingId,
      checkInTime: new Date().toISOString(),
      checkOutTime: null
    };
    await saveLog(newLog);
    refreshData();
  };

  const executeCheckOut = async (bookingId: string) => {
    const existingLog = getLogForBooking(bookingId);
    if (!existingLog) return;

    const updatedLog: AccessLog = {
      ...existingLog,
      checkOutTime: new Date().toISOString()
    };
    await saveLog(updatedLog);
    refreshData();
  };

  // --- Interaction Handlers (UI triggers) ---

  const promptCheckIn = (bookingId: string, userName: string) => {
      setConfirmDialog({
          isOpen: true,
          type: 'CHECK_IN',
          bookingId,
          userName
      });
  };

  const promptCheckOut = (bookingId: string, userName: string) => {
      setConfirmDialog({
          isOpen: true,
          type: 'CHECK_OUT',
          bookingId,
          userName
      });
  };

  const handleConfirmAction = async () => {
      if (!confirmDialog) return;

      if (confirmDialog.type === 'CHECK_IN') {
          await executeCheckIn(confirmDialog.bookingId);
      } else {
          await executeCheckOut(confirmDialog.bookingId);
      }
      setConfirmDialog(null);
  };

  const handleCancelAction = () => {
      setConfirmDialog(null);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 relative">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">⏱️ Control de Acceso</h2>
            <p className="text-sm text-gray-500">
                {user.role === UserRole.ADMIN ? 'Vista de Administrador (Todos los usuarios)' : 'Reporte su entrada y salida'}
            </p>
        </div>
        <div className="text-lg font-mono text-blue-600 bg-blue-50 px-3 py-1 rounded">
            {now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hora</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detalle</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Personas</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center">Cargando datos...</td></tr>
            ) : todayBookings.length === 0 ? (
                <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        {user.role === UserRole.ADMIN ? 'No hay reservas para hoy.' : 'No tienes reservas activas para hoy.'}
                    </td>
                </tr>
            ) : (
                todayBookings.map((booking) => {
                    const log = getLogForBooking(booking.id);
                    const isCheckedIn = !!log?.checkInTime;
                    const isCheckedOut = !!log?.checkOutTime;
                    
                    const currentHour = now.getHours();
                    const isCurrentHour = currentHour === booking.hour;
                    const isPast = currentHour > booking.hour;
                    
                    return (
                        <tr key={booking.id} className={isCurrentHour ? 'bg-blue-50' : ''}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {booking.hour}:00
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div className="font-medium text-gray-900">{booking.userName}</div>
                                {user.role === UserRole.ADMIN && <div className="text-xs text-gray-400">{booking.userRole}</div>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {booking.headCount}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                {isCheckedOut ? (
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                        Finalizado
                                    </span>
                                ) : isCheckedIn ? (
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 animate-pulse">
                                        En Piscina
                                    </span>
                                ) : isCurrentHour ? (
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 font-bold">
                                        Check-In Abierto
                                    </span>
                                ) : isPast ? (
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                        Retrasado
                                    </span>
                                ) : (
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                        Pendiente
                                    </span>
                                )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                {!isCheckedIn && (
                                    <Button 
                                        size="sm" 
                                        onClick={() => promptCheckIn(booking.id, booking.userName)}
                                        // Allow check-in if it is current hour or past hour (late arrival), but not future
                                        disabled={currentHour < booking.hour}
                                        className={currentHour < booking.hour ? 'opacity-50 cursor-not-allowed' : ''}
                                    >
                                        Marcar Entrada
                                    </Button>
                                )}
                                {isCheckedIn && !isCheckedOut && (
                                    <Button variant="danger" size="sm" onClick={() => promptCheckOut(booking.id, booking.userName)}>
                                        Marcar Salida
                                    </Button>
                                )}
                                {isCheckedOut && (
                                    <span className="text-gray-400 text-xs">
                                        Salida: {new Date(log!.checkOutTime!).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                    </span>
                                )}
                            </td>
                        </tr>
                    );
                })
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal */}
      {confirmDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-50">
              <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 animate-fade-in-up">
                  <div className="text-center">
                      <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${
                          confirmDialog.type === 'CHECK_IN' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                          {confirmDialog.type === 'CHECK_IN' ? (
                              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg>
                          ) : (
                              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                          )}
                      </div>
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">
                          {confirmDialog.type === 'CHECK_IN' ? 'Confirmar Entrada' : 'Confirmar Salida'}
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                          ¿Está seguro de que desea registrar la {confirmDialog.type === 'CHECK_IN' ? 'entrada' : 'salida'} de <strong>{confirmDialog.userName}</strong>?
                      </p>
                  </div>
                  <div className="flex justify-center gap-3 mt-4">
                      <Button variant="outline" onClick={handleCancelAction} className="w-full">
                          Cancelar
                      </Button>
                      <Button 
                        variant={confirmDialog.type === 'CHECK_IN' ? 'primary' : 'danger'} 
                        onClick={handleConfirmAction} 
                        className="w-full"
                      >
                          Confirmar
                      </Button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};