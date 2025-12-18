
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { getSwimmerStats, getLeaderboard, PersonalStats, RankingItem } from '../services/storageService';
import { Button } from './Button';

interface Props {
    user: User;
}

export const SwimmerRanking: React.FC<Props> = ({ user }) => {
    const [stats, setStats] = useState<PersonalStats | null>(null);
    const [ranking, setRanking] = useState<RankingItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [user.id]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [personal, leaderboard] = await Promise.all([
                getSwimmerStats(user.id),
                getLeaderboard()
            ]);
            setStats(personal);
            setRanking(leaderboard);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const getMedal = (rank: number) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return <span className="text-gray-400 font-mono">#{rank}</span>;
    };

    const formatDistance = (meters: number) => {
        if (meters >= 1000) {
            return `${(meters / 1000).toFixed(1)} km`;
        }
        return `${meters} m`;
    };

    const formatTime = (minutes: number) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        if (h > 0) return `${h}h ${m}m`;
        return `${m} min`;
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            
            <div className="bg-gradient-to-r from-cyan-600 to-blue-700 p-6 rounded-lg shadow-lg text-white mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold flex items-center gap-3">
                        🏊‍♂️ Ranking de Nadadores
                    </h1>
                    <p className="text-blue-100 opacity-90 mt-2">
                        Visualiza tu progreso y compite amistosamente por el top de la piscina. (Largo: 50m)
                    </p>
                </div>
                <Button variant="secondary" onClick={loadData} disabled={loading}>
                    {loading ? 'Actualizando...' : '🔄 Refrescar'}
                </Button>
            </div>

            {loading && !stats ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">Calculando brazadas...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    <div className="lg:col-span-1 space-y-4">
                        <h2 className="text-xl font-bold text-gray-800 border-l-4 border-blue-500 pl-3">
                            Mis Estadísticas
                        </h2>
                        
                        <div className="bg-white rounded-lg shadow p-5 border border-blue-100 hover:shadow-md transition-shadow">
                            <h3 className="text-xs uppercase font-bold text-gray-500 mb-1">Esta Semana</h3>
                            <div className="flex justify-between items-end">
                                <div>
                                    <div className="text-3xl font-extrabold text-blue-600">
                                        {stats?.weeklyLaps} <span className="text-sm font-normal text-gray-400">pisc.</span>
                                    </div>
                                    <div className="text-sm text-gray-600 font-semibold mt-1">
                                        {stats ? formatDistance(stats.weeklyMeters) : '0 m'}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="block text-xs text-gray-400 uppercase">Tiempo</span>
                                    <span className="font-mono text-lg text-blue-800">
                                        {stats ? formatTime(stats.weeklyTimeMinutes) : '0m'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow p-5 border border-blue-100 hover:shadow-md transition-shadow">
                            <h3 className="text-xs uppercase font-bold text-gray-500 mb-1">Este Mes</h3>
                            <div className="flex justify-between items-end">
                                <div>
                                    <div className="text-3xl font-extrabold text-blue-600">
                                        {stats?.monthlyLaps} <span className="text-sm font-normal text-gray-400">pisc.</span>
                                    </div>
                                    <div className="text-sm text-gray-600 font-semibold mt-1">
                                        {stats ? formatDistance(stats.monthlyMeters) : '0 m'}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="block text-xs text-gray-400 uppercase">Tiempo</span>
                                    <span className="font-mono text-lg text-blue-800">
                                        {stats ? formatTime(stats.monthlyTimeMinutes) : '0m'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow p-5 border border-blue-100 hover:shadow-md transition-shadow">
                            <h3 className="text-xs uppercase font-bold text-gray-500 mb-1">Año Actual</h3>
                            <div className="flex justify-between items-end">
                                <div>
                                    <div className="text-3xl font-extrabold text-blue-600">
                                        {stats?.yearlyLaps} <span className="text-sm font-normal text-gray-400">pisc.</span>
                                    </div>
                                    <div className="text-sm text-gray-600 font-semibold mt-1">
                                        {stats ? formatDistance(stats.yearlyMeters) : '0 m'}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="block text-xs text-gray-400 uppercase">Tiempo</span>
                                    <span className="font-mono text-lg text-blue-800">
                                        {stats ? formatTime(stats.yearlyTimeMinutes) : '0m'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg shadow p-5 border border-orange-100">
                            <h3 className="text-xs uppercase font-bold text-orange-600 mb-1 flex items-center gap-1">
                                🏆 Mi Mejor Día
                            </h3>
                            <div className="text-3xl font-extrabold text-orange-600">
                                {stats?.bestDayLaps} <span className="text-sm font-normal text-orange-400">piscinas</span>
                            </div>
                            <div className="text-sm font-bold text-orange-700 mt-1">
                                {stats ? formatDistance(stats.bestDayMeters) : '0 m'}
                            </div>
                            <p className="text-xs text-orange-400 mt-2 border-t border-orange-200 pt-2">
                                Logrado el: {stats?.bestDayDate !== '-' ? new Date(stats!.bestDayDate).toLocaleDateString() : '-'}
                            </p>
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                         <h2 className="text-xl font-bold text-gray-800 border-l-4 border-yellow-400 pl-3 mb-4">
                            Top 10 Nadadores (Histórico)
                        </h2>
                        
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nadador</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Distancia</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tiempo Total</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {ranking.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-gray-500 italic">
                                                Aún no hay registros de nado. ¡Sé el primero!
                                            </td>
                                        </tr>
                                    ) : (
                                        ranking.map((item) => (
                                            <tr 
                                                key={item.userId} 
                                                className={`${item.userId === user.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap text-2xl">
                                                    {getMedal(item.rank)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-xs mr-3 ${
                                                            item.rank === 1 ? 'bg-yellow-400' :
                                                            item.rank === 2 ? 'bg-gray-400' :
                                                            item.rank === 3 ? 'bg-orange-400' : 'bg-blue-300'
                                                        }`}>
                                                            {item.userName.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {item.userName} {item.userId === user.id && '(Tú)'}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {item.totalLaps} piscinas
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-blue-700">
                                                    {formatDistance(item.totalMeters)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-mono text-gray-600">
                                                    {formatTime(item.totalTimeMinutes)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
