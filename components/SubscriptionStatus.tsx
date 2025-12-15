import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { getAccountStatusByPhone, AccountStatus } from '../services/storageService';

interface Props {
  user: User;
}

export const SubscriptionStatus: React.FC<Props> = ({ user }) => {
  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user.phone) {
      loadStatus();
    }
  }, [user.phone]);

  const loadStatus = async () => {
    setLoading(true);
    const result = await getAccountStatusByPhone(user.phone!);
    setStatus(result);
    setLoading(false);
  };

  // Helper to format keys (e.g. "created_at" -> "Created At")
  const formatLabel = (key: string) => {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Helper to smart-format values
  const formatValue = (key: string, value: any) => {
    if (value === null || value === undefined) return '-';
    
    const stringVal = String(value);
    const keyLower = key.toLowerCase();

    // Currency formatting
    if (keyLower.includes('saldo') || keyLower.includes('balance') || keyLower.includes('precio') || keyLower.includes('deuda') || keyLower.includes('price')) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value));
    }

    // Status Badges
    if (keyLower === 'status' || keyLower === 'estado' || keyLower === 'estado_cuenta') {
       const isBad = stringVal.toLowerCase().includes('moroso') || stringVal.toLowerCase().includes('inactiv') || stringVal.toLowerCase().includes('cancel');
       const isPending = stringVal.toLowerCase().includes('pendien');
       
       let colorClass = 'bg-green-100 text-green-800';
       if (isBad) colorClass = 'bg-red-100 text-red-800';
       if (isPending) colorClass = 'bg-yellow-100 text-yellow-800';

       return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${colorClass}`}>{stringVal.toUpperCase()}</span>;
    }

    // Date formatting
    if ((keyLower.includes('date') || keyLower.includes('fecha') || keyLower.includes('created') || keyLower.includes('pago')) && !isNaN(Date.parse(stringVal)) && stringVal.length > 4) {
      return new Date(stringVal).toLocaleDateString('es-PA', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    return stringVal;
  };

  if (!user.phone) return null;

  return (
    <div className="bg-white p-6 rounded-lg shadow border-t-4 border-indigo-500">
      <div className="flex justify-between items-start mb-4">
        <div>
            <h3 className="text-lg font-bold text-gray-800">Estado de Membresía</h3>
            <p className="text-xs text-gray-500">Sincronizado con base de datos externa</p>
        </div>
        <div className="text-right">
            <span className="block text-xs text-gray-400">ID Usuario</span>
            <span className="font-mono text-sm font-medium text-indigo-600">{user.phone}</span>
        </div>
      </div>

      {loading && (
          <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          </div>
      )}

      {!loading && status && (
        <div>
           {status.exists ? (
             <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3">
                    {Object.entries(status.data)
                        // Hide internal ID fields or standard Supabase timestamps to keep UI clean
                        .filter(([key]) => !['id', 'user_id', 'created_at', 'updated_at'].includes(key)) 
                        .map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center border-b border-gray-100 pb-2 last:border-0">
                            <span className="text-sm text-gray-500 font-medium">{formatLabel(key)}</span>
                            <span className="text-sm font-semibold text-gray-800 text-right">
                                {formatValue(key, value)}
                            </span>
                        </div>
                    ))}
                </div>
                
                <div className="pt-2 mt-2 bg-green-50 rounded p-2 flex items-center gap-2 text-xs text-green-700 border border-green-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Cuenta verificada y activa
                </div>
             </div>
           ) : (
             <div className="text-center py-4 bg-gray-50 rounded border border-gray-200 border-dashed">
                <p className="text-gray-500 text-sm mb-1">No se encontró información de membresía.</p>
                <p className="text-xs text-gray-400">Verifique que el número <b>{user.phone}</b> esté registrado en el sistema administrativo.</p>
                {status.message && <p className="mt-2 text-xs text-red-400">{status.message}</p>}
             </div>
           )}
        </div>
      )}
    </div>
  );
};