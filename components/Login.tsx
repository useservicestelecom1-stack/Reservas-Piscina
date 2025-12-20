
import React, { useState, useEffect } from 'react';
import { loginUser, syncSocialUser, registerUser } from '../services/storageService';
import { supabase } from '../services/supabaseClient';
import { User, UserRole } from '../types';
import { Button } from './Button';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.INDIVIDUAL);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
            setLoading(true);
            try {
                const appUser = await syncSocialUser(session.user);
                onLogin(appUser);
            } catch (err: any) {
                console.error("Sync error", err);
                setError(err.message || "Error sincronizando cuenta social.");
                setLoading(false);
            }
        }
    };
    checkSession();
  }, [onLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (isRegistering) {
        if (!email || !password || !name || !phone) {
            setError("Todos los campos marcados con * son obligatorios.");
            return;
        }
        setLoading(true);
        try {
            const newUser: User = {
                id: crypto.randomUUID(),
                username: email, // Por defecto en auto-registro el email es el username
                password,
                name,
                email,
                phone,
                role,
               // status: 'ACTIVO'
            };
            await registerUser(newUser);
            // Auto login after registration
            const user = await loginUser(email, password);
            if (user) onLogin(user);
        } catch (err: any) {
            setError(err.message || "Error al registrar usuario.");
        } finally {
            setLoading(false);
        }
    } else {
        if (!username || !password) {
            setError("Por favor ingrese su usuario/correo y contraseña.");
            return;
        }
        setLoading(true);
        try {
            const user = await loginUser(username, password);
            if (user) {
              onLogin(user);
            } else {
              setError('Credenciales incorrectas o socio no encontrado.');
            }
        } catch (err) {
            setError('Error al intentar iniciar sesión.');
        } finally {
            setLoading(false);
        }
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    setLoading(true);
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: provider,
            options: {
                redirectTo: window.location.origin
            }
        });
        if (error) throw error;
    } catch (err: any) {
        setLoading(false);
        setError(`Error iniciando sesión con ${provider}: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50 p-4">
      <div className="max-w-md w-full space-y-8 p-8 bg-white shadow-xl rounded-xl">
        <div className="text-center">
            <h1 className="text-4xl font-extrabold text-blue-600 mb-2">🏊</h1>
            <h2 className="text-3xl font-extrabold text-gray-900">Piscina Albrook</h2>
            <p className="mt-2 text-sm text-gray-600">
                {isRegistering ? 'Crear nueva cuenta de socio' : 'Gestión Administrativa de Socios'}
            </p>
        </div>
        
        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-3">
            {isRegistering && (
                <>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase ml-1">Nombre Completo *</label>
                        <input
                            type="text"
                            required
                            className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Ej. Juan Pérez"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase ml-1">Correo Electrónico *</label>
                        <input
                            type="email"
                            required
                            className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="correo@ejemplo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase ml-1">Teléfono WhatsApp *</label>
                        <input
                            type="tel"
                            required
                            className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="6000-0000"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase ml-1">Rol en el sistema</label>
                        <select
                            className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            value={role}
                            onChange={(e) => setRole(e.target.value as UserRole)}
                        >
                            <option value={UserRole.INDIVIDUAL}>Socio Individual</option>
                            <option value={UserRole.PRINCIPAL}>Socio Principal (Club)</option>
                        </select>
                    </div>
                </>
            )}
            
            {!isRegistering && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase ml-1">Correo o Usuario *</label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Ej. socio@ejemplo.com"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase ml-1">Contraseña *</label>
              <input
                id="passwordField"
                name="password"
                type="password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Su clave de acceso"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {!isRegistering && (
           //  <div className="bg-blue-50 border border-blue-200 rounded p-2 text-[11px] text-blue-700">
              //  <p className="font-bold">🔑 Acceso Administrativo:</p>
              //  <p>Usuario: <span className="font-mono">admin</span> | Clave: <span className="font-mono">admin123</span></p>
          //   </div>
         //)}

          //{error && <div className="text-red-500 text-sm text-center font-bold bg-red-50 p-2 rounded border border-red-100">{error}</div>}

          <div className="space-y-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Procesando...' : (isRegistering ? 'Crear Cuenta' : 'Entrar al Sistema')}
            </Button>
            
            <button 
                type="button"
                onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
                className="w-full text-center text-sm text-blue-600 hover:underline font-medium"
            >
                {isRegistering ? '¿Ya tienes cuenta? Inicia Sesión' : '¿Eres nuevo? Regístrate aquí'}
            </button>
          </div>
        </form>

        {!isRegistering && (
            <div className="mt-6 border-t pt-6">
                <p className="text-center text-xs text-gray-500 mb-4 uppercase tracking-widest font-bold">Acceso Social</p>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => handleSocialLogin('facebook')}
                        disabled={loading}
                        className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                    >
                        <img src="https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg" alt="FB" className="h-5 w-5 mr-2" />
                        <span>Facebook</span>
                    </button>

                    <button
                        onClick={() => handleSocialLogin('google')}
                        disabled={loading}
                        className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                    >
                        <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" className="h-5 w-5 mr-2" />
                        <span>Google</span>
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
