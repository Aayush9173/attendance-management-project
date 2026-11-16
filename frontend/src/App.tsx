import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import type { AuthUser } from './types';
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

interface ParsedRoute {
  tab: string;
  employeeCode: string | null;
  originTab: string;
}

interface HistoryState {
  tab: string;
  employeeCode: string | null;
  originTab: string;
  fromInternalNav: boolean;
  sessionId: string;
}

function parseHash(hash: string): ParsedRoute {
  const clean = hash.replace(/^#\/?/, '');
  if (!clean) {
    return { tab: '', employeeCode: null, originTab: 'admin-employees' };
  }
  const [path, queryString] = clean.split('?');
  const params = new URLSearchParams(queryString || '');
  return {
    tab: path,
    employeeCode: params.get('code') || null,
    originTab: params.get('origin') || 'admin-employees',
  };
}

function buildHash(tab: string, employeeCode?: string | null, originTab?: string): string {
  if (tab === 'admin-employee-profile' && employeeCode) {
    const params = new URLSearchParams();
    params.set('code', employeeCode);
    if (originTab) params.set('origin', originTab);
    return `#/admin-employee-profile?${params.toString()}`;
  }
  return `#/${tab}`;
}

function resolveAuthorizedRoute(
  parsed: ParsedRoute,
  userRole: 'admin' | 'employee'
): ParsedRoute {
  const isAdmin = userRole === 'admin';
  const allowedTabs = isAdmin ? ADMIN_TABS : EMPLOYEE_TABS;
  const defaultTab = isAdmin ? 'admin-dashboard' : 'employee-dashboard';

  let targetTab = allowedTabs.includes(parsed.tab) ? parsed.tab : defaultTab;
  let code = parsed.employeeCode;
  let origin = isAdmin && ADMIN_TABS.includes(parsed.originTab) ? parsed.originTab : 'admin-employees';

  // Admin profile requires admin role AND a valid employee code
  if (targetTab === 'admin-employee-profile') {
    if (!isAdmin || !code || !code.trim()) {
      targetTab = origin;
      code = null;
    }
  } else {
    code = null;
  }

  return { tab: targetTab, employeeCode: code, originTab: origin };
}

const MainLayout: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('');
  const [viewingEmployeeCode, setViewingEmployeeCode] = useState<string | null>(null);
  const [profileOriginTab, setProfileOriginTab] = useState<string>('admin-employees');

  const currentSessionIdRef = useRef<string>('');
  const prevUserRef = useRef<AuthUser | null>(null);
  const isInitializedRef = useRef<boolean>(false);

  // Authentication initialization, session ID management, and route restoration
  useEffect(() => {
    // While authentication is restoring, do not touch routes or state
    if (isLoading) {
      return;
    }

    // Unauthenticated state
    if (!user || !isAuthenticated) {
      currentSessionIdRef.current = '';
      isInitializedRef.current = false;
      prevUserRef.current = null;
      setActiveTab('');
      setViewingEmployeeCode(null);
      setProfileOriginTab('admin-employees');

      // Strip any protected hash on logout / unauthenticated view
      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname);
      }
      return;
    }

    // Authenticated state
    const prevUser = prevUserRef.current;
    prevUserRef.current = user;

    const existingSessionId = window.history.state?.sessionId;
    const isSameUserReload =
      existingSessionId &&
      typeof existingSessionId === 'string' &&
      existingSessionId.startsWith(`${user.id}_`);

    if (!isInitializedRef.current) {
      isInitializedRef.current = true;

      if (isSameUserReload) {
        // Page reload (F5) within the same authenticated session
        currentSessionIdRef.current = existingSessionId;

        const parsed = parseHash(window.location.hash);
        const authorized = resolveAuthorizedRoute(parsed, user.role);

        // Normalize state on reload: fromInternalNav is false so UI Back uses fallback
        const nextState: HistoryState = {
          tab: authorized.tab,
          employeeCode: authorized.employeeCode,
          originTab: authorized.originTab,
          fromInternalNav: false,
          sessionId: currentSessionIdRef.current,
        };
        window.history.replaceState(
          nextState,
          '',
          buildHash(authorized.tab, authorized.employeeCode, authorized.originTab)
        );

        setActiveTab(authorized.tab);
        setViewingEmployeeCode(authorized.employeeCode);
        setProfileOriginTab(authorized.originTab);
      } else {
        // Brand-new login or user switch
        const newSessionId = `${user.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        currentSessionIdRef.current = newSessionId;

        const defaultTab = user.role === 'admin' ? 'admin-dashboard' : 'employee-dashboard';
        const nextState: HistoryState = {
          tab: defaultTab,
          employeeCode: null,
          originTab: 'admin-employees',
          fromInternalNav: false,
          sessionId: newSessionId,
        };
        window.history.replaceState(nextState, '', buildHash(defaultTab));

        setActiveTab(defaultTab);
        setViewingEmployeeCode(null);
        setProfileOriginTab('admin-employees');
      }
    } else if (prevUser && prevUser.id !== user.id) {
      // User switched without full reload
      const newSessionId = `${user.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      currentSessionIdRef.current = newSessionId;

      const defaultTab = user.role === 'admin' ? 'admin-dashboard' : 'employee-dashboard';
      const nextState: HistoryState = {
        tab: defaultTab,
        employeeCode: null,
        originTab: 'admin-employees',
        fromInternalNav: false,
        sessionId: newSessionId,
      };
      window.history.replaceState(nextState, '', buildHash(defaultTab));

      setActiveTab(defaultTab);
      setViewingEmployeeCode(null);
      setProfileOriginTab('admin-employees');
    }
  }, [user, isAuthenticated, isLoading]);

  // Browser Back/Forward navigation listener
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Unauthenticated: ensure protected routes are not accessible
      if (!user || !isAuthenticated) {
        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname);
        }
        return;
      }

      // Check session identifier
      const stateSessionId = event.state?.sessionId;
      const defaultTab = user.role === 'admin' ? 'admin-dashboard' : 'employee-dashboard';

      // Reject stale history entries from previous sessions or unauthenticated entries
      if (!stateSessionId || stateSessionId !== currentSessionIdRef.current) {
        const nextState: HistoryState = {
          tab: defaultTab,
          employeeCode: null,
          originTab: 'admin-employees',
          fromInternalNav: false,
          sessionId: currentSessionIdRef.current,
        };
        window.history.replaceState(nextState, '', buildHash(defaultTab));

        setActiveTab(defaultTab);
        setViewingEmployeeCode(null);
        setProfileOriginTab('admin-employees');
        return;
      }

      // Parse hash (never blindly trust event.state route data)
      const parsed = parseHash(window.location.hash);
      const authorized = resolveAuthorizedRoute(parsed, user.role);

      // If the URL was modified or unauthorized, sanitize it
      const targetHash = buildHash(authorized.tab, authorized.employeeCode, authorized.originTab);
      if (window.location.hash !== targetHash) {
        const nextState: HistoryState = {
          tab: authorized.tab,
          employeeCode: authorized.employeeCode,
          originTab: authorized.originTab,
          fromInternalNav: !!event.state?.fromInternalNav,
          sessionId: currentSessionIdRef.current,
        };
        window.history.replaceState(nextState, '', targetHash);
      }

      setActiveTab(authorized.tab);
      setViewingEmployeeCode(authorized.employeeCode);
      setProfileOriginTab(authorized.originTab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user, isAuthenticated]);

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

  const handleTabChange = (tab: string, options?: { replace?: boolean }) => {
    const validTab = allowedTabs.includes(tab) ? tab : defaultTab;

    // Prevent pushing duplicate history entries when clicking current active tab
    if (!options?.replace && validTab === currentTab && !viewingEmployeeCode) {
      return;
    }

    const hash = buildHash(validTab);
    const nextState: HistoryState = {
      tab: validTab,
      employeeCode: null,
      originTab: profileOriginTab,
      fromInternalNav: true,
      sessionId: currentSessionIdRef.current,
    };

    if (options?.replace) {
      window.history.replaceState(nextState, '', hash);
    } else {
      window.history.pushState(nextState, '', hash);
    }

    setViewingEmployeeCode(null);
    setActiveTab(validTab);
  };

  const handleViewEmployee = (employeeCode: string, originTab: string = 'admin-employees') => {
    if (!isAdmin) return;

    const validOrigin = ADMIN_TABS.includes(originTab) ? originTab : 'admin-employees';
    const hash = buildHash('admin-employee-profile', employeeCode, validOrigin);
    const nextState: HistoryState = {
      tab: 'admin-employee-profile',
      employeeCode,
      originTab: validOrigin,
      fromInternalNav: true,
      sessionId: currentSessionIdRef.current,
    };

    window.history.pushState(nextState, '', hash);

    setViewingEmployeeCode(employeeCode);
    setProfileOriginTab(validOrigin);
    setActiveTab('admin-employee-profile');
  };

  const handleProfileBack = (targetTab?: string) => {
    const isFromInternalNav = window.history.state?.fromInternalNav === true;
    if (isFromInternalNav) {
      window.history.back();
    } else {
      const fallbackTab = targetTab || profileOriginTab || 'admin-employees';
      handleTabChange(fallbackTab, { replace: true });
    }
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
        onTabChange={(tab) => handleTabChange(tab)}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {/* Employee Views */}
        {!isAdmin && (
          <>
            {currentTab === 'employee-dashboard' && (
              <EmployeeDashboard onNavigateHistory={() => handleTabChange('employee-history')} />
            )}
            {currentTab === 'employee-history' && <MyAttendancePage />}
          </>
        )}

        {/* Admin Views */}
        {isAdmin && (
          <>
            {currentTab === 'admin-dashboard' && <AdminDashboard onNavigate={(tab) => handleTabChange(tab)} />}
            {currentTab === 'admin-attendance' && (
              <AdminAttendancePage onViewEmployee={(code) => handleViewEmployee(code, 'admin-attendance')} />
            )}
            {currentTab === 'admin-employees' && (
              <AdminEmployeesPage
                onViewEmployee={(code) => handleViewEmployee(code, 'admin-employees')}
                onNavigateToAttendance={() => handleTabChange('admin-attendance')}
              />
            )}
            {currentTab === 'admin-schedule' && <AdminSchedulePage />}
            {currentTab === 'admin-exceptions' && <AdminExceptionsPage />}
            {currentTab === 'admin-settings' && <AdminSettingsPage />}
            {currentTab === 'admin-employee-profile' && viewingEmployeeCode && (
              <AdminEmployeeProfilePage
                employeeCode={viewingEmployeeCode}
                originTab={profileOriginTab}
                onBack={handleProfileBack}
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
