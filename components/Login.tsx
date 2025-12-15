import React, { useState } from 'react';
import { loginUser, registerUser } from '../services/storageService';
import { User, UserRole } from '../types';
import { DEMO_USERS } from '../constants';
import { Button } from './Button';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const user = await loginUser(username);
    setLoading(false);
    if (user) {
      onLogin(user);
    } else {
      setError('Usuario no encontrado. Prueba: admin, club_delfines, colegio_javier, juan_perez');
    }
  };

  const handleSocialLogin = async (provider: 'Google' | 'Facebook') => {
    const name = window.prompt(`Simulación ${provider}: Por favor ingresa tu nombre para completar el registro:`, "Nuevo Usuario");
    
    if (name) {
        const timestamp = Date.now();
        const mockUsername = `${provider.toLowerCase()}_${timestamp}`;
        
        const newUser: User = {
            id: `u_${timestamp}`,
            username: mockUsername,
            name: name,
            role: UserRole.INDIVIDUAL, 
            password: 'social_login_dummy_pass',
            email: `usuario_${timestamp}@${provider.toLowerCase()}.com`, 
            phone: ''
        };

        try {
            setLoading(true);
            await registerUser(newUser);
            const loggedInUser = await loginUser(mockUsername);
            if (loggedInUser) {
                onLogin(loggedInUser);
            }
            setLoading(false);
        } catch (e) {
            setLoading(false);
            setError("Error al registrar usuario.");
        }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white shadow-xl rounded-xl">
        <div className="text-center">
            <h1 className="text-4xl font-extrabold text-blue-600 mb-2">🏊</h1>
            <h2 className="text-3xl font-extrabold text-gray-900">Piscina Albrook</h2>
            <p className="mt-2 text-sm text-gray-600">Sistema de Reservas y Control</p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">Usuario</label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Nombre de Usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Contraseña</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Contraseña"
                defaultValue="123" 
              />
            </div>
          </div>

          {error && <div className="text-red-500 text-sm text-center">{error}</div>}

          <div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </div>
        </form>

        <div className="mt-6">
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">O ingresa con redes sociales</span>
                </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                    onClick={() => handleSocialLogin('Facebook')}
                    disabled={loading}
                    className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                    <span className="sr-only">Ingresar con Facebook</span>
                    <span className="ml-2">Facebook</span>
                </button>

                <button
                    onClick={() => handleSocialLogin('Google')}
                    disabled={loading}
                    className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                    <span className="sr-only">Ingresar con Google</span>
                    <span className="ml-2">Google</span>
                </button>
            </div>
        </div>

        <div className="mt-4 text-xs text-gray-500 bg-gray-100 p-4 rounded">
            <p className="font-bold mb-1">Usuarios Demo (Admin / Club / School):</p>
            <ul className="list-disc pl-4 space-y-1">
                {DEMO_USERS.filter(u => u.role !== UserRole.INDIVIDUAL).map(u => (
                    <li key={u.id}><b>{u.username}</b> ({u.role})</li>
                ))}
            </ul>
        </div>
      </div>
    </div>
  );
};