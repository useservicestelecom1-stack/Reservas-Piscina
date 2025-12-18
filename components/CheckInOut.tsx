
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
  const [showQR, setShowQR] = useState<string | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'CHECK_IN' | 'CHECK_OUT';
    bookingId: string;
    userName: string;
    lanes?: string;
  } | null>(null);

  const [lapsInput, setLapsInput] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    refreshData();
  }, []);

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
    const localToday = getLocalTodayDate();
    
    let relevantBookings = allBookings
      .filter(b => b.date === localToday && b.status === 'CONFIRMED');

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

  const executeCheckIn = async (bookingId: string) => {
    setLoading(true);
    try {
        const checkInTime = new Date().toISOString();
        const newLog: AccessLog = {
            id: crypto.randomUUID(),
            bookingId: bookingId,
            checkInTime: checkInTime,
            checkOutTime: null
        };
        await saveLog(newLog);
        await refreshData();
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const executeCheckOut = async (bookingId: string, lapsInput: number) => {
    setLoading(true);
    try {
        const checkOutTime = new Date().toISOString();
        const existingLog = logs.find(l => l.bookingId === bookingId);
        if (existingLog) {
            await saveLog({
                ...existingLog,
                checkOutTime: checkOutTime,
                laps: lapsInput
            });
        }
        await refreshData();
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const promptCheckIn = (bookingId: string, userName: string, lanes?: string) => {
      setConfirmDialog({ isOpen: true, type: 'CHECK_IN', bookingId, userName, lanes });
  };

  const promptCheckOut = (bookingId: string, userName: string) => {
      setLapsInput(0);
      setConfirmDialog({ isOpen: true, type: 'CHECK_OUT', bookingId, userName });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 relative">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">⏱️ Control de Acceso</h2>
            <p className="text-sm text-gray-500">Gestión de llegada y carriles</p>
        </div>
        <div className="text-lg font-mono text-blue-600 bg-blue-50 px-3 py-1 rounded">{now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hora</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario / Carriles</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código / Pax</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {todayBookings.map((booking) => {
                const log = getLogForBooking(booking.id);
                const isCheckedIn = !!log?.checkInTime;
                const isCheckedOut = !!log?.checkOutTime;
                const currentHour = now.getHours();
                const isCurrentHour = currentHour === booking.hour;
                return (
                    <tr key={booking.id} className={isCurrentHour ? 'bg-blue-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{booking.hour}:00</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">{booking.userName.charAt(0)}</div>
                                <div>
                                    <div className="font-bold text-gray-900">{booking.userName}</div>
                                    <span className="text-[10px] px-1 py-0.5 rounded bg-blue-100 text-blue-700 font-bold uppercase">Carriles: {booking.laneNumbers}</span>
                                </div>
                            </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center gap-2">
                                <button onClick={() => setShowQR(booking.bookingCode || null)} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg></button>
                                <div><div className="text-xs font-mono text-gray-400">{booking.bookingCode?.split('-').pop()}</div><div className="font-bold text-gray-700">{booking.headCount} pax</div></div>
                            </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {isCheckedOut ? 'Finalizado' : isCheckedIn ? 'En Piscina' : 'Pendiente'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                            {!isCheckedIn && <Button size="sm" onClick={() => promptCheckIn(booking.id, booking.userName, booking.laneNumbers)}>Entrada</Button>}
                            {isCheckedIn && !isCheckedOut && <Button variant="danger" size="sm" onClick={() => promptCheckOut(booking.id, booking.userName)}>Salida</Button>}
                        </td>
                    </tr>
                );
            })}
          </tbody>
        </table>
      </div>

      {showQR && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-70" onClick={() => setShowQR(null)}>
              <div className="bg-white p-6 rounded-2xl flex flex-col items-center shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
                  <p className="font-bold text-gray-800 mb-4 uppercase text-sm tracking-widest">Código de Acceso</p>
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${showQR}`} className="w-56 h-56 mb-4 shadow-sm border border-gray-100" alt="QR Access" />
                  <p className="font-mono text-blue-600 font-bold">{showQR}</p>
                  <Button variant="outline" size="sm" className="mt-6 w-full" onClick={() => setShowQR(null)}>Cerrar</Button>
              </div>
          </div>
      )}

      {confirmDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-50">
              <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 animate-fade-in-up">
                  <div className="text-center">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{confirmDialog.type === 'CHECK_IN' ? 'Confirmar Entrada' : 'Confirmar Salida'}</h3>
                      {confirmDialog.type === 'CHECK_IN' && (
                          <div className="my-4 py-2 bg-blue-50 border border-blue-200 rounded text-blue-800">
                             <p className="text-xs uppercase font-bold">CARRILES ASIGNADOS</p>
                             <p className="text-2xl font-black">{confirmDialog.lanes}</p>
                          </div>
                      )}
                      <p className="text-sm text-gray-500 mb-4">Registro para <strong>{confirmDialog.userName}</strong>.</p>
                      {confirmDialog.type === 'CHECK_OUT' && (
                          <div className="mb-4 text-left bg-blue-50 p-3 rounded-lg border border-blue-200">
                              <label className="block text-sm font-bold text-gray-700 mb-1">🏊 Piscinas nadadas</label>
                              <input type="number" min="0" value={lapsInput} onChange={(e) => setLapsInput(Number(e.target.value))} className="w-full border-gray-300 rounded-md p-2 text-center text-lg font-bold text-blue-800" />
                          </div>
                      )}
                  </div>
                  <div className="flex justify-center gap-3">
                      <Button variant="outline" onClick={() => setConfirmDialog(null)} className="w-full">Cancelar</Button>
                      <Button variant={confirmDialog.type === 'CHECK_IN' ? 'primary' : 'danger'} onClick={() => { if(confirmDialog.type === 'CHECK_IN') executeCheckIn(confirmDialog.bookingId); else executeCheckOut(confirmDialog.bookingId, lapsInput); setConfirmDialog(null); }} className="w-full">Confirmar</Button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
