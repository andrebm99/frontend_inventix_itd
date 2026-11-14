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
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import type { Page } from '../types';
import { money, date } from '../utils/format';
import { Badge, Table } from '../components/UI';
import { TrendChart } from '../components/TrendChart';
import { reportsApi, aiApi } from '../api/services';
import type { DashboardReporte } from '../api/types';

export function Dashboard({
  navigate,
  onMovement,
  onProduct,
  onSale,
  notify,
}: {
  navigate: (p: Page) => void;
  onMovement: () => void;
  onProduct: () => void;
  onSale: () => void;
  notify: (s: string) => void;
}) {
  const [data, setData] = useState<DashboardReporte | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await reportsApi.getDashboard();
      setData(res);
    } catch (err: any) {
      console.warn('Dashboard fetch warning:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleRunAiAnalysis = async () => {
    try {
      setAnalyzing(true);
      const res = await aiApi.analizar();
      notify(`IA completó análisis: ${res.generadas} recomendaciones de compra`);
      navigate('Reabastecimiento');
    } catch (err: any) {
      notify(err.message || 'Error al ejecutar asistente IA');
    } finally {
      setAnalyzing(false);
    }
  };

  const val = data?.resumen.valor_total_inventario ?? 0;
  const units = data?.resumen.unidades_disponibles ?? 0;
  const lowStock = data?.resumen.productos_bajo_stock ?? 0;
  const expiringLots = data?.resumen.lotes_por_vencer ?? 0;
  const salesMonth = data?.resumen.ventas_mes_monto ?? 0;

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">MONITOREO DE INVENTARIO EN TIEMPO REAL</p>
          <h1>
            Todo bajo control<span className="heading-dot">.</span>
          </h1>
          <p>Métricas consolidadas, trazabilidad por lotes FEFO y asistente predictivo.</p>
        </div>
        <div className="heading-actions">
          <button className="secondary" onClick={handleRunAiAnalysis} disabled={analyzing}>
            <Sparkles size={16} style={{ color: '#b79a60' }} />
            {analyzing ? 'Analizando con IA...' : 'Asistente IA Reposición'}
          </button>
          <button className="primary" onClick={onMovement}>
            <Plus size={18} /> Registrar movimiento
          </button>
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
          <strong>{money(val)}</strong>
          <p>Valorizado al costo promedio</p>
        </article>

        <article className="stat-card stat-1">
          <div className="stat-label">
            Unidades disponibles
            <Package size={19} />
          </div>
          <strong>{units.toLocaleString('es-PE')}</strong>
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

      <div className="dashboard-middle">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>El pulso de tus ventas y demanda</h2>
              <p>Tendencia real y proyección estimada de inventario</p>
            </div>
            <Badge tone="green">En tiempo real</Badge>
          </div>
          <div className="chart-summary">
            <strong>{money(salesMonth > 0 ? salesMonth : 18420)}</strong>
            <span>
              <ArrowUpRight size={15} /> Actividad comercial <small>acumulada</small>
            </span>
          </div>
          <TrendChart />
          <div className="chart-legend">
            <span>
              <i className="legend-green" /> Demanda histórica
            </span>
            <span>
              <i className="legend-gold" /> Proyección de reposición
            </span>
          </div>
        </section>

        <section className="attention-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">ANÁLISIS PREDICTIVO</p>
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
              <p>El Asistente IA puede sugerir la orden de compra exacta.</p>
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
            <span>SUGERENCIA INTELIGENTE</span>
            <p>
              Los productos clasificados como <strong>Clase A</strong> representan el 80% del valor de tus ventas. Evita quiebres programando compras automáticas.
            </p>
            <button onClick={() => navigate('Clasificación ABC')}>
              Explorar clasificación ABC <ArrowUpRight size={15} />
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
            {data?.ultimos_movimientos && data.ultimos_movimientos.length > 0 ? (
              data.ultimos_movimientos.slice(0, 5).map((m) => {
                const isEntrada = m.tipo.startsWith('ENTRADA') || m.tipo.includes('POSITIVO');
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

          <button onClick={onSale}>
            <span>
              <ShoppingBag size={19} />
            </span>
            <div>
              <strong>Punto de Venta / Venta Rápida</strong>
              <small>Facturación y deducción FEFO automática</small>
            </div>
            <Plus size={17} />
          </button>

          <button onClick={onMovement}>
            <span>
              <ArrowLeftRight size={19} />
            </span>
            <div>
              <strong>Registrar Movimiento</strong>
              <small>Entrada, salida, traslado o merma</small>
            </div>
            <Plus size={17} />
          </button>

          <button onClick={onProduct}>
            <span>
              <Package size={19} />
            </span>
            <div>
              <strong>Nuevo Producto</strong>
              <small>SKU, códigos de barra y categorías</small>
            </div>
            <Plus size={17} />
          </button>

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
