import { useState, useEffect, useCallback } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Package,
  Wallet,
  RotateCw,
  AlertTriangle,
  ChevronRight,
  Plus,
  ArrowLeftRight,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import type { Page } from '../types';
import { money, date } from '../utils/format';
import { Badge, Table } from '../components/UI';
import { reportsApi, inventoryApi } from '../api/services';
import type { DashboardReporte } from '../api/types';

export function Dashboard({
  navigate,
  onMovement,
  onProduct,
  onSale,
  hasPermission,
}: {
  navigate: (p: Page) => void;
  onMovement: () => void;
  onProduct: () => void;
  onSale: () => void;
  hasPermission: (...permissions: string[]) => boolean;
}) {
  const [data, setData] = useState<any | null>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [res, movs] = await Promise.all([
        reportsApi.getDashboard().catch(() => null),
        inventoryApi.getMovimientos().catch(() => []),
      ]);
      setData(res);
      setMovements(movs);
    } catch (err: any) {
      console.warn('Dashboard fetch warning:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const inventoryValue =
    data?.inventario?.valorTotalInventario ??
    data?.resumen?.valor_total_inventario ??
    0;
  const availableUnits =
    data?.inventario?.totalUnidadesFisicas ??
    data?.resumen?.unidades_disponibles ??
    0;
  const lowStock =
    data?.alertas?.productosStockBajo ??
    data?.resumen?.productos_bajo_stock ??
    0;
  const expiringLots =
    data?.alertas?.lotesPorVencer ??
    data?.resumen?.lotes_por_vencer ??
    0;
  const salesMonth =
    data?.ventasHoy?.totalVendido ??
    data?.resumen?.ventas_mes_monto ??
    0;

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">MONITOREO DE INVENTARIO EN TIEMPO REAL</p>
          <h1>
            Todo bajo control<span className="heading-dot">.</span>
          </h1>
          <p>Existencias, ventas, movimientos y lotes registrados en el sistema.</p>
        </div>
        <div className="heading-actions">
          {hasPermission('inventario:write') && <button className="primary" onClick={onMovement}>
            <Plus size={18} /> Registrar movimiento
          </button>}
        </div>
      </div>

      <div className="welcome-strip">
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="dot" style={{ background: '#28634f' }} />
          <span>Datos en vivo sincronizados con la base de datos</span>
          <button
            onClick={fetchDashboard}
            disabled={loading}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              color: '#637859',
            }}
            title="Recargar métricas"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </span>
        <span>
          {new Intl.DateTimeFormat('es-PE', {
            dateStyle: 'full',
            timeZone: 'America/Lima',
          }).format(new Date())}
        </span>
      </div>

      <section className="stats-grid">
        <article className="stat-card stat-0">
          <div className="stat-label">
            Valor del inventario
            <Wallet size={19} />
          </div>
          <strong>{money(inventoryValue)}</strong>
          <p>Valorizado al costo promedio</p>
        </article>

        <article className="stat-card stat-1">
          <div className="stat-label">
            Unidades disponibles
            <Package size={19} />
          </div>
          <strong>{availableUnits.toLocaleString('es-PE')}</strong>
          <p>Stock físico en almacenes</p>
        </article>

        <article className="stat-card stat-2">
          <div className="stat-label">
            Ventas del mes
            <ShoppingBag size={19} />
          </div>
          <strong>{money(salesMonth)}</strong>
          <p>Total facturado en el periodo</p>
        </article>

        <article className="stat-card stat-3">
          <div className="stat-label">
            Productos por reponer
            <AlertTriangle size={19} />
          </div>
          <strong>{String(lowStock).padStart(2, '0')}</strong>
          <p>
            {lowStock > 0 ? (
              <span className="amber-text">Bajo stock mínimo</span>
            ) : (
              'Stock cubierto'
            )}
          </p>
          <small>Cálculo de Punto de Reorden (ROP)</small>
        </article>
      </section>

      <div className="dashboard-alerts">
        <section className="attention-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">CONTROL DE EXISTENCIAS</p>
              <h2>Necesitan tu atención</h2>
            </div>
            <span className="alert-circle">
              <AlertTriangle size={19} />
            </span>
          </div>

          <button className="attention-item" onClick={() => navigate('Reabastecimiento')}>
            <span className="attention-icon red">
              <Package size={20} />
            </span>
            <div>
              <strong>{lowStock} productos en quiebre o stock bajo</strong>
              <p>Revisa el stock mínimo y define la cantidad que debes reponer.</p>
            </div>
            <ChevronRight size={18} />
          </button>

          <button className="attention-item" onClick={() => navigate('Lotes y vencimientos')}>
            <span className="attention-icon amber">
              <RotateCw size={20} />
            </span>
            <div>
              <strong>{expiringLots} lotes próximos a vencer</strong>
              <p>Prioriza su rotación inmediata bajo la regla FEFO.</p>
            </div>
            <ChevronRight size={18} />
          </button>

          <div className="tip">
            <span>RECOMENDACIÓN OPERATIVA</span>
            <p>
              Revisa primero los productos que ya alcanzaron su stock mínimo y registra la compra con el proveedor correspondiente.
            </p>
            <button onClick={() => navigate('Reabastecimiento')}>
              Revisar reabastecimiento <ArrowUpRight size={15} />
            </button>
          </div>
        </section>
      </div>

      <div className="dashboard-bottom">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Últimos movimientos de almacén</h2>
              <p>Kardex y operaciones registradas en el sistema</p>
            </div>
            <button className="text-button" onClick={() => navigate('Movimientos')}>
              Ver todos los movimientos <ChevronRight size={15} />
            </button>
          </div>

          <Table headers={['Operación', 'Tipo', 'Fecha', 'Estado']}>
            {movements.length > 0 || (data?.ultimos_movimientos && data.ultimos_movimientos.length > 0) ? (
              (movements.length > 0 ? movements : data.ultimos_movimientos).slice(0, 5).map((m: any) => {
                const isEntrada = m.tipo?.startsWith('ENTRADA') || m.tipo?.includes('POSITIVO');
                return (
                  <tr key={m.id}>
                    <td>
                      <strong>{m.motivo || 'Movimiento de inventario'}</strong>
                      <small>
                        {m.almacenOrigen?.nombre ? `${m.almacenOrigen.nombre} → ` : ''}
                        {m.almacenDestino?.nombre || 'Almacén Principal'}
                      </small>
                    </td>
                    <td>
                      <Badge tone={isEntrada ? 'green' : 'gray'}>
                        {isEntrada ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />} {m.tipo}
                      </Badge>
                    </td>
                    <td>{date(m.fecha)}</td>
                    <td>
                      <Badge
                        tone={
                          m.estado === 'COMPLETADO'
                            ? 'green'
                            : m.estado === 'APROBADO'
                              ? 'amber'
                              : m.estado === 'ANULADO'
                                ? 'red'
                                : 'gray'
                        }
                      >
                        {m.estado}
                      </Badge>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '24px 0', color: '#889988' }}>
                  No hay movimientos recientes registrados aún.
                </td>
              </tr>
            )}
          </Table>
        </section>

        <section className="panel quick-panel">
          <h2>Accesos Rápidos</h2>
          <p>Acciones cotidianas de tu operativa.</p>

          {hasPermission('venta:create') && <button onClick={onSale}>
            <span>
              <ShoppingBag size={19} />
            </span>
            <div>
              <strong>Punto de Venta / Venta Rápida</strong>
              <small>Facturación y deducción FEFO automática</small>
            </div>
            <Plus size={17} />
          </button>}

          {hasPermission('inventario:write') && <button onClick={onMovement}>
            <span>
              <ArrowLeftRight size={19} />
            </span>
            <div>
              <strong>Registrar Movimiento</strong>
              <small>Entrada, salida, traslado o merma</small>
            </div>
            <Plus size={17} />
          </button>}

          {hasPermission('catalogo:write') && <button onClick={onProduct}>
            <span>
              <Package size={19} />
            </span>
            <div>
              <strong>Nuevo Producto</strong>
              <small>SKU, códigos de barra y categorías</small>
            </div>
            <Plus size={17} />
          </button>}

          <button onClick={() => navigate('Reportes')}>
            <span>
              <Wallet size={19} />
            </span>
            <div>
              <strong>Kardex & Reportes</strong>
              <small>Exportar a Excel (CSV) o imprimir</small>
            </div>
            <ChevronRight size={17} />
          </button>

          <div className="quick-foot">InventiX · Control absoluto de tu stock.</div>
        </section>
      </div>
    </>
  );
}
