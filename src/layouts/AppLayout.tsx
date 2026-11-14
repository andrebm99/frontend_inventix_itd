import type { ReactNode } from 'react';
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  Warehouse,
  CalendarClock,
  Truck,
  ShoppingBag,
  ChartNoAxesCombined,
  Layers,
  ShoppingCart,
  FileChartColumn,
  Users,
  Bell,
  Menu,
  LogOut,
  Box,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import type { Page } from '../types';
import { useAuth } from '../context/AuthContext';

const groups = [
  {
    title: 'GENERAL',
    items: [
      ['Resumen', LayoutDashboard],
      ['Productos', Package],
      ['Movimientos', ArrowLeftRight],
      ['Almacenes', Warehouse],
      ['Lotes y vencimientos', CalendarClock],
      ['Proveedores', Truck],
      ['Ventas', ShoppingBag],
    ],
  },
  {
    title: 'INTELIGENCIA & ANÁLISIS',
    items: [
      ['Reabastecimiento', ShoppingCart],
      ['Pronósticos', ChartNoAxesCombined],
      ['Clasificación ABC', Layers],
      ['Reportes', FileChartColumn],
    ],
  },
  {
    title: 'ADMINISTRACIÓN',
    items: [['Usuarios', Users]],
  },
] as const;

export function AppLayout({
  page,
  navigate,
  children,
  alerts,
  mobile,
  setMobile,
}: {
  page: Page;
  navigate: (p: Page) => void;
  children: ReactNode;
  alerts: number;
  mobile: boolean;
  setMobile: (v: boolean) => void;
}) {
  const { user, activeNegocio, negocios, switchNegocio, logout } = useAuth();

  const userInitial = user?.nombre ? user.nombre[0].toUpperCase() : 'U';
  const bizInitial = activeNegocio?.nombre ? activeNegocio.nombre[0].toUpperCase() : 'N';

  return (
    <div className="app-shell">
      {mobile && <button className="scrim" aria-label="Cerrar menú" onClick={() => setMobile(false)} />}
      <aside className={mobile ? 'sidebar open' : 'sidebar'}>
        <a className="brand" href="#Resumen" onClick={() => navigate('Resumen')}>
          <span>
            <Box size={24} />
          </span>
          Inventi<span className="brand-x">X</span>
        </a>

        <div className="business" style={{ position: 'relative' }}>
          <span className="business-avatar">{bizInitial}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            {negocios.length > 1 ? (
              <select
                value={activeNegocio?.id || ''}
                onChange={(e) => switchNegocio(e.target.value)}
                style={{
                  width: '100%',
                  fontWeight: 600,
                  fontSize: 11,
                  padding: '2px 4px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {negocios.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nombre}
                  </option>
                ))}
              </select>
            ) : (
              <strong style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {activeNegocio?.nombre || 'Mi Negocio'}
              </strong>
            )}
            <small>RUC {activeNegocio?.ruc || '—'}</small>
          </div>
        </div>

        <nav>
          {groups.map((g) => (
            <div className="nav-group" key={g.title}>
              <p>{g.title}</p>
              {g.items.map(([name, Icon]) => (
                <button
                  key={name}
                  className={page === name ? 'nav-item active' : 'nav-item'}
                  onClick={() => {
                    navigate(name as Page);
                    setMobile(false);
                  }}
                >
                  <Icon size={18} />
                  {name}
                  {name === 'Lotes y vencimientos' && <span className="nav-count">FEFO</span>}
                  {name === 'Reabastecimiento' && (
                    <span
                      style={{
                        marginLeft: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        fontSize: 9,
                        background: '#e9f3ec',
                        color: '#28634f',
                        padding: '1px 5px',
                        borderRadius: 4,
                      }}
                    >
                      <Sparkles size={10} /> IA
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-note">
          <span className="dot" style={{ background: '#28634f' }} />
          <strong>API NestJS Conectada</strong>
          <p>Multi-tenant en tiempo real.</p>
        </div>

        <button className="profile" onClick={logout} title="Cerrar sesión">
          <span className="avatar">{userInitial}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <strong>{user?.nombre || 'Usuario'}</strong>
            <small>{activeNegocio?.rol || 'OPERADOR'}</small>
          </span>
          <LogOut size={16} />
        </button>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button className="mobile-menu" aria-label="Abrir menú" onClick={() => setMobile(true)}>
              <Menu size={22} />
            </button>
            <span>{activeNegocio?.nombre || 'Mi Negocio'}</span>
            <span>/</span>
            <strong>{page}</strong>
          </div>

          <div className="top-actions">
            <span className="local-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="dot" style={{ background: '#28634f' }} />
              <span>Base de Datos MySQL (localhost:4000)</span>
            </span>

            <button className="notification" aria-label={`${alerts} alertas`} onClick={() => navigate('Alertas')}>
              <Bell size={20} />
              {alerts > 0 && <i />}
            </button>

            <span className="avatar small" title={user?.correo}>
              {userInitial}
            </span>
          </div>
        </header>

        <main>{children}</main>

        <footer>
          InventiX · Plataforma Inteligente B2B para Gestión de Inventario
          <span>
            Conectado a API v1 <ArrowUpRight size={12} />
          </span>
        </footer>
      </div>
    </div>
  );
}
