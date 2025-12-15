import React, { useState, useEffect } from 'react';
import { getLogs, getBookings } from '../services/storageService';
import { AccessLog, Booking } from '../types';
import { Button } from './Button';

// Interface for the joined data
interface EnrichedLog {
  logId: string;
  userName: string;
  userRole: string;
  bookingDate: string;
  bookingHour: number;
  checkIn: string | null;
  checkOut: string | null;
  durationMinutes: number | null;
}

export const SystemLogs: React.FC = () => {
  const [logs, setLogs] = useState<EnrichedLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedLogs, fetchedBookings] = await Promise.all([
        getLogs(),
        getBookings()
      ]);

      // Create a map of bookings for fast lookup
      const bookingsMap = new Map<string, Booking>();
      fetchedBookings.forEach(b => bookingsMap.set(b.id, b));

      const enriched: EnrichedLog[] = fetchedLogs.map(log => {
        const booking = bookingsMap.get(log.bookingId);
        
        let duration = null;
        if (log.checkInTime && log.checkOutTime) {
          const start = new Date(log.checkInTime).getTime();
          const end = new Date(log.checkOutTime).getTime();
          duration = Math.round((end - start) / 60000); // Minutes
        }

        return {
          logId: log.id,
          userName: booking?.userName || 'Usuario Eliminado',
          userRole: booking?.userRole || 'N/A',
          bookingDate: booking?.date || 'N/A',
          bookingHour: booking?.hour ?? -1,
          checkIn: log.checkInTime,
          checkOut: log.checkOutTime,
          durationMinutes: duration
        };
      });

      // Sort by most recent Check-In
      enriched.sort((a, b) => {
        const timeA = a.checkIn ? new Date(a.checkIn).getTime() : 0;
        const timeB = b.checkIn ? new Date(b.checkIn).getTime() : 0;
        return timeB - timeA;
      });

      setLogs(enriched);
    } catch (error) {
      console.error("Error loading logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (isoString: string | null) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleString('es-PA', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const filteredLogs = logs.filter(l => 
    l.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.userRole.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const downloadCSV = () => {
    const headers = ['Usuario,Rol,Fecha Reserva,Hora Reserva,Check In,Check Out,Duracion (min)'];
    const rows = filteredLogs.map(l => 
      `"${l.userName}","${l.userRole}","${l.bookingDate}","${l.bookingHour}:00","${l.checkIn || ''}","${l.checkOut || ''}","${l.durationMinutes || ''}"`
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "albrook_logs_accesos.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-800">🗄️ Bitácora de Accesos</h2>
           <p className="text-sm text-gray-500">Historial completo de entradas y salidas registradas en el sistema.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
           <input 
             type="text" 
             placeholder="Buscar usuario..." 
             className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
           />
           <Button variant="outline" size="sm" onClick={downloadCSV}>Descargar CSV</Button>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Usuario / Rol</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Reserva</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Entrada (Check-In)</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Salida (Check-Out)</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Duración</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Cargando bitácora...</td></tr>
            ) : filteredLogs.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No se encontraron registros.</td></tr>
            ) : (
                filteredLogs.map((log) => (
                    <tr key={log.logId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-bold text-gray-900">{log.userName}</div>
                            <div className="text-xs text-gray-500">{log.userRole}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                             <div className="text-sm text-gray-700">{log.bookingDate}</div>
                             <div className="text-xs text-gray-500">Horario: {log.bookingHour}:00</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm font-mono text-green-700 bg-green-50 px-2 py-1 rounded">
                                {formatDateTime(log.checkIn)}
                            </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                            {log.checkOut ? (
                                <span className="text-sm font-mono text-red-700 bg-red-50 px-2 py-1 rounded">
                                    {formatDateTime(log.checkOut)}
                                </span>
                            ) : (
                                <span className="text-xs text-yellow-600 font-bold bg-yellow-50 px-2 py-1 rounded-full animate-pulse">
                                    EN CURSO
                                </span>
                            )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {log.durationMinutes !== null ? `${log.durationMinutes} min` : '-'}
                        </td>
                    </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-2 text-right text-xs text-gray-400">
         Mostrando {filteredLogs.length} registros.
      </div>
    </div>
  );
};