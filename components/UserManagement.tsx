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
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(null);
    setSuccess(null);
  };

  const handleEdit = (user: User) => {
    setFormData({
        name: user.name,
        username: user.username,
        password: '', // Leave blank to indicate "keep current"
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
      if (!window.confirm("¿Está seguro de que desea eliminar este usuario? Esta acción no se puede deshacer.")) return;
      
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
    
    // Validation
    if (!formData.name || !formData.username) {
      setError("Nombre y Usuario son obligatorios.");
      return;
    }

    if (!isEditing && !formData.password) {
        setError("La contraseña es obligatoria para nuevos usuarios.");
        return;
    }

    try {
      setLoading(true);
      
      if (isEditing && editingId) {
          // Update existing user
          const updatedUser: User = {
              id: editingId,
              name: formData.name,
              username: formData.username,
              password: formData.password, // If empty, storageService ignores it
              email: formData.email,
              phone: formData.phone,
              role: formData.role as UserRole,
              status: formData.status
          };
          await updateUser(updatedUser);
          setSuccess(`Usuario "${updatedUser.username}" actualizado exitosamente.`);
          handleCancelEdit(); // Reset form but keep success message
      } else {
          // Create new user
          const newUser: User = {
            id: `u_${Date.now()}`,
            name: formData.name,
            username: formData.username,
            password: formData.password,
            email: formData.email,
            phone: formData.phone,
            role: formData.role as UserRole,
            status: formData.status
          };
          await registerUser(newUser);
          setSuccess(`Usuario "${newUser.username}" creado exitosamente.`);
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
    <div className="space-y-8">
      {/* Creation/Edit Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">
                {isEditing ? '✏️ Editar Usuario' : '👤 Crear Nuevo Usuario'}
            </h2>
            {isEditing && (
                <button onClick={handleCancelEdit} className="text-sm text-gray-500 hover:text-gray-700 underline">
                    Cancelar Edición
                </button>
            )}
        </div>
        
        <p className="text-sm text-gray-500 mb-4">
          {isEditing ? 'Modifique los datos necesarios.' : 'Ingrese los datos para registrar un nuevo cliente.'} Campos marcados con * son obligatorios.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nombre Completo (Full Name) *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej. Juan Pérez"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Categoría (Role) *</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={UserRole.INDIVIDUAL}>INDIVIDUAL (Privado)</option>
                  <option value={UserRole.CLUB}>CLUB (Entrenador)</option>
                  <option value={UserRole.SCHOOL}>SCHOOL (Colegio)</option>
                  <option value={UserRole.ADMIN}>ADMIN (Admin)</option>
                </select>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div>
               <label className="block text-sm font-medium text-gray-700">Correo Electrónico</label>
               <input
                 type="email"
                 name="email"
                 value={formData.email}
                 onChange={handleChange}
                 className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                 placeholder="cliente@ejemplo.com"
               />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700">Teléfono</label>
               <input
                 type="tel"
                 name="phone"
                 value={formData.phone}
                 onChange={handleChange}
                 className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                 placeholder="Ej. 6600-1234"
               />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700">Estado (Status)</label>
               <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="ACTIVO">ACTIVO</option>
                  <option value="INACTIVO">INACTIVO</option>
                  <option value="MOROSO">MOROSO</option>
                  <option value="PENDIENTE">PENDIENTE</option>
                </select>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nombre de Usuario (Login) *</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                disabled={isEditing} 
                className={`mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 ${isEditing ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="Ej. jperez"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Contraseña {isEditing ? '(Opcional)' : '*'}</label>
              <input
                type="text"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={isEditing ? "Dejar en blanco para mantener actual" : "Contraseña"}
              />
            </div>
          </div>

          {error && <div className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>}
          {success && <div className="text-green-600 text-sm bg-green-50 p-2 rounded">{success}</div>}

          <div className="pt-2 flex justify-end gap-3">
             {isEditing && (
                 <Button type="button" variant="outline" onClick={handleCancelEdit}>
                     Cancelar
                 </Button>
             )}
            <Button type="submit" className="w-full md:w-auto" disabled={loading}>
                {loading ? 'Procesando...' : (isEditing ? 'Guardar Cambios' : 'Crear Usuario')}
            </Button>
          </div>
        </form>
      </div>

      {/* User List */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800">📋 Base de Datos de Clientes</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nombre / Contacto</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Credenciales</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((u) => (
                <tr key={u.id} className={editingId === u.id ? 'bg-blue-50' : ''}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                     <div className="font-medium">{u.name}</div>
                     <div className="text-xs text-gray-500">{u.email}</div>
                     <div className="text-xs text-gray-500">{u.phone}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    <span className="font-mono bg-gray-100 px-1 rounded">{u.username}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${u.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-800' : 
                        u.role === UserRole.CLUB ? 'bg-blue-100 text-blue-800' :
                        u.role === UserRole.SCHOOL ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${u.status === 'ACTIVO' ? 'bg-green-100 text-green-800' : 
                          u.status === 'MOROSO' ? 'bg-red-100 text-red-800' : 
                          'bg-yellow-100 text-yellow-800'}`}>
                          {u.status}
                      </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button 
                            onClick={() => handleEdit(u)}
                            className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-1.5 rounded hover:bg-indigo-100"
                            title="Editar"
                        >
                            ✏️
                        </button>
                        <button 
                            onClick={() => handleDelete(u.id)}
                            className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded hover:bg-red-100"
                            title="Eliminar"
                        >
                            🗑️
                        </button>
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