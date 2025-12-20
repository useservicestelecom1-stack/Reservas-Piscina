
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { registerUser, getAllUsers, updateUser, deleteUser } from '../services/storageService';
import { Button } from './Button';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    email: '',
    phone: '',
    role: UserRole.INDIVIDUAL,
    status: 'ACTIVO'
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const data = await getAllUsers();
    setUsers(data);
    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
        const newData = { ...prev, [name]: value };
        // Sincronización automática: Si el usuario no ha editado el username manualmente,
        // lo igualamos al email mientras escribe.
        if (name === 'email' && (prev.username === prev.email || prev.username === '')) {
            newData.username = value;
        }
        return newData;
    });
    
    setError(null);
    setSuccess(null);
  };

  const handleEdit = (user: User) => {
    setFormData({
        name: user.name,
        username: user.username,
        password: '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role,
        status: user.status || 'ACTIVO'
    });
    setEditingId(user.id);
    setIsEditing(true);
    setError(null);
    setSuccess(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
      setIsEditing(false);
      setEditingId(null);
      setFormData({ name: '', username: '', password: '', email: '', phone: '', role: UserRole.INDIVIDUAL, status: 'ACTIVO' });
      setError(null);
      setSuccess(null);
  };

  const handleDelete = async (id: string) => {
      if (!window.confirm("¿Está seguro de que desea eliminar este usuario?")) return;
      try {
          setLoading(true);
          await deleteUser(id);
          setSuccess("Usuario eliminado correctamente.");
          await loadUsers();
      } catch (err: any) {
          setError(err.message || "Error al eliminar usuario");
      } finally {
          setLoading(false);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.username) {
      setError("Nombre, Correo y Usuario de Acceso son obligatorios.");
      return;
    }
    if (!isEditing && !formData.password) {
        setError("La contraseña es obligatoria para nuevos usuarios.");
        return;
    }

    try {
      setLoading(true);
      if (isEditing && editingId) {
          const updatedUser: User = {
              id: editingId,
              name: formData.name,
              username: formData.username,
              password: formData.password || undefined,
              email: formData.email,
              phone: formData.phone,
              role: formData.role as UserRole,
              status: formData.status
          };
          await updateUser(updatedUser);
          setSuccess(`Socio "${updatedUser.username}" actualizado.`);
          handleCancelEdit();
      } else {
          const newUser: User = {
            id: crypto.randomUUID(),
            name: formData.name,
            username: formData.username,
            password: formData.password,
            email: formData.email,
            phone: formData.phone,
            role: formData.role as UserRole,
            status: formData.status
          };
          await registerUser(newUser);
          setSuccess(`Socio "${newUser.username}" creado exitosamente.`);
          setFormData({ name: '', username: '', password: '', email: '', phone: '', role: UserRole.INDIVIDUAL, status: 'ACTIVO' });
      }
      await loadUsers();
    } catch (err: any) {
      setError(err.message || "Error al procesar la solicitud");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-blue-600">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">
                {isEditing ? '✏️ Editar Socio' : '👤 Registrar Nuevo Socio'}
            </h2>
            {isEditing && (
                <button onClick={handleCancelEdit} className="text-sm text-red-500 hover:text-red-700 font-bold">
                    Cancelar Edición ✕
                </button>
            )}
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">Nombre Completo *</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500" placeholder="Nombre y Apellido" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">Categoría de Socio (category) *</label>
                <select name="role" value={formData.role} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500">
                  <option value={UserRole.INDIVIDUAL}>INDIVIDUAL</option>
                  <option value={UserRole.PRINCIPAL}>PRINCIPAL</option>
                  <option value={UserRole.DEPENDENT}>DEPENDIENTE</option>
                  <option value={UserRole.ADMIN}>ADMINISTRADOR (Sistema)</option>
                </select>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div>
               <label className="block text-xs font-bold text-gray-500 uppercase">Correo Electrónico *</label>
               <input type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md p-2" placeholder="correo@ejemplo.com" />
             </div>
             <div>
               <label className="block text-xs font-bold text-gray-500 uppercase">WhatsApp / Teléfono *</label>
               <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md p-2" placeholder="6000-0000" />
             </div>
             <div>
               <label className="block text-xs font-bold text-gray-500 uppercase">Estado Cuenta</label>
               <select name="status" value={formData.status} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md p-2">
                  <option value="ACTIVO">ACTIVO</option>
                  <option value="INACTIVO">INACTIVO</option>
                  <option value="MOROSO">MOROSO</option>
                  <option value="PENDIENTE">PENDIENTE DE PAGO</option>
                </select>
             </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase">Usuario de Acceso *</label>
              <input 
                type="text" 
                name="username" 
                value={formData.username} 
                onChange={handleChange} 
                className="mt-1 block w-full border border-gray-300 rounded-md p-2 bg-blue-50 focus:bg-white transition-colors font-medium" 
                placeholder="Nombre de usuario (o email)" 
              />
              <p className="text-[10px] text-blue-500 mt-1 italic">Este es el dato que el socio usará para entrar al sistema.</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase">Contraseña {isEditing ? '(Opcional)' : '*'}</label>
              <input type="text" name="password" value={formData.password} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md p-2" placeholder={isEditing ? "Dejar vacío para no cambiar" : "Contraseña secreta"} />
            </div>
          </div>

          {error && <div className="p-3 bg-red-100 text-red-700 rounded text-sm font-bold">{error}</div>}
          {success && <div className="p-3 bg-green-100 text-green-700 rounded text-sm font-bold">{success}</div>}

          <div className="pt-2 flex justify-end">
            <Button type="submit" disabled={loading} className="w-full md:w-auto">
                {loading ? 'Guardando...' : (isEditing ? 'Actualizar Datos' : 'Registrar Socio')}
            </Button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
            📋 Directorio de Socios <span className="text-sm font-normal text-gray-400">({users.length})</span>
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Socio</th>
                <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Email / Login</th>
                <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Categoría</th>
                <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((u) => (
                <tr key={u.id} className={editingId === u.id ? 'bg-blue-50' : 'hover:bg-gray-50 transition-colors'}>
                  <td className="px-4 py-3 whitespace-nowrap">
                     <div className="text-sm font-bold text-gray-900">{u.name}</div>
                     <div className="text-[10px] text-gray-400 font-mono">{u.id}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    <div className="font-bold text-blue-600">{u.username}</div>
                    <div className="text-[10px] text-gray-400">{u.email}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                        u.role === UserRole.ADMIN ? 'bg-purple-50 text-purple-700 border-purple-200' : 
                        u.role === UserRole.PRINCIPAL ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                        'bg-gray-50 text-gray-700 border-gray-200'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        u.status === 'ACTIVO' ? 'bg-green-100 text-green-800' : 
                        u.status === 'MOROSO' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                          {u.status}
                      </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEdit(u)} className="p-1.5 hover:bg-blue-100 rounded border border-blue-200 text-blue-600" title="Editar">✏️</button>
                        <button onClick={() => handleDelete(u.id)} className="p-1.5 hover:bg-red-100 rounded border border-red-200 text-red-600" title="Eliminar">🗑️</button>
                      </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
