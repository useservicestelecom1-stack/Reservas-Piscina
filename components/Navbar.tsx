
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
  
  // Mobile Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
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
  
  const handleMobileNavigate = (page: string) => {
      onNavigate(page);
      setIsMobileMenuOpen(false); // Close menu after click
  };

  const navItemClass = (page: string) => 
    `cursor-pointer px-3 py-2 rounded-md text-sm font-medium ${currentPage === page ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-600'}`;

  const mobileNavItemClass = (page: string) =>
    `block px-3 py-2 rounded-md text-base font-medium ${currentPage === page ? 'bg-blue-900 text-white' : 'text-blue-100 hover:bg-blue-600 hover:text-white'}`;

  // Format date: "Mie, 23 Oct"
  const dateStr = currentTime.toLocaleDateString('es-PA', { weekday: 'short', day: 'numeric', month: 'short' });
  // Format time: "14:30:45"
  const timeStr = currentTime.toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const isAdmin = user.role === UserRole.ADMIN;

  return (
    <nav className="bg-blue-700 shadow-lg relative z-50">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
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
            
            {/* Desktop Menu - ONLY for Non-Admins (Admins use Sidebar) */}
            {!isAdmin && (
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  <a onClick={() => onNavigate('dashboard')} className={navItemClass('dashboard')}>Reservas</a>
                  <a onClick={() => onNavigate('checkin')} className={navItemClass('checkin')}>Control Acceso</a>
                  <a onClick={() => onNavigate('ranking')} className={navItemClass('ranking')}>🏆 Ranking</a>
                  <a onClick={() => onNavigate('suggestions')} className={navItemClass('suggestions')}>Sugerencias</a>
                </div>
              </div>
            )}
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

            <div className="flex items-center gap-3">
                <div className="text-white text-sm text-right hidden sm:block">
                    <div className="font-bold">{user.name}</div>
                    <div className="text-xs opacity-80 uppercase tracking-wider">{user.role}</div>
                </div>
                
                {/* Avatar / Profile Pic */}
                {user.photoUrl ? (
                    <img 
                        src={user.photoUrl} 
                        alt="Profile" 
                        className="h-9 w-9 rounded-full border-2 border-white shadow-sm object-cover hidden sm:block"
                    />
                ) : (
                    <div className="h-9 w-9 rounded-full bg-blue-500 hidden sm:flex items-center justify-center text-white font-bold border-2 border-blue-400">
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                )}

                <button 
                    onClick={() => { logoutUser(); onLogout(); }}
                    className="bg-blue-800 p-2 rounded-full text-white hover:bg-red-600 transition-colors border border-blue-600 hover:border-red-500 hidden sm:block"
                    title="Cerrar Sesión"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                </button>

                {/* Mobile Menu Button */}
                <div className="-mr-2 flex md:hidden">
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        type="button"
                        className="bg-blue-800 inline-flex items-center justify-center p-2 rounded-md text-blue-200 hover:text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-blue-800 focus:ring-white"
                        aria-controls="mobile-menu"
                        aria-expanded="false"
                    >
                        <span className="sr-only">Abrir menú principal</span>
                        {!isMobileMenuOpen ? (
                            <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        ) : (
                            <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu (Hamburger) */}
      {isMobileMenuOpen && (
          <div className="md:hidden bg-blue-800 border-t border-blue-600" id="mobile-menu">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                
                {/* User Info in Menu (Mobile Only) */}
                <div className="flex items-center px-3 py-3 border-b border-blue-700 mb-2">
                    <div className="flex-shrink-0">
                         {user.photoUrl ? (
                            <img className="h-10 w-10 rounded-full border border-blue-300" src={user.photoUrl} alt="" />
                         ) : (
                            <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                         )}
                    </div>
                    <div className="ml-3">
                        <div className="text-base font-medium leading-none text-white">{user.name}</div>
                        <div className="text-sm font-medium leading-none text-blue-300 mt-1">{user.role}</div>
                    </div>
                    <button 
                        onClick={() => { logoutUser(); onLogout(); }}
                        className="ml-auto bg-red-600 text-white text-xs px-2 py-1 rounded"
                    >
                        Salir
                    </button>
                </div>

                {/* Navigation Links */}
                {!isAdmin ? (
                    // User Links
                    <>
                        <a onClick={() => handleMobileNavigate('dashboard')} className={mobileNavItemClass('dashboard')}>Reservas</a>
                        <a onClick={() => handleMobileNavigate('checkin')} className={mobileNavItemClass('checkin')}>Control Acceso</a>
                        <a onClick={() => handleMobileNavigate('ranking')} className={mobileNavItemClass('ranking')}>🏆 Ranking</a>
                        <a onClick={() => handleMobileNavigate('suggestions')} className={mobileNavItemClass('suggestions')}>Sugerencias</a>
                    </>
                ) : (
                    // Admin Links (Replicating Sidebar)
                    <>
                        <a onClick={() => handleMobileNavigate('dashboard')} className={mobileNavItemClass('dashboard')}>📅 Tablero Reservas</a>
                        <a onClick={() => handleMobileNavigate('checkin')} className={mobileNavItemClass('checkin')}>⏱️ Control Acceso</a>
                        <div className="border-t border-blue-700 my-2 pt-2 pb-1 px-3 text-xs text-blue-400 font-bold uppercase">Administración</div>
                        <a onClick={() => handleMobileNavigate('ranking')} className={mobileNavItemClass('ranking')}>🏆 Ranking</a>
                        <a onClick={() => handleMobileNavigate('admin_bookings')} className={mobileNavItemClass('admin_bookings')}>📝 Gestión Reservas</a>
                        <a onClick={() => handleMobileNavigate('reports')} className={mobileNavItemClass('reports')}>📊 Reportes</a>
                        <a onClick={() => handleMobileNavigate('users')} className={mobileNavItemClass('users')}>👥 Usuarios</a>
                        <div className="border-t border-blue-700 my-2 pt-2 pb-1 px-3 text-xs text-blue-400 font-bold uppercase">Sistema</div>
                        <a onClick={() => handleMobileNavigate('communications')} className={mobileNavItemClass('communications')}>📨 Mensajería</a>
                        <a onClick={() => handleMobileNavigate('suggestions')} className={mobileNavItemClass('suggestions')}>🗳️ Buzón</a>
                        <a onClick={() => handleMobileNavigate('system_logs')} className={mobileNavItemClass('system_logs')}>🗄️ Bitácora</a>
                    </>
                )}
            </div>
          </div>
      )}
    </nav>
  );
};
