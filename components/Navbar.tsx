import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, AppNotification } from '../types';
import { logoutUser, getNotifications, markNotificationAsRead } from '../services/storageService';

interface NavbarProps {
  user: User;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  currentPage: string;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onNavigate, onLogout, currentPage }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Notification State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  
  // Track the last notified ID to avoid spamming the same alert
  const lastNotifiedIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Request Browser Notification Permission on mount
    if ('Notification' in window && Notification.permission !== 'granted') {
        Notification.requestPermission();
    }

    // Clock Timer
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    // Notification Polling (Initial + Interval)
    fetchNotifications();
    const notifTimer = setInterval(fetchNotifications, 10000); // Check every 10s for faster alerts

    // Click outside to close dropdown
    const handleClickOutside = (event: MouseEvent) => {
        if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
            setShowNotifDropdown(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
        clearInterval(timer);
        clearInterval(notifTimer);
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [user.id]);

  const fetchNotifications = async () => {
      const data = await getNotifications(user.id);
      setNotifications(data);

      // System Notification Logic
      const unread = data.filter(n => !n.isRead);
      if (unread.length > 0) {
          // Sort by creation time desc to get the newest
          const sortedUnread = [...unread].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          const latest = sortedUnread[0];

          // If we haven't notified about this specific message yet
          if (latest.id !== lastNotifiedIdRef.current) {
              lastNotifiedIdRef.current = latest.id;
              
              // Trigger Browser Notification if permission granted
              if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification(latest.title, {
                      body: latest.message,
                      icon: '/favicon.ico' // You can replace with a pool icon URL
                  });
              }
          }
      }
  };

  const handleRead = async (id: string) => {
      await markNotificationAsRead(id);
      // Optimistic update
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };
  
  const navItemClass = (page: string) => 
    `cursor-pointer px-3 py-2 rounded-md text-sm font-medium ${currentPage === page ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-600'}`;

  // Format date: "Mie, 23 Oct"
  const dateStr = currentTime.toLocaleDateString('es-PA', { weekday: 'short', day: 'numeric', month: 'short' });
  // Format time: "14:30:45"
  const timeStr = currentTime.toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <nav className="bg-blue-700 shadow-lg relative z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center gap-2">
              <span className="text-2xl">🏊</span>
              <div className="flex flex-col">
                <span className="text-white font-bold text-lg leading-tight">Piscina Albrook</span>
                {/* Mobile Clock (Small) */}
                <span className="md:hidden text-blue-200 text-xs font-mono">{timeStr}</span>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <a onClick={() => onNavigate('dashboard')} className={navItemClass('dashboard')}>Reservas</a>
                
                {/* Everyone can now see Check-in */}
                <a onClick={() => onNavigate('checkin')} className={navItemClass('checkin')}>Control Acceso</a>
                
                {user.role === UserRole.ADMIN && (
                   <>
                       <a onClick={() => onNavigate('admin_bookings')} className={navItemClass('admin_bookings')}>Gestión</a>
                       <a onClick={() => onNavigate('system_logs')} className={navItemClass('system_logs')}>Bitácora</a>
                       <a onClick={() => onNavigate('communications')} className={navItemClass('communications')}>Mensajería</a>
                       <a onClick={() => onNavigate('reports')} className={navItemClass('reports')}>Reportes IA</a>
                       <a onClick={() => onNavigate('users')} className={navItemClass('users')}>Usuarios</a>
                   </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Desktop Clock */}
            <div className="hidden md:flex flex-col items-end mr-2 px-3 py-1 bg-blue-800 rounded-lg border border-blue-600 shadow-sm">
                <span className="text-blue-100 text-xs uppercase font-semibold tracking-wider">{dateStr}</span>
                <span className="text-white font-mono text-lg leading-none font-bold">{timeStr}</span>
            </div>

            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
                <button 
                    onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                    className="p-2 rounded-full text-blue-200 hover:text-white hover:bg-blue-600 focus:outline-none relative"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 block h-4 w-4 rounded-full ring-2 ring-blue-700 bg-red-500 text-white text-[10px] font-bold text-center leading-3">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>

                {/* Dropdown */}
                {showNotifDropdown && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5">
                        <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-sm font-bold text-gray-700">Notificaciones</h3>
                            <button onClick={fetchNotifications} className="text-xs text-blue-500 hover:underline">Refrescar</button>
                        </div>
                        
                        {/* Request Permission Button if needed */}
                        {'Notification' in window && Notification.permission === 'default' && (
                             <button 
                                onClick={() => Notification.requestPermission()}
                                className="w-full text-center bg-blue-50 text-blue-600 text-xs py-2 hover:bg-blue-100"
                             >
                                🔔 Activar Alertas de Escritorio
                             </button>
                        )}

                        <div className="max-h-64 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="px-4 py-6 text-center text-sm text-gray-400">No tienes notificaciones.</div>
                            ) : (
                                notifications.map(notif => (
                                    <div 
                                        key={notif.id} 
                                        onClick={() => handleRead(notif.id)}
                                        className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer ${notif.isRead ? 'opacity-60' : 'bg-blue-50'}`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <p className={`text-sm ${notif.isRead ? 'font-medium text-gray-700' : 'font-bold text-gray-900'}`}>{notif.title}</p>
                                            {!notif.isRead && <span className="h-2 w-2 bg-blue-600 rounded-full mt-1"></span>}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notif.message}</p>
                                        <p className="text-[10px] text-gray-400 mt-1 text-right">
                                            {new Date(notif.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="text-white text-sm text-right hidden sm:block">
                <div className="font-bold">{user.name}</div>
                <div className="text-xs opacity-80 uppercase tracking-wider">{user.role}</div>
            </div>
            <button 
                onClick={() => { logoutUser(); onLogout(); }}
                className="bg-blue-800 p-2 rounded-full text-white hover:bg-red-600 transition-colors border border-blue-600 hover:border-red-500"
                title="Cerrar Sesión"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};