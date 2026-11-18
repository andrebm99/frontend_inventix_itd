import { ArrowLeftRight, BarChart3, Box, CalendarClock, ChartNoAxesCombined, FileChartColumn, LayoutDashboard, LogOut, Package, ShoppingBag, ShoppingCart, Truck, Users, Warehouse } from 'lucide-react';
import type { Page } from '../../types';
import type { BusinessItem, UserProfile } from '../../api/types';

const navigationGroups = [
  { title: 'GENERAL', items: [['Resumen', LayoutDashboard], ['Productos', Package], ['Movimientos', ArrowLeftRight], ['Almacenes', Warehouse], ['Lotes y vencimientos', CalendarClock], ['Proveedores', Truck], ['Ventas', ShoppingBag]] },
  { title: 'ANÁLISIS Y CONTROL', items: [['Pronósticos', ChartNoAxesCombined], ['Clasificación ABC', BarChart3], ['Reabastecimiento', ShoppingCart], ['Reportes', FileChartColumn]] },
  { title: 'ADMINISTRACIÓN', items: [['Usuarios', Users]] },
] as const;

interface SidebarNavigationProps {
  page: Page;
  isOpen: boolean;
  user: UserProfile | null;
  activeBusiness: BusinessItem | null;
  businesses: BusinessItem[];
  onNavigate: (page: Page) => void;
  onClose: () => void;
  onSwitchBusiness: (id: string) => void;
  onLogout: () => void;
}

export function SidebarNavigation({ page, isOpen, user, activeBusiness, businesses, onNavigate, onClose, onSwitchBusiness, onLogout }: SidebarNavigationProps) {
  const userInitial = user?.nombre?.[0]?.toUpperCase() ?? 'U';
  const businessInitial = activeBusiness?.nombre?.[0]?.toUpperCase() ?? 'N';
  const navigateTo = (destination: Page) => { onNavigate(destination); onClose(); };

  return (
    <>
      {isOpen && <button className="scrim" aria-label="Cerrar menú" onClick={onClose} />}
      <aside className={isOpen ? 'sidebar open' : 'sidebar'}>
        <a className="brand" href="#Resumen" onClick={() => navigateTo('Resumen')}>
          <span><Box size={24} /></span>Inventi<span className="brand-x">X</span>
        </a>
        <div className="business">
          <span className="business-avatar">{businessInitial}</span>
          <div className="business-details">
            {businesses.length > 1 ? (
              <select className="business-selector" value={activeBusiness?.id || ''} onChange={(event) => onSwitchBusiness(event.target.value)}>
                {businesses.map((business) => <option key={business.id} value={business.id}>{business.nombre}</option>)}
              </select>
            ) : <strong>{activeBusiness?.nombre || 'Mi negocio'}</strong>}
            <small>RUC {activeBusiness?.ruc || '—'}</small>
          </div>
        </div>
        <nav>
          {navigationGroups.map((group) => (
            <div className="nav-group" key={group.title}>
              <p>{group.title}</p>
              {group.items.map(([name, Icon]) => (
                <button key={name} className={page === name ? 'nav-item active' : 'nav-item'} onClick={() => navigateTo(name as Page)}>
                  <Icon size={18} />{name}
                  {name === 'Lotes y vencimientos' && <span className="nav-count">FEFO</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <button className="profile" onClick={onLogout} title="Cerrar sesión">
          <span className="avatar">{userInitial}</span>
          <span className="profile-details"><strong>{user?.nombre || 'Usuario'}</strong><small>{activeBusiness?.rol || 'OPERADOR'}</small></span>
          <LogOut size={16} />
        </button>
      </aside>
    </>
  );
}
