import React, { useState, useEffect } from 'react';
import { getBookings, getLogs } from '../services/storageService';
import { generatePoolReport } from '../services/geminiService';
import { Booking, AccessLog } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from './Button';

type StatsMode = 'DAILY' | 'WEEKLY' | 'MONTHLY';

interface StatRow {
  label: string; // "05:00" or "2023-10-25"
  reservedPax: number;
  actualPax: number;
  occupancyRate: number; // Based on actual vs max capacity or just generic
}

interface SummaryMetrics {
  totalReserved: number;
  totalActual: number;
  attendanceRate: number;
  noShowRate: number;
}

export const Reports: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [aiReport, setAiReport] = useState<string>('');
  
  // Stats State
  const [statsMode, setStatsMode] = useState<StatsMode>('DAILY');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [statRows, setStatRows] = useState<StatRow[]>([]);
  const [metrics, setMetrics] = useState<SummaryMetrics>({ totalReserved: 0, totalActual: 0, attendanceRate: 0, noShowRate: 0 });
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    calculateStats();
    prepareChartData();
  }, [selectedDate, statsMode]);

  const prepareChartData = async () => {
    const bookings = await getBookings();
    
    const days = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
    const counts = [0, 0, 0, 0, 0, 0, 0];

    bookings.forEach(b => {
        const [yy, mm, dd] = b.date.split('-').map(Number);
        const localDate = new Date(yy, mm - 1, dd);
        counts[localDate.getDay()] += b.headCount;
    });

    const data = days.map((day, idx) => ({
        name: day,
        Personas: counts[idx]
    })).filter((_, idx) => idx !== 0 && idx !== 1); // Optional: filter days if needed

    setChartData(data);
  };

  const calculateStats = async () => {
      const [bookings, logs] = await Promise.all([getBookings(), getLogs()]);
      
      // Filter logic
      let filteredBookings: Booking[] = [];
      const rows: StatRow[] = [];

      const targetDate = new Date(selectedDate);
      const targetY = targetDate.getFullYear();
      const targetM = targetDate.getMonth();
      const targetD = targetDate.getDate();

      if (statsMode === 'DAILY') {
          // Filter exact date
          filteredBookings = bookings.filter(b => b.date === selectedDate && b.status === 'CONFIRMED');
          
          // Generate rows for hours 5 - 20
          for (let h = 5; h <= 20; h++) {
              const bookingsAtHour = filteredBookings.filter(b => b.hour === h);
              const reserved = bookingsAtHour.reduce((sum, b) => sum + b.headCount, 0);
              
              // Actual: Booking must have a log entry
              const actual = bookingsAtHour.reduce((sum, b) => {
                  const hasLog = logs.some(l => l.bookingId === b.id && l.checkInTime);
                  return sum + (hasLog ? b.headCount : 0);
              }, 0);

              rows.push({
                  label: `${h}:00`,
                  reservedPax: reserved,
                  actualPax: actual,
                  occupancyRate: 0 
              });
          }

      } else if (statsMode === 'WEEKLY') {
          // Calculate start/end of week (Mon-Sun)
          const day = targetDate.getDay(); 
          const diff = targetDate.getDate() - day + (day === 0 ? -6 : 1); 
          const monday = new Date(targetDate);
          monday.setDate(diff);

          // Iterate 7 days
          for (let i = 0; i < 7; i++) {
              const d = new Date(monday);
              d.setDate(monday.getDate() + i);
              const dStr = d.toISOString().split('T')[0];
              const dayName = d.toLocaleDateString('es-PA', { weekday: 'short' });

              const daysBookings = bookings.filter(b => b.date === dStr && b.status === 'CONFIRMED');
              const reserved = daysBookings.reduce((sum, b) => sum + b.headCount, 0);
              const actual = daysBookings.reduce((sum, b) => {
                  const hasLog = logs.some(l => l.bookingId === b.id && l.checkInTime);
                  return sum + (hasLog ? b.headCount : 0);
              }, 0);

              rows.push({
                  label: `${dayName} ${d.getDate()}`,
                  reservedPax: reserved,
                  actualPax: actual,
                  occupancyRate: 0
              });
              filteredBookings.push(...daysBookings);
          }

      } else if (statsMode === 'MONTHLY') {
          // Iterate all days in month
          const daysInMonth = new Date(targetY, targetM + 1, 0).getDate();
          
          for (let i = 1; i <= daysInMonth; i++) {
             const dStr = `${targetY}-${String(targetM + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
             
             const daysBookings = bookings.filter(b => b.date === dStr && b.status === 'CONFIRMED');
             const reserved = daysBookings.reduce((sum, b) => sum + b.headCount, 0);
             const actual = daysBookings.reduce((sum, b) => {
                 const hasLog = logs.some(l => l.bookingId === b.id && l.checkInTime);
                 return sum + (hasLog ? b.headCount : 0);
             }, 0);

             rows.push({
                 label: String(i),
                 reservedPax: reserved,
                 actualPax: actual,
                 occupancyRate: 0
             });
             filteredBookings.push(...daysBookings);
          }
      }

      // Calculate totals
      const totalReserved = rows.reduce((acc, r) => acc + r.reservedPax, 0);
      const totalActual = rows.reduce((acc, r) => acc + r.actualPax, 0);
      const rate = totalReserved > 0 ? (totalActual / totalReserved) * 100 : 0;
      
      setStatRows(rows);
      setMetrics({
          totalReserved,
          totalActual,
          attendanceRate: Math.round(rate),
          noShowRate: Math.round(100 - rate)
      });
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    const bookings = await getBookings();
    const logs = await getLogs();
    
    // Pass context based on current selection
    const range = `${statsMode} - ${selectedDate}`;
    
    const html = await generatePoolReport(bookings, logs, range);
    setAiReport(html);
    setLoading(false);
  };

  return (
    <div className="space-y-8">
       {/* --- NEW STATS DASHBOARD --- */}
       <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
           <div className="bg-blue-800 p-4 flex flex-col md:flex-row justify-between items-center text-white">
               <div>
                   <h2 className="text-xl font-bold">📈 Resumen de Operaciones</h2>
                   <p className="text-blue-200 text-sm">Comparativa de Reservas vs. Asistencia Real</p>
               </div>
               
               <div className="flex gap-2 mt-2 md:mt-0 bg-blue-900 p-1 rounded-lg">
                   {(['DAILY', 'WEEKLY', 'MONTHLY'] as StatsMode[]).map(mode => (
                       <button
                         key={mode}
                         onClick={() => setStatsMode(mode)}
                         className={`px-3 py-1 rounded text-xs font-bold transition-colors ${statsMode === mode ? 'bg-white text-blue-900 shadow' : 'text-blue-200 hover:text-white'}`}
                       >
                           {mode === 'DAILY' ? 'DIARIO' : mode === 'WEEKLY' ? 'SEMANAL' : 'MENSUAL'}
                       </button>
                   ))}
               </div>
           </div>

           <div className="p-6">
                {/* Filters */}
                <div className="mb-6 flex items-center gap-4">
                    <label className="font-bold text-gray-700">Seleccionar Fecha Ref:</label>
                    <input 
                        type="date" 
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="border border-gray-300 rounded p-2 text-sm"
                    />
                    <span className="text-xs text-gray-400">
                        {statsMode === 'WEEKLY' ? '(Seleccione cualquier día de la semana deseada)' : 
                         statsMode === 'MONTHLY' ? '(Seleccione cualquier día del mes deseado)' : ''}
                    </span>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                        <span className="text-xs text-blue-600 font-bold uppercase">Personas Reservadas</span>
                        <div className="text-2xl font-bold text-gray-800">{metrics.totalReserved}</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                        <span className="text-xs text-green-600 font-bold uppercase">Asistencia Real (Check-In)</span>
                        <div className="text-2xl font-bold text-gray-800">{metrics.totalActual}</div>
                    </div>
                    <div className="bg-indigo-50 p-4 rounded-lg border-l-4 border-indigo-500">
                        <span className="text-xs text-indigo-600 font-bold uppercase">Tasa de Asistencia</span>
                        <div className="text-2xl font-bold text-gray-800">{metrics.attendanceRate}%</div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
                        <span className="text-xs text-red-600 font-bold uppercase">No-Show (Ausentismo)</span>
                        <div className="text-2xl font-bold text-gray-800">{metrics.noShowRate}%</div>
                    </div>
                </div>

                {/* Detailed Table */}
                <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-4 py-3 text-left font-bold text-gray-600">{statsMode === 'DAILY' ? 'Hora' : 'Fecha'}</th>
                                <th className="px-4 py-3 text-right font-bold text-gray-600">Reservas (Pax)</th>
                                <th className="px-4 py-3 text-right font-bold text-gray-600">Asistencia (Pax)</th>
                                <th className="px-4 py-3 text-right font-bold text-gray-600">Cumplimiento</th>
                                <th className="px-4 py-3 text-center font-bold text-gray-600">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {statRows.map((row, idx) => {
                                // Skip empty rows for cleaner view if desired, or keep all
                                const percent = row.reservedPax > 0 ? Math.round((row.actualPax / row.reservedPax) * 100) : 0;
                                let barColor = 'bg-gray-200';
                                if (percent >= 80) barColor = 'bg-green-500';
                                else if (percent >= 50) barColor = 'bg-yellow-500';
                                else if (row.reservedPax > 0) barColor = 'bg-red-500';

                                return (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 font-medium text-gray-800">{row.label}</td>
                                        <td className="px-4 py-2 text-right text-gray-600">{row.reservedPax}</td>
                                        <td className="px-4 py-2 text-right font-bold text-gray-800">{row.actualPax}</td>
                                        <td className="px-4 py-2 text-right">
                                            {row.reservedPax > 0 ? `${percent}%` : '-'}
                                        </td>
                                        <td className="px-4 py-2">
                                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                                <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${percent}%` }}></div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="bg-gray-50 font-bold">
                            <tr>
                                <td className="px-4 py-3">TOTALES</td>
                                <td className="px-4 py-3 text-right">{metrics.totalReserved}</td>
                                <td className="px-4 py-3 text-right text-blue-700">{metrics.totalActual}</td>
                                <td className="px-4 py-3 text-right">{metrics.attendanceRate}%</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
           </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Visual Stats (Existing) */}
            <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-bold mb-4 text-gray-800">📊 Ocupación Histórica (Por día semana)</h2>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={chartData}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="Personas" fill="#3b82f6" name="Pax Reservados" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
            </div>

            {/* AI Report Section (Existing) */}
            <div className="bg-white rounded-lg shadow p-6 border-t-4 border-purple-500">
                    <div className="flex flex-col gap-2 mb-4">
                        <h2 className="text-lg font-bold text-gray-800">✨ Análisis IA de Tendencias</h2>
                        <p className="text-xs text-gray-500">Interpretación cualitativa de los datos mostrados.</p>
                        <Button onClick={handleGenerateReport} disabled={loading} variant="secondary" size="sm" className="mt-2">
                            {loading ? 'Generando...' : 'Generar Análisis con IA'}
                        </Button>
                    </div>

                    {aiReport ? (
                        <div 
                            className="prose prose-sm max-w-none p-4 bg-gray-50 rounded-lg border border-gray-200 max-h-64 overflow-y-auto"
                            dangerouslySetInnerHTML={{ __html: aiReport }}
                        />
                    ) : (
                        <div className="text-center py-8 text-gray-400 italic text-sm">
                            Presiona el botón para analizar los datos.
                        </div>
                    )}
            </div>
       </div>
    </div>
  );
};