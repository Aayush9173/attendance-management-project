import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { Navbar } from './components/Navbar';
import { EmployeeDashboard } from './pages/employee/EmployeeDashboard';
import { MyAttendancePage } from './pages/employee/MyAttendancePage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminAttendancePage } from './pages/admin/AdminAttendancePage';
import { AdminEmployeesPage } from './pages/admin/AdminEmployeesPage';
import { AdminSchedulePage } from './pages/admin/AdminSchedulePage';
import { AdminExceptionsPage } from './pages/admin/AdminExceptionsPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { AdminEmployeeProfilePage } from './pages/admin/AdminEmployeeProfilePage';
import { Loader2 } from 'lucide-react';

const ADMIN_TABS = [
  'admin-dashboard',
  'admin-attendance',
  'admin-employees',
  'admin-schedule',
  'admin-exceptions',
  'admin-settings',
  'admin-employee-profile',
];

const EMPLOYEE_TABS = [
  'employee-dashboard',
  'employee-history',
];

const MainLayout: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('');
  const [viewingEmployeeCode, setViewingEmployeeCode] = useState<string | null>(null);
  const [profileOriginTab, setProfileOriginTab] = useState<string>('admin-employees');

  // Requirement 5: Automatically reset tab to default when user logs in, logs out, or switches role
  useEffect(() => {
    if (user) {
      const defaultTab = user.role === 'admin' ? 'admin-dashboard' : 'employee-dashboard';
      setActiveTab(defaultTab);
      setViewingEmployeeCode(null);
      setProfileOriginTab('admin-employees');
    } else {
      setActiveTab('');
      setViewingEmployeeCode(null);
      setProfileOriginTab('admin-employees');
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <Loader2 className="w-9 h-9 animate-spin text-indigo-600" />
        <p className="text-sm font-semibold text-slate-600">Initializing Attendance System...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <LoginPage />;
  }

  const isAdmin = user.role === 'admin';
  const allowedTabs = isAdmin ? ADMIN_TABS : EMPLOYEE_TABS;
  const defaultTab = isAdmin ? 'admin-dashboard' : 'employee-dashboard';

  // Fallback to role-specific default tab if current selection is invalid or empty
  const currentTab = allowedTabs.includes(activeTab) ? activeTab : defaultTab;

  // Handler to open an employee's profile from attendance logs or user management (Requirement 3)
  const handleViewEmployee = (employeeCode: string, originTab: string = 'admin-employees') => {
    setViewingEmployeeCode(employeeCode);
    setProfileOriginTab(originTab);
    setActiveTab('admin-employee-profile');
  };

  const handleTabChange = (tab: string) => {
    setViewingEmployeeCode(null);
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Navigation */}
      <Navbar
        activeTab={
          currentTab === 'admin-employee-profile'
            ? profileOriginTab || 'admin-employees'
            : currentTab
        }
        onTabChange={handleTabChange}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {/* Employee Views */}
        {!isAdmin && (
          <>
            {currentTab === 'employee-dashboard' && (
              <EmployeeDashboard onNavigateHistory={() => setActiveTab('employee-history')} />
            )}
            {currentTab === 'employee-history' && <MyAttendancePage />}
          </>
        )}

        {/* Admin Views */}
        {isAdmin && (
          <>
            {currentTab === 'admin-dashboard' && <AdminDashboard onNavigate={handleTabChange} />}
            {currentTab === 'admin-attendance' && (
              <AdminAttendancePage onViewEmployee={(code) => handleViewEmployee(code, 'admin-attendance')} />
            )}
            {currentTab === 'admin-employees' && (
              <AdminEmployeesPage
                onViewEmployee={(code) => handleViewEmployee(code, 'admin-employees')}
                onNavigateToAttendance={() => setActiveTab('admin-attendance')}
              />
            )}
            {currentTab === 'admin-schedule' && <AdminSchedulePage />}
            {currentTab === 'admin-exceptions' && <AdminExceptionsPage />}
            {currentTab === 'admin-settings' && <AdminSettingsPage />}
            {currentTab === 'admin-employee-profile' && viewingEmployeeCode && (
              <AdminEmployeeProfilePage
                employeeCode={viewingEmployeeCode}
                originTab={profileOriginTab}
                onBack={(targetTab) => {
                  setViewingEmployeeCode(null);
                  setActiveTab(targetTab || profileOriginTab || 'admin-employees');
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4">
          <p>&copy; {new Date().getFullYear()} Attendance Management System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}

export default App;
