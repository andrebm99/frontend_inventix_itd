import type { ReactNode } from 'react';
import type { Page } from '../types';
import { useAuth } from '../context/AuthContext';
import { AppFooter } from '../components/layout/AppFooter';
import { Navbar } from '../components/layout/Navbar';
import { SidebarNavigation } from '../components/layout/SidebarNavigation';

interface AppLayoutProps {
  page: Page;
  navigate: (page: Page) => void;
  children: ReactNode;
  alerts: number;
  mobile: boolean;
  setMobile: (isOpen: boolean) => void;
}

export function AppLayout({ page, navigate, children, alerts, mobile, setMobile }: AppLayoutProps) {
  const { user, activeNegocio, negocios, switchNegocio, logout, hasPermission } = useAuth();

  return (
    <div className="app-shell">
      <SidebarNavigation
        page={page}
        isOpen={mobile}
        user={user}
        activeBusiness={activeNegocio}
        businesses={negocios}
        onNavigate={navigate}
        onClose={() => setMobile(false)}
        onSwitchBusiness={switchNegocio}
        onLogout={logout}
        hasPermission={hasPermission}
      />
      <div className="main-shell">
        <Navbar
          page={page}
          activeBusiness={activeNegocio}
          user={user}
          alertCount={alerts}
          onOpenMenu={() => setMobile(true)}
          onNavigate={navigate}
          canViewAlerts={hasPermission('catalogo:read')}
        />
        <main>{children}</main>
        <AppFooter />
      </div>
    </div>
  );
}
