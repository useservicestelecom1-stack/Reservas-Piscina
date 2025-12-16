import React, { useState, useEffect } from 'react';
import { Booking, UserRole } from '../types';
import { getBookings, updateBookingStatus, deleteBooking, getAllUsers } from '../services/storageService';
import { sendSMS } from '../services/smsService';
import { Button } from './Button';

export const AdminBookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await getBookings();
    // Sort by Date (Descending - Newest first) then by Hour
    const sorted = data.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return a.hour - b.hour;
    });
    setBookings(sorted);
    setLoading(false);
  };

  const handleStatusChange = async (id: string, newStatus: 'CONFIRMED' | 'CANCELLED') => {
      // Find booking and user info before update for SMS
      const booking = bookings.find(b => b.id === id);
      
      await updateBookingStatus(id, newStatus);
      
      // Send SMS on Cancellation
      if (newStatus === 'CANCELLED' && booking) {
          try {
              // We need to fetch the full user object to get the phone number
              const allUsers = await getAllUsers();
              const user = allUsers.find(u => u.id === booking.userId);
              
              if (user && user.phone) {
                  await sendSMS(
                      user.phone,
                      `Albrook Pool: Su reserva del ${booking.date} a las ${booking.hour}:00 ha sido CANCELADA por administración.`
                  );
              }
          } catch (err) {
              console.error("Error enviando SMS de cancelación", err);
          }
      }

      await loadData();
  };

  const handleDelete = async (id: string) => {
      if (!window.confirm("¿Estás seguro de eliminar esta reserva permanentemente?")) return;
      await deleteBooking(id);
      await loadData();
  };

  const filteredBookings = bookings.filter(b => {
      if (filterDate && b.date !== filterDate) return false;
      
      if (filterRole !== 'ALL') {
          // Robust comparison: handle nulls/undefined and case sensitivity
          const currentRole = String(b.userRole || '').trim().toUpperCase();
          const targetRole = String(filterRole).trim().toUpperCase();
          if (currentRole !== targetRole) return false;
      }
      
      if (filterStatus !== 'ALL' && b.status !== filterStatus) return false;
      return true;
  });

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">📅 Gestión General de Reservas</h2>

      {/* Filters Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Filtrar por Fecha</label>
              <input 
                  type="date" 
                  value={filterDate} 
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full border-gray-300 rounded text-sm p-2"
              />
          </div>
          <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Filtrar por Rol</label>
              <select 
                  value={filterRole} 
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="w-full border-gray-300 rounded text-sm p-2"
              >
                  <option value="ALL">Todos los Roles</option>
                  <option value={UserRole.INDIVIDUAL}>Individuales</option>
                  <option value={UserRole.PRINCIPAL}>Principales (Titulares)</option>
                  <option value={UserRole.DEPENDENT}>Dependientes</option>
                  <option value={UserRole.ADMIN}>Administradores</option>
              </select>
          </div>
          <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Filtrar por Estado</label>
              <select 
                  value={filterStatus} 
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full border-gray-300 rounded text-sm p-2"
              >
                  <option value="ALL">Todos</option>
                  <option value="CONFIRMED">Confirmados</option>
                  <option value="CANCELLED">Cancelados</option>
              </select>
          </div>
          <div className="flex items-end">
              <button 
                onClick={() => { setFilterDate(''); setFilterRole('ALL'); setFilterStatus('ALL'); }}
                className="text-sm text-blue-600 hover:text-blue-800 underline pb-2"
              >
                  Limpiar Filtros
              </button>
          </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha / Hora</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Usuario</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Pax</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
             {loading ? (
                 <tr><td colSpan={5} className="p-4 text-center">Cargando...</td></tr>
             ) : filteredBookings.length === 0 ? (
                 <tr><td colSpan={5} className="p-4 text-center text-gray-500">No se encontraron reservas con estos filtros.</td></tr>
             ) : (
                 filteredBookings.map(booking => (
                     <tr key={booking.id} className="hover:bg-gray-50">
                         <td className="px-6 py-4 whitespace-nowrap">
                             <div className="text-sm font-medium text-gray-900">{booking.date}</div>
                             <div className="text-sm text-gray-500">{booking.hour}:00 - {booking.hour + 1}:00</div>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap">
                             <div className="text-sm font-bold text-gray-800">{booking.userName}</div>
                             <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                 {booking.userRole}
                             </span>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                             {booking.headCount} pers.
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap">
                             <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                ${booking.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                 {booking.status === 'CONFIRMED' ? 'CONFIRMADO' : 'CANCELADO'}
                             </span>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                             {booking.status === 'CONFIRMED' && (
                                 <button 
                                    onClick={() => handleStatusChange(booking.id, 'CANCELLED')}
                                    className="text-orange-600 hover:text-orange-900 bg-orange-50 px-2 py-1 rounded"
                                 >
                                     Cancelar
                                 </button>
                             )}
                             <button 
                                onClick={() => handleDelete(booking.id)}
                                className="text-red-600 hover:text-red-900 bg-red-50 px-2 py-1 rounded"
                             >
                                 Borrar
                             </button>
                         </td>
                     </tr>
                 ))
             )}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 text-right text-xs text-gray-500">
          Mostrando {filteredBookings.length} reservas.
      </div>
    </div>
  );
};