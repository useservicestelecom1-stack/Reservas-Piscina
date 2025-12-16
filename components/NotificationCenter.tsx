import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { UserRole, User } from '../types';
import { broadcastNotification, getAllUsers } from '../services/storageService';

export const NotificationCenter: React.FC = () => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [targetRole, setTargetRole] = useState<string>('ALL');
    
    // Estados para conteo y validación
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [recipientCount, setRecipientCount] = useState<number>(0);
    
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Cargar usuarios al montar el componente para calcular destinatarios
    useEffect(() => {
        const loadUsers = async () => {
            try {
                const users = await getAllUsers();
                setAllUsers(users);
                setRecipientCount(users.length); // Default to ALL
            } catch (e) {
                console.error("Error cargando usuarios para notificaciones");
            }
        };
        loadUsers();
    }, []);

    // Recalcular destinatarios cuando cambia el filtro
    useEffect(() => {
        if (targetRole === 'ALL') {
            setRecipientCount(allUsers.length);
        } else {
            const count = allUsers.filter(u => u.role === targetRole).length;
            setRecipientCount(count);
        }
    }, [targetRole, allUsers]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !message) {
            setError("Título y mensaje son obligatorios.");
            return;
        }

        if (recipientCount === 0) {
            setError("No hay usuarios en la categoría seleccionada para recibir el mensaje.");
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // Si es 'ALL', pasamos undefined para que el servicio tome a todos.
            // Si es un rol específico, lo pasamos tal cual.
            const role = targetRole === 'ALL' ? undefined : targetRole as UserRole;
            
            await broadcastNotification(title, message, role);
            
            setSuccess(`Mensaje enviado exitosamente a ${recipientCount} destinatarios.`);
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
                    Envíe notificaciones importantes. Seleccione "Todos" para un aviso general, o filtre por el rol específico que requiera.
                </p>

                <form onSubmit={handleSend} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Destinatarios</label>
                        <select 
                            value={targetRole}
                            onChange={(e) => setTargetRole(e.target.value)}
                            className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                        >
                            <option value="ALL">📢 Todos los Usuarios (General)</option>
                            <option value={UserRole.INDIVIDUAL}>👤 Solo Usuarios Individuales</option>
                            <option value={UserRole.PRINCIPAL}>👑 Solo Principales (Titulares)</option>
                            <option value={UserRole.DEPENDENT}>👶 Solo Dependientes</option>
                            <option value={UserRole.ADMIN}>🛡️ Solo Administradores</option>
                        </select>
                        
                        {/* Indicador de alcance */}
                        <div className="mt-2 flex items-center gap-2 text-sm">
                            <span className="text-gray-500">Alcance estimado:</span>
                            <span className={`font-bold px-2 py-0.5 rounded ${recipientCount > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {recipientCount} usuarios
                            </span>
                        </div>
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
                        <Button type="submit" disabled={loading || recipientCount === 0} className="w-full md:w-auto">
                            {loading ? 'Enviando...' : `Enviar a ${recipientCount} Usuarios`}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};