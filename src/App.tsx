import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, X } from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AppLayout } from "./layouts/AppLayout";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { ProductosPage } from "./pages/workspace/ProductosPage";
import { MovimientosPage } from "./pages/workspace/MovimientosPage";
import { AlmacenesPage } from "./pages/workspace/AlmacenesPage";
import { LotesPage } from "./pages/workspace/LotesPage";
import { ProveedoresPage } from "./pages/workspace/ProveedoresPage";
import { VentasPage } from "./pages/workspace/VentasPage";
import { PronosticosPage } from "./pages/workspace/PronosticosPage";
import { ClasificacionAbcPage } from "./pages/workspace/ClasificacionAbcPage";
import { ReabastecimientoPage } from "./pages/workspace/ReabastecimientoPage";
import { ReportesPage } from "./pages/workspace/ReportesPage";
import { UsuariosPage } from "./pages/workspace/UsuariosPage";
import { AlertasPage } from "./pages/workspace/AlertasPage";
import { Modal } from "./components/UI";
import { RecordForm, type FormKind } from "./components/RecordForm";
import type { Page } from "./types";
import type { Producto } from "./api/types";
import { reportsApi } from "./api/services";

const pages: Page[] = [
  "Resumen",
  "Productos",
  "Movimientos",
  "Almacenes",
  "Lotes y vencimientos",
  "Proveedores",
  "Ventas",
  "Pronósticos",
  "Clasificación ABC",
  "Reabastecimiento",
  "Reportes",
  "Usuarios",
  "Alertas",
];

function currentPage(): Page {
  try {
    const p = decodeURIComponent(location.hash.slice(1));
    return pages.includes(p as Page) ? (p as Page) : "Resumen";
  } catch {
    return "Resumen";
  }
}

function MainApp() {
  const { user, token, activeNegocio, loading } = useAuth();
  const [page, setPage] = useState<Page>(currentPage);
  const [form, setForm] = useState<
    { kind: FormKind; edit?: Producto; initialType?: string } | undefined
  >();
  const [toast, setToast] = useState("");
  const [mobile, setMobile] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    const handler = () => setPage(currentPage());
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Fetch alert count from dashboard
  const fetchAlerts = useCallback(async () => {
    if (!token || !activeNegocio) return;
    try {
      const rep = await reportsApi.getDashboard();
      const count =
        ((rep as any)?.alertas?.productosStockBajo ?? rep?.resumen?.productos_bajo_stock ?? 0) +
        ((rep as any)?.alertas?.lotesPorVencer ?? rep?.resumen?.lotes_por_vencer ?? 0);
      setAlertCount(count);
    } catch {
      // ignore
    }
  }, [token, activeNegocio]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts, refreshTrigger]);

  function navigate(p: Page) {
    location.hash = encodeURIComponent(p);
    setPage(p);
    window.scrollTo({ top: 0 });
  }

  function openForm(kind: FormKind, edit?: any, initialType?: string) {
    setForm({ kind, edit, initialType });
  }

  const handleFormSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const workspaceProps = {
    openForm,
    notify: setToast,
    refreshTrigger,
  };

  function renderPage() {
    switch (page) {
      case "Productos": return <ProductosPage {...workspaceProps} />;
      case "Movimientos": return <MovimientosPage {...workspaceProps} />;
      case "Almacenes": return <AlmacenesPage {...workspaceProps} />;
      case "Lotes y vencimientos": return <LotesPage {...workspaceProps} />;
      case "Proveedores": return <ProveedoresPage {...workspaceProps} />;
      case "Ventas": return <VentasPage {...workspaceProps} />;
      case "Pronósticos": return <PronosticosPage {...workspaceProps} />;
      case "Clasificación ABC": return <ClasificacionAbcPage {...workspaceProps} />;
      case "Reabastecimiento": return <ReabastecimientoPage {...workspaceProps} />;
      case "Reportes": return <ReportesPage {...workspaceProps} />;
      case "Usuarios": return <UsuariosPage {...workspaceProps} />;
      case "Alertas": return <AlertasPage {...workspaceProps} />;
      default: return (
        <Dashboard
          navigate={navigate}
          onMovement={() => openForm("movement")}
          onProduct={() => openForm("product")}
          onSale={() => openForm("sale")}
        />
      );
    }
  }

  if (loading) {
    return (
      <div
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: "100vh",
          background: "#f6f7f3",
          fontFamily: "Inter, sans-serif",
          color: "#174b3b",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h2 style={{ marginBottom: 8 }}>Iniciando InventiX...</h2>
          <p style={{ color: "#889988", fontSize: 13 }}>
            Conectando con la base de datos y verificando sesión
          </p>
        </div>
      </div>
    );
  }

  if (!user || !token) {
    return <Login />;
  }

  return (
    <>
      <AppLayout
        page={page}
        navigate={navigate}
        alerts={alertCount}
        mobile={mobile}
        setMobile={setMobile}
      >
        {renderPage()}
      </AppLayout>

      {form && (
        <Modal
          size={form.kind === "sale" ? "wide" : "normal"}
          title={
            form.edit
              ? form.kind === "movement"
                ? "Editar y Recalcular Movimiento"
                : "Editar Producto"
              : {
                  product: "Nuevo Producto",
                  supplier: "Nuevo Proveedor",
                  warehouse: "Nuevo Almacén",
                  user: "Invitar Usuario al Equipo",
                  movement: "Registrar Movimiento de Inventario",
                  sale: "Punto de Venta / Facturación Rápida",
                }[form.kind]
          }
          onClose={() => setForm(undefined)}
        >
          <RecordForm
            kind={form.kind}
            edit={form.edit}
            initialType={form.initialType}
            close={() => setForm(undefined)}
            notify={setToast}
            onSuccess={handleFormSuccess}
          />
        </Modal>
      )}

      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={20} />
          <span>{toast}</span>
          <button aria-label="Cerrar aviso" onClick={() => setToast("")}>
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
