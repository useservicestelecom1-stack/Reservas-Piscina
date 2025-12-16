
import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { BookingCalendar } from './components/BookingCalendar';
import { CheckInOut } from './components/CheckInOut';
import { Reports } from './components/Reports';
import { UserManagement } from './components/UserManagement';
import { SubscriptionStatus } from './components/SubscriptionStatus';
import { AdminBookings } from './components/AdminBookings';
import { SystemLogs } from './components/SystemLogs';
import { NotificationCenter } from './components/NotificationCenter';
import { SuggestionBox } from './components/SuggestionBox';
import { SwimmerRanking } from './components/SwimmerRanking';
import { Login } from './components/Login';
import { getCurrentUser } from './services/storageService';
import { User, UserRole } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<string>('dashboard');

  useEffect(() => {
    const storedUser = getCurrentUser();
    if (storedUser) {
      setUser(storedUser);
    }
  }, []);

  const handleLogin = (newUser: User) => {
    setUser(newUser);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentPage('login');
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const isAdmin = user.role === UserRole.ADMIN;

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <BookingCalendar user={user} />
                </div>
                <div className="lg:col-span-1 space-y-6">
                    
                    {/* External DB Status Widget */}
                    <SubscriptionStatus user={user} />

                    <div className="bg-blue-50 p-6 rounded-lg shadow-inner">
                        <h3 className="text-lg font-bold text-blue-800 mb-2">Información General</h3>
                        <ul className="list-disc pl-5 space-y-2 text-sm text-blue-900">
                            <li><strong>Horario Temporal: 24/7</strong></li>
                            <li>Abierto todos los días (Lun-Dom)</li>
                            <li>Aforo Máx: 50 personas/hora</li>
                            <li>Recuerde realizar Check-in al llegar.</li>
                        </ul>
                    </div>
                </div>
            </div>
        );
      case 'checkin':
        return <CheckInOut user={user} />;
      case 'ranking':
        return <SwimmerRanking user={user} />;
      case 'admin_bookings':
        return isAdmin ? <AdminBookings /> : <div>Acceso Denegado</div>;
      case 'system_logs':
        return isAdmin ? <SystemLogs /> : <div>Acceso Denegado</div>;
      case 'communications':
        return isAdmin ? <NotificationCenter /> : <div>Acceso Denegado</div>;
      case 'suggestions':
        return <SuggestionBox user={user} />;
      case 'reports':
        return isAdmin ? <Reports /> : <div>Acceso Denegado</div>;
      case 'users':
        return isAdmin ? <UserManagement /> : <div>Acceso Denegado</div>;
      default:
        return <div>Página no encontrada</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans flex flex-col h-screen overflow-hidden">
      {/* Top Navbar: Header, User Profile, Notifications */}
      <div className="flex-shrink-0 z-20">
        <Navbar 
            user={user} 
            onNavigate={setCurrentPage} 
            onLogout={handleLogout} 
            currentPage={currentPage}
        />
      </div>
      
      {/* Main Layout Area */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Sidebar only for Admin */}
        {isAdmin && (
            <Sidebar 
                onNavigate={setCurrentPage} 
                currentPage={currentPage} 
            />
        )}

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-100 relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {renderContent()}
            </div>
        </main>
      </div>
    </div>
  );
};

export default App;
