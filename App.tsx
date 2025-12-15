import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { BookingCalendar } from './components/BookingCalendar';
import { CheckInOut } from './components/CheckInOut';
import { Reports } from './components/Reports';
import { UserManagement } from './components/UserManagement';
import { SubscriptionStatus } from './components/SubscriptionStatus';
import { AdminBookings } from './components/AdminBookings';
import { SystemLogs } from './components/SystemLogs';
import { NotificationCenter } from './components/NotificationCenter';
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
        // Passed user prop so component knows who to filter for
        return <CheckInOut user={user} />;
      case 'admin_bookings':
        return user.role === UserRole.ADMIN ? <AdminBookings /> : <div>Acceso Denegado</div>;
      case 'system_logs':
        return user.role === UserRole.ADMIN ? <SystemLogs /> : <div>Acceso Denegado</div>;
      case 'communications':
        return user.role === UserRole.ADMIN ? <NotificationCenter /> : <div>Acceso Denegado</div>;
      case 'reports':
        return user.role === UserRole.ADMIN ? <Reports /> : <div>Acceso Denegado</div>;
      case 'users':
        return user.role === UserRole.ADMIN ? <UserManagement /> : <div>Acceso Denegado</div>;
      default:
        return <div>Página no encontrada</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      <Navbar 
        user={user} 
        onNavigate={setCurrentPage} 
        onLogout={handleLogout} 
        currentPage={currentPage}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;