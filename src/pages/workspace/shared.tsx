import type { ReactNode } from "react";
import { Search } from "lucide-react";
import type { FormKind } from "../../components/RecordForm";
import type { Producto, StockAlmacen } from "../../api/types";

export interface WorkspacePageProps {
  openForm: (kind: FormKind, edit?: any, initialType?: string) => void;
  notify: (message: string) => void;
  refreshTrigger: number;
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">MÓDULO DE GESTIÓN OPERATIVA</p>
        <h1>
          {title}<span className="heading-dot">.</span>
        </h1>
        <p>{description}</p>
      </div>
      {actions && <div className="heading-actions">{actions}</div>}
    </div>
  );
}

export function SearchToolbar({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children?: ReactNode;
}) {
  return (
    <div className="toolbar">
      <label className="search">
        <Search size={18} />
        <input
          aria-label="Buscar"
          placeholder="Buscar por nombre, código SKU o referencia..."
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      {children}
      <span className="toolbar-note">
        Los resultados corresponden a los registros guardados.
      </span>
    </div>
  );
}

export function getProductStock(stock: StockAlmacen[], productId: string) {
  return stock
    .filter((item) => item.productoId === productId)
    .reduce((total, item) => total + Number(item.cantidad), 0);
}

export function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
