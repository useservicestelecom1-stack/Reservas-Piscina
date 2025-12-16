import React, { useState, useEffect } from 'react';
import { loginUser, syncSocialUser } from '../services/storageService';
import { supabase } from '../services/supabaseClient';
import { User } from '../types';
import { Button } from './Button';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check for existing OAuth session on mount
  useEffect(() => {
    const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
            setLoading(true);
            try {
                // Sync the Auth user to our database 'members' table
                const appUser = await syncSocialUser(session.user);
                onLogin(appUser);
            } catch (err: any) {
                console.error("Sync error", err);
                setError("Error sincronizando cuenta social.");
                setLoading(false);
            }
        }
    };
    checkSession();

    // Listen for auth changes (e.g. after redirect)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session && session.user) {
             // We do the same sync logic here
             try {
                const appUser = await syncSocialUser(session.user);
                onLogin(appUser);
            } catch (err) {
                console.error("Auth state change error", err);
            }
        }
    });

    return () => subscription.unsubscribe();
  }, [onLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const user = await loginUser(username);
    setLoading(false);
    if (user) {
      onLogin(user);
    } else {
      setError('Usuario no encontrado.');
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
        // User will be redirected, so loading state stays true until page reload/redirect
    } catch (err: any) {
        setLoading(false);
        setError(`Error iniciando sesión con ${provider}: ${err.message}`);
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
            <p className="text-[10px] text-center text-gray-400 mt-2">
                Nota: Requiere configuración de Providers en Supabase Dashboard.
            </p>
        </div>
      </div>
    </div>
  );
};