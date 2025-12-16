import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { getAccountStatusByPhone, AccountStatus } from '../services/storageService';

interface Props {
  user: User;
}

export const SubscriptionStatus: React.FC<Props> = ({ user }) => {
  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLatePaymentAlert, setShowLatePaymentAlert] = useState(false);

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
    
    if (result.exists && result.data) {
        checkLatePayment(result.data);
    }
  };

  const checkLatePayment = (data: any) => {
     const now = new Date();
     const currentDay = now.getDate();
     
     // REGLA: El pago debe realizarse dentro de los primeros 10 días del mes.
     // Si hoy es día 11 o más, verificamos el pago.
     if (currentDay > 10) {
         let isPaidForCurrentMonth = false;

         // Buscar campo de fecha de pago (last_payment_date o fecha_pago)
         // Supabase suele usar last_payment_date según nuestra config en UserManagement
         const paymentDateStr = data.last_payment_date || data.fecha_pago || null;
         
         if (paymentDateStr) {
             const paymentDate = new Date(paymentDateStr);
             // Verificar si el pago corresponde al Mes y Año actuales
             if (paymentDate.getMonth() === now.getMonth() && paymentDate.getFullYear() === now.getFullYear()) {
                 isPaidForCurrentMonth = true;
             }
         }

         // Si NO hay pago registrado este mes, o el status es explícitamente MOROSO/PENDIENTE
         const statusStr = String(data.status || '').toUpperCase();
         const isExplicitlyLate = ['MOROSO', 'PENDIENTE'].includes(statusStr);

         if (!isPaidForCurrentMonth || isExplicitlyLate) {
             setShowLatePaymentAlert(true);
         }
     }
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
      // Handle the ISO string offset issue simply by using split for YYYY-MM-DD
      if (stringVal.includes('T')) {
          return new Date(stringVal).toLocaleDateString('es-PA', { year: 'numeric', month: 'long', day: 'numeric' });
      }
      return stringVal;
    }

    return stringVal;
  };

  if (!user.phone) return null;

  return (
    <div className="space-y-4">
        {/* Payment Reminder Alert */}
        {showLatePaymentAlert && (
            <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r shadow-sm animate-fade-in-up">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-orange-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-orange-700 font-bold mb-1">
                            Recordatorio de Pago Mensual
                        </p>
                        <p className="text-sm text-orange-800">
                            Estimado socio, le recordamos que los pagos deben realizarse dentro de los primeros 10 días del mes en curso.
                            <br/><br/>
                            <span className="font-medium italic">
                                "Sus aportes puntuales son recibidos con mucho agradecimiento para mantener la piscina con mejoras continuas."
                            </span>
                        </p>
                    </div>
                </div>
            </div>
        )}

        {/* Regular Status Card */}
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
                        Cuenta verificada
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
    </div>
  );
};