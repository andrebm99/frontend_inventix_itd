import { Bell, Menu } from "lucide-react";
import type { Page } from "../../types";
import type { BusinessItem, UserProfile } from "../../api/types";

interface NavbarProps {
  page: Page;
  activeBusiness: BusinessItem | null;
  user: UserProfile | null;
  alertCount: number;
  onOpenMenu: () => void;
  onNavigate: (page: Page) => void;
}

export function Navbar({
  page,
  activeBusiness,
  user,
  alertCount,
  onOpenMenu,
  onNavigate,
}: NavbarProps) {
  const userInitial = user?.nombre?.[0]?.toUpperCase() ?? "U";

  return (
    <header className="topbar">
      <div className="breadcrumb">
        <button
          className="mobile-menu"
          aria-label="Abrir menú"
          onClick={onOpenMenu}
        >
          <Menu size={22} />
        </button>
        <span>{activeBusiness?.nombre || "Mi negocio"}</span>
        <span>/</span>
        <strong>{page}</strong>
      </div>
      <div className="top-actions">
        <button
          className="notification"
          aria-label={`${alertCount} alertas`}
          onClick={() => onNavigate("Alertas")}
        >
          <Bell size={20} />
          {alertCount > 0 && <i />}
        </button>
      </div>
    </header>
  );
}
