import React, { useState, useEffect } from 'react';
import { User, UserRole, Suggestion } from '../types';
import { saveSuggestion, getSuggestions, markSuggestionRead } from '../services/storageService';
import { Button } from './Button';

interface SuggestionBoxProps {
    user: User;
}

export const SuggestionBox: React.FC<SuggestionBoxProps> = ({ user }) => {
    // Admin State
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    
    // User State
    const [message, setMessage] = useState('');
    const [myHistory, setMyHistory] = useState<Suggestion[]>([]);

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const isAdmin = user.role === UserRole.ADMIN;

    useEffect(() => {
        loadData();
    }, [user.id]);

    const loadData = async () => {
        setLoading(true);
        const data = await getSuggestions();
        if (isAdmin) {
            setSuggestions(data);
        } else {
            setMyHistory(data.filter(s => s.userId === user.id));
        }
        setLoading(false);
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;

        setLoading(true);
        try {
            await saveSuggestion(user.id, user.name, message);
            setSuccess("¡Gracias! Tu sugerencia ha sido enviada a la administración.");
            setMessage('');
            await loadData(); // Reload history
        } catch (err: any) {
            setError(err.message || "Error al enviar.");
        } finally {
            setLoading(false);
        }
    };

    const toggleReadStatus = async (s: Suggestion) => {
        // Optimistic Update
        const newStatus = !s.isRead;
        setSuggestions(prev => prev.map(item => item.id === s.id ? { ...item, isRead: newStatus } : item));
        
        await markSuggestionRead(s.id, newStatus);
    };

    if (isAdmin) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">🗳️ Buzón de Sugerencias</h2>
                        <p className="text-sm text-gray-500">Comentarios recibidos de los usuarios.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
                        Refrescar
                    </Button>
                </div>

                <div className="grid gap-4">
                    {loading && suggestions.length === 0 ? (
                        <p className="text-center text-gray-500">Cargando...</p>
                    ) : suggestions.length === 0 ? (
                        <div className="p-8 text-center bg-gray-50 rounded border border-dashed border-gray-300 text-gray-400">
                            No hay sugerencias nuevas.
                        </div>
                    ) : (
                        suggestions.map(s => (
                            <div key={s.id} className={`p-4 rounded-lg border border-l-4 transition-all ${
                                s.isRead ? 'bg-gray-50 border-gray-200 border-l-gray-300' : 'bg-white border-blue-100 border-l-blue-500 shadow-sm'
                            }`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-gray-800">{s.userName}</span>
                                        <span className="text-xs text-gray-400">
                                            {new Date(s.date).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={() => toggleReadStatus(s)}
                                        className={`text-xs px-2 py-1 rounded font-medium ${
                                            s.isRead ? 'text-gray-500 hover:bg-gray-200' : 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                                        }`}
                                    >
                                        {s.isRead ? 'Marcar como No Leído' : 'Marcar como Leído'}
                                    </button>
                                </div>
                                <p className="text-gray-700 whitespace-pre-wrap text-sm">{s.message}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    }

    // USER VIEW
    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white rounded-lg shadow p-6 border-t-4 border-indigo-500">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">💬 Buzón de Sugerencias</h2>
                <p className="text-sm text-gray-500 mb-6">
                    ¿Tienes ideas para mejorar la Piscina de Albrook? ¿Encontraste algún problema? Cuéntanos aquí.
                </p>

                <form onSubmit={handleSend} className="space-y-4">
                    <textarea 
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Escribe tu sugerencia, queja o comentario aquí..."
                        className="w-full border border-gray-300 rounded-md shadow-sm p-4 focus:ring-indigo-500 focus:border-indigo-500 h-32"
                    />

                    {error && <div className="p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
                    {success && <div className="p-3 bg-green-100 text-green-700 rounded text-sm">{success}</div>}

                    <div className="flex justify-end">
                        <Button type="submit" disabled={loading || !message.trim()}>
                            {loading ? 'Enviando...' : 'Enviar Sugerencia'}
                        </Button>
                    </div>
                </form>
            </div>

            {myHistory.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-gray-700 mb-4">Tus Mensajes Enviados</h3>
                    <div className="space-y-3">
                        {myHistory.map(s => (
                            <div key={s.id} className="bg-white p-3 rounded border border-gray-200">
                                <p className="text-gray-600 text-sm">{s.message}</p>
                                <p className="text-right text-xs text-gray-400 mt-2">
                                    Enviado el {new Date(s.date).toLocaleDateString()}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};