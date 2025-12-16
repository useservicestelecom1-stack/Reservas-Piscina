
import React from 'react';
import { UserRole } from '../types';

interface SidebarProps {
  onNavigate: (page: string) => void;
  currentPage: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNavigate, currentPage }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Reservas (Grid)', icon: '📅' },
    { id: 'checkin', label: 'Control Acceso', icon: '⏱️' },
    { type: 'divider', label: 'Administración' },
    { id: 'ranking', label: 'Ranking Nadadores', icon: '🏆' },
    { id: 'admin_bookings', label: 'Gestión Reservas', icon: '📝' },
    { id: 'reports', label: 'Reportes y Estad.', icon: '📊' },
    { id: 'users', label: 'Usuarios', icon: '👥' },
    { type: 'divider', label: 'Sistema' },
    { id: 'communications', label: 'Mensajería Push', icon: '📨' },
    { id: 'suggestions', label: 'Buzón Sugerencias', icon: '🗳️' },
    { id: 'system_logs', label: 'Bitácora Accesos', icon: '🗄️' },
  ];

  return (
    <div className="w-64 bg-slate-800 flex-shrink-0 min-h-screen hidden md:block border-r border-slate-700 shadow-xl">
      <div className="p-4 bg-slate-900 border-b border-slate-700">
        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Menú Principal</h3>
      </div>
      <nav className="mt-4 px-2 space-y-1">
        {menuItems.map((item, index) => {
          if (item.type === 'divider') {
            return (
              <div key={`div-${index}`} className="px-3 mt-6 mb-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {item.label}
                </p>
              </div>
            );
          }

          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id!)}
              className={`
                group w-full flex items-center px-3 py-3 text-sm font-medium rounded-md transition-all duration-200
                ${isActive 
                  ? 'bg-blue-700 text-white shadow-md border-l-4 border-blue-400' 
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'}
              `}
            >
              <span className="mr-3 text-lg opacity-80 group-hover:opacity-100 transition-opacity">
                {item.icon}
              </span>
              {item.label}
            </button>
          );
        })}
      </nav>
      
      {/* Footer del Sidebar */}
      <div className="absolute bottom-0 w-64 p-4 bg-slate-900 border-t border-slate-700 text-xs text-slate-500 text-center">
        Piscina Albrook v1.3
      </div>
    </div>
  );
};
