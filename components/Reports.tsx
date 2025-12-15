import React, { useState, useEffect } from 'react';
import { getBookings, getLogs } from '../services/storageService';
import { generatePoolReport } from '../services/geminiService';
import { Booking, AccessLog } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from './Button';

export const Reports: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [aiReport, setAiReport] = useState<string>('');
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    prepareChartData();
  }, []);

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
    })).filter((_, idx) => idx !== 0 && idx !== 1);

    setChartData(data);
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    const bookings = await getBookings();
    const logs = await getLogs();
    
    const range = "Últimos 30 días";
    
    const html = await generatePoolReport(bookings, logs, range);
    setAiReport(html);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
       {/* Visual Stats */}
       <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">📊 Ocupación Semanal (Personas)</h2>
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
                        <Bar dataKey="Personas" fill="#3b82f6" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
       </div>

       {/* AI Report Section */}
       <div className="bg-white rounded-lg shadow p-6 border-t-4 border-purple-500">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">✨ Reporte Inteligente (Gemini AI)</h2>
                    <p className="text-sm text-gray-500">Análisis cualitativo de asistencia y recomendaciones.</p>
                </div>
                <Button onClick={handleGenerateReport} disabled={loading} variant="secondary">
                    {loading ? 'Generando...' : 'Generar Análisis'}
                </Button>
            </div>

            {aiReport ? (
                <div 
                    className="prose prose-sm max-w-none p-4 bg-gray-50 rounded-lg border border-gray-200"
                    dangerouslySetInnerHTML={{ __html: aiReport }}
                />
            ) : (
                <div className="text-center py-8 text-gray-400 italic">
                    Presiona el botón para analizar los datos de la piscina.
                </div>
            )}
       </div>
    </div>
  );
};