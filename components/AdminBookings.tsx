
import React, { useState, useEffect } from 'react';
import { Booking, UserRole } from '../types';
import { getBookings, updateBookingStatus, deleteBooking, getAllUsers } from '../services/storageService';
import { sendSMS } from '../services/smsService';
import { Button } from './Button';

export const AdminBookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewQR, setViewQR] = useState<string | null>(null);
  
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await getBookings();
    const sorted = data.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return a.hour - b.hour;
    });
    setBookings(sorted);
    setLoading(false);
  };

  const handleStatusChange = async (id: string, newStatus: 'CONFIRMED' | 'CANCELLED') => {
      const booking = bookings.find(b => b.id === id);
      await updateBookingStatus(id, newStatus);
      if (newStatus === 'CANCELLED' && booking) {
          try {
              const allUsers = await getAllUsers();
              const user = allUsers.find(u => u.id === booking.userId);
              if (user && user.phone) {
                  await sendSMS(
                      user.phone,
                      `Albrook Pool: Su reserva (${booking.bookingCode}) ha sido CANCELADA.`
                  );
              }
          } catch (err) { console.error(err); }
      }
      await loadData();
  };

  const handleDelete = async (id: string) => {
      if (!window.confirm("¿Eliminar reserva permanentemente?")) return;
      await deleteBooking(id);
      await loadData();
  };

  const filteredBookings = bookings.filter(b => {
      if (filterDate && b.date !== filterDate) return false;
      if (filterRole !== 'ALL') {
          const currentRole = String(b.userRole || '').trim().toUpperCase();
          const targetRole = String(filterRole).trim().toUpperCase();
          if (currentRole !== targetRole) return false;
      }
      if (filterStatus !== 'ALL' && b.status !== filterStatus) return false;
      return true;
  });

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">📅 Gestión de Reservas</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fecha</label>
              <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full border-gray-300 rounded text-sm p-2" />
          </div>
          <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rol</label>
              <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="w-full border-gray-300 rounded text-sm p-2">
                  <option value="ALL">Todos</option>
                  <option value={UserRole.INDIVIDUAL}>Individuales</option>
                  <option value={UserRole.PRINCIPAL}>Principales</option>
                  <option value={UserRole.DEPENDENT}>Dependientes</option>
              </select>
          </div>
          <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estado</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full border-gray-300 rounded text-sm p-2">
                  <option value="ALL">Todos</option>
                  <option value="CONFIRMED">Confirmados</option>
                  <option value="CANCELLED">Cancelados</option>
              </select>
          </div>
          <div className="flex items-end">
              <button onClick={() => { setFilterDate(''); setFilterRole('ALL'); setFilterStatus('ALL'); }} className="text-sm text-blue-600 underline pb-2">Limpiar</button>
          </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Reserva / Código</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Usuario / Carriles</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">QR</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Pax</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Estado</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
             {filteredBookings.map(booking => (
                 <tr key={booking.id} className="hover:bg-gray-50">
                     <td className="px-6 py-4 whitespace-nowrap text-sm">
                         <div className="font-bold text-gray-900">{booking.date}</div>
                         <div className="text-xs text-gray-500">{booking.hour}:00 | {booking.bookingCode?.split('-').pop()}</div>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm">
                         <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">{booking.userName.charAt(0)}</div>
                            <div>
                                <div className="font-bold text-gray-800">{booking.userName}</div>
                                <span className="text-[10px] px-1 py-0.5 rounded bg-indigo-600 text-white font-bold uppercase">Carriles: {booking.laneNumbers}</span>
                            </div>
                         </div>
                     </td>
                     <td className="px-6 py-4">
                        <button onClick={() => setViewQR(booking.bookingCode || null)} className="text-gray-400 hover:text-blue-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg></button>
                     </td>
                     <td className="px-6 py-4 text-sm text-gray-500">{booking.headCount} pax</td>
                     <td className="px-6 py-4 text-sm">
                         <span className={`px-2 inline-flex text-xs font-semibold rounded-full ${booking.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{booking.status}</span>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                         {booking.status === 'CONFIRMED' && <button onClick={() => handleStatusChange(booking.id, 'CANCELLED')} className="text-orange-600 hover:underline">Cancelar</button>}
                         <button onClick={() => handleDelete(booking.id)} className="text-red-600 hover:underline">Borrar</button>
                     </td>
                 </tr>
             ))}
          </tbody>
        </table>
      </div>

      {viewQR && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60" onClick={() => setViewQR(null)}>
              <div className="bg-white p-6 rounded-2xl flex flex-col items-center shadow-xl" onClick={e => e.stopPropagation()}>
                  <p className="font-bold text-gray-800 mb-2 uppercase text-xs tracking-widest">Verificación Administrativa</p>
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${viewQR}`} className="w-48 h-48 mb-4 border border-gray-100 shadow-sm" alt="QR" />
                  <p className="font-mono text-xs text-gray-500">{viewQR}</p>
                  <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => setViewQR(null)}>Cerrar</Button>
              </div>
          </div>
      )}
    </div>
  );
};
