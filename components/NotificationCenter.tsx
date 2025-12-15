import React, { useState } from 'react';
import { Button } from './Button';
import { UserRole } from '../types';
import { broadcastNotification } from '../services/storageService';

export const NotificationCenter: React.FC = () => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [targetRole, setTargetRole] = useState<string>('ALL');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !message) {
            setError("Título y mensaje son obligatorios.");
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const role = targetRole === 'ALL' ? undefined : targetRole as UserRole;
            await broadcastNotification(title, message, role);
            setSuccess(`Mensaje enviado exitosamente a ${targetRole === 'ALL' ? 'todos los usuarios' : 'grupo ' + targetRole}.`);
            setTitle('');
            setMessage('');
        } catch (err) {
            setError("Error enviando mensaje. Verifique la conexión.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-500">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">📨 Centro de Mensajería (Push)</h2>
                <p className="text-sm text-gray-500 mb-6">
                    Envíe notificaciones importantes a los usuarios. Los mensajes aparecerán en la campana de notificaciones de su aplicación.
                </p>

                <form onSubmit={handleSend} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Destinatarios</label>
                        <select 
                            value={targetRole}
                            onChange={(e) => setTargetRole(e.target.value)}
                            className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="ALL">📢 Todos los Usuarios</option>
                            <option value={UserRole.INDIVIDUAL}>👤 Usuarios Individuales</option>
                            <option value={UserRole.CLUB}>🏊 Clubes</option>
                            <option value={UserRole.SCHOOL}>🎓 Colegios</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Título del Mensaje</label>
                        <input 
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ej. Cierre por Mantenimiento"
                            className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                            maxLength={50}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contenido</label>
                        <textarea 
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Escriba el detalle del aviso aquí..."
                            className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500 h-32"
                        />
                    </div>

                    {error && <div className="p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
                    {success && <div className="p-3 bg-green-100 text-green-700 rounded text-sm">{success}</div>}

                    <div className="flex justify-end pt-2">
                        <Button type="submit" disabled={loading} className="w-full md:w-auto">
                            {loading ? 'Enviando...' : 'Enviar Mensaje Push'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};