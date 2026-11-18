import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Download,
  Pencil,
  Truck,
  Warehouse,
  ArrowUpRight,
  Package,
  Printer,
  ShoppingBag,
  CheckCircle2,
  FileSpreadsheet,
  Clock,
  ShoppingCart,
  BarChart3,
  TrendingUp,
  RefreshCw,
  Eye,
  Ban,
  AlertTriangle,
  MoreVertical,
} from 'lucide-react';
import type { Page } from '../types';
import type { FormKind } from '../components/RecordForm';
import { Badge, Empty, Table, Modal } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { ThermalReceipt } from '../components/ThermalReceipt';
import { money, date, daysLeft, downloadCSV } from '../utils/format';
import {
  catalogApi,
  inventoryApi,
  organizationApi,
  salesApi,
  suppliersApi,
  reportsApi,
  iamApi,
  analyticsApi,
} from '../api/services';
import type {
  Almacen,
  AbcClassification,
  Categoria,
  IamUserItem,
  Lote,
  Movimiento,
  Producto,
  Proveedor,
  ReplenishmentPolicy,
  StockAlmacen,
  Venta,
} from '../api/types';

const descriptions: Partial<Record<Page, string>> = {
  Productos: 'Catálogo valorizado en tiempo real con control de SKU y costos.',
  Movimientos: 'Kardex continuo con ciclo Borrador → Aprobado → Completado.',
  Almacenes: 'Centros de distribución, puntos de venta y cuarentena aislada.',
  'Lotes y vencimientos': 'Trazabilidad FEFO (First-Expired, First-Out) para evitar mermas.',
  Proveedores: 'Convenios comerciales, plazos de entrega y costos preferidos.',
  Ventas: 'Punto de venta y facturación con deducción atómica de existencias.',
  Pronósticos: 'Proyección de demanda a partir del historial real de ventas.',
  'Clasificación ABC': 'Priorización del catálogo según su valor de consumo registrado.',
  Reabastecimiento: 'Stock de seguridad, punto de reorden y cantidades de reposición.',
  Reportes: 'Kardex formal, valorización de inventario y mermas exportables.',
  Usuarios: 'Control de accesos y roles (RBAC) para el equipo del negocio.',
  Alertas: 'Atención prioritaria de quiebres de stock y lotes próximos a caducar.',
};

export function Workspace({
  page,
  openForm,
  notify,
  refreshTrigger,
}: {
  page: Page;
  openForm: (kind: FormKind, edit?: any) => void;
  notify: (s: string) => void;
  refreshTrigger: number;
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [warehouseFilter, setWarehouseFilter] = useState('Todos');
  const [loading, setLoading] = useState(false);
  const [updatingCalculations, setUpdatingCalculations] = useState(false);
  const [forecastHorizon, setForecastHorizon] = useState(30);

  // Live Data States
  const [products, setProducts] = useState<Producto[]>([]);
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [warehouses, setWarehouses] = useState<Almacen[]>([]);
  const [stockList, setStockList] = useState<StockAlmacen[]>([]);
  const [lots, setLots] = useState<Lote[]>([]);
  const [movements, setMovements] = useState<Movimiento[]>([]);
  const [suppliers, setSuppliers] = useState<Proveedor[]>([]);
  const [sales, setSales] = useState<Venta[]>([]);
  const [users, setUsers] = useState<IamUserItem[]>([]);
  const [abcClassifications, setAbcClassifications] = useState<AbcClassification[]>([]);
  const [replenishmentPolicies, setReplenishmentPolicies] = useState<ReplenishmentPolicy[]>([]);
  const { user, activeNegocio } = useAuth();
  const [selectedForecastProduct, setSelectedForecastProduct] = useState('');
  const [selectedKardexProd, setSelectedKardexProd] = useState<string>('');
  const [kardexData, setKardexData] = useState<any[]>([]);

  // Modals for Sales Actions
  const [selectedSaleToView, setSelectedSaleToView] = useState<Venta | null>(null);
  const [selectedSaleToCancel, setSelectedSaleToCancel] = useState<Venta | null>(null);
  const [ticketFormat, setTicketFormat] = useState<'thermal' | 'standard'>('thermal');
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  // Modals for Movement Actions
  const [selectedViewMovement, setSelectedViewMovement] = useState<Movimiento | null>(null);
  const [cancelMovementTarget, setCancelMovementTarget] = useState<Movimiento | null>(null);
  const [cancelMovementReason, setCancelMovementReason] = useState<string>('');
  const [cancelMovementLoading, setCancelMovementLoading] = useState<boolean>(false);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  // Close action menu on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.action-menu-container')) {
        setOpenActionMenuId(null);
      }
    };
    if (openActionMenuId) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [openActionMenuId]);

  // Load active tab data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (['Productos', 'Resumen', 'Pronósticos', 'Clasificación ABC', 'Reabastecimiento', 'Alertas', 'Reportes'].includes(page)) {
        const [loadedProducts, loadedCategories, loadedStock] = await Promise.all([
          catalogApi.getProductos().catch(() => []),
          catalogApi.getCategorias().catch(() => []),
          inventoryApi.getStock().catch(() => []),
        ]);
        setProducts(loadedProducts);
        setCategories(loadedCategories);
        setStockList(loadedStock);
        if (loadedProducts.length > 0 && !selectedKardexProd) {
          setSelectedKardexProd(loadedProducts[0].id);
        }
        if (loadedProducts.length > 0 && !selectedForecastProduct) {
          setSelectedForecastProduct(loadedProducts[0].id);
        }
      }

      if (['Movimientos', 'Ventas', 'Reportes'].includes(page)) {
        const loadedMovements = await inventoryApi.getMovimientos().catch(() => []);
        setMovements(loadedMovements);
      }

      if (['Almacenes', 'Movimientos', 'Lotes y vencimientos', 'Ventas', 'Productos'].includes(page)) {
        const loadedWarehouses = await organizationApi.getAlmacenes().catch(() => []);
        setWarehouses(loadedWarehouses);
      }

      if (['Lotes y vencimientos', 'Alertas'].includes(page)) {
        const loadedLots = await catalogApi.getLotes().catch(() => []);
        setLots(loadedLots);
      }

      if (page === 'Proveedores') {
        const loadedSuppliers = await suppliersApi.getProveedores().catch(() => []);
        setSuppliers(loadedSuppliers);
      }

      if (['Ventas', 'Reportes'].includes(page)) {
        const loadedSales = await salesApi.getVentas().catch(() => []);
        setSales(loadedSales);
      }

      if (page === 'Usuarios') {
        const loadedUsers = await iamApi.getUsuarios().catch(() => []);
        setUsers(loadedUsers);
      }

      if (page === 'Clasificación ABC') {
        const loadedClassifications = await analyticsApi.getAbcClassification().catch(() => []);
        setAbcClassifications(loadedClassifications);
      }

      if (page === 'Reabastecimiento') {
        const loadedPolicies = await analyticsApi.getReplenishmentPolicies().catch(() => []);
        setReplenishmentPolicies(loadedPolicies);
      }
    } catch (err) {
      console.warn('Error loading workspace data:', err);
    } finally {
      setLoading(false);
    }
  }, [page, refreshTrigger, selectedKardexProd, selectedForecastProduct]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load Kardex when product changes in Reportes
  useEffect(() => {
    if (page === 'Reportes' && selectedKardexProd) {
      reportsApi
        .getKardex(selectedKardexProd)
        .then(setKardexData)
        .catch(() => setKardexData([]));
    }
  }, [page, selectedKardexProd]);

  const matches = (text: string) => text.toLowerCase().includes(search.toLowerCase());

  // Stock calculator per product: returns exact stock from backend or computed from stockList
  const getProductStock = (prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    if (prod && prod.stockTotal !== undefined && prod.stockTotal !== null) {
      return Number(prod.stockTotal);
    }
    return stockList
      .filter((s) => s.productoId === prodId || (s as any).producto_id === prodId)
      .reduce((acc, curr) => acc + Number(curr.cantidad ?? (curr as any).cantidad_actual ?? 0), 0);
  };

  // Stock calculator per product filtered by specific warehouse
  const getProductStockInWarehouse = (prodId: string, whIdOrName: string) => {
    if (!whIdOrName || whIdOrName === 'Todos') {
      return getProductStock(prodId);
    }
    const wh = warehouses.find((w) => w.id === whIdOrName || w.nombre === whIdOrName);
    const targetWhId = wh?.id || whIdOrName;

    return stockList
      .filter(
        (s) =>
          ((s.almacenId === targetWhId || (s as any).almacen_id === targetWhId) ||
            s.almacen?.nombre === whIdOrName) &&
          (s.productoId === prodId || (s as any).producto_id === prodId),
      )
      .reduce((acc, curr) => acc + Number(curr.cantidad ?? (curr as any).cantidad_actual ?? 0), 0);
  };

  // Movement actions
  const handleApproveMovement = async (id: string) => {
    try {
      await inventoryApi.aprobarMovimiento(id);
      notify('Movimiento aprobado con éxito');
      loadData();
    } catch (err: any) {
      notify(err.message || 'Error al aprobar movimiento');
    }
  };

  const handleCompleteMovement = async (id: string) => {
    try {
      await inventoryApi.completarMovimiento(id);
      notify('Movimiento completado. Existencias de inventario actualizadas.');
      loadData();
    } catch (err: any) {
      notify(err.message || 'Error al completar movimiento');
    }
  };

  const handleConfirmCancelMovement = async () => {
    if (!cancelMovementTarget) return;
    setCancelMovementLoading(true);
    try {
      await inventoryApi.anularMovimiento(
        cancelMovementTarget.id,
        cancelMovementReason.trim() || undefined,
      );
      notify('Movimiento anulado y existencias actualizadas con éxito');
      setCancelMovementTarget(null);
      setCancelMovementReason('');
      await loadData();
    } catch (err: any) {
      notify(`Error al anular movimiento: ${err.message || 'Error del servidor'}`);
    } finally {
      setCancelMovementLoading(false);
    }
  };

  const handleUpdateCalculations = async () => {
    try {
      setUpdatingCalculations(true);
      const result = await analyticsApi.updateCalculations(30, 14);
      notify(
        `Cálculos actualizados: ${result.updatedClassifications} clasificaciones y ${result.updatedPolicies} políticas de reposición.`,
      );
      await loadData();
    } catch (err: any) {
      notify(err.message || 'No se pudieron actualizar los cálculos');
    } finally {
      setUpdatingCalculations(false);
    }
  };

  // Export functions
  const exportProducts = () => {
    const isFiltered = warehouseFilter !== 'Todos';
    const whObj = warehouses.find((w) => w.nombre === warehouseFilter || w.id === warehouseFilter);
    const stockHeader = isFiltered ? `Stock (${whObj?.nombre || 'Almacén'})` : 'Stock Total';

    downloadCSV('inventix-productos', [
      ['SKU', 'Producto', 'Categoría', stockHeader, 'Stock General', 'Costo Promedio', 'Precio Venta', 'Valorizado Costo'],
      ...products.map((product) => {
        const currentStock = isFiltered
          ? getProductStockInWarehouse(product.id, warehouseFilter)
          : getProductStock(product.id);
        const generalStock = getProductStock(product.id);
        return [
          product.sku,
          product.nombre,
          product.categoria?.nombre || 'General',
          currentStock,
          generalStock,
          product.costoPromedio,
          product.precioVenta,
          currentStock * product.costoPromedio,
        ];
      }),
    ]);
    notify('Reporte de productos descargado en CSV');
  };

  const exportMovements = () => {
    downloadCSV('inventix-kardex-movimientos', [
      ['Fecha', 'Tipo', 'Código Producto', 'Producto', 'Estado', 'Almacén'],
      ...movements.map((m) => {
        const lineas = m.detalles && m.detalles.length > 0 ? m.detalles : (m.detalle_movimiento || []);
        const firstLine = lineas[0];
        const matchedProd =
          firstLine?.producto ||
          products.find((p) => p.id === (firstLine?.productoId || (firstLine as any)?.producto_id));
        const prodSku = matchedProd?.sku || matchedProd?.codigo_barras || '—';
        const prodNombre = matchedProd?.nombre || '—';
        return [
          m.fecha,
          m.tipo,
          prodSku,
          prodNombre,
          m.estado,
          m.almacenDestino?.nombre || m.almacenOrigen?.nombre || '',
        ];
      }),
    ]);
    notify('Reporte de movimientos descargado');
  };

  const handleConfirmCancelSale = async () => {
    if (!selectedSaleToCancel) return;
    const motivo = cancelMotivo.trim();
    if (motivo.length < 30) {
      notify('La justificación de anulación debe tener al menos 30 caracteres obligatorios.');
      return;
    }
    setCancelLoading(true);
    try {
      await salesApi.anularVenta(selectedSaleToCancel.id, motivo);
      notify(`Comprobante ${selectedSaleToCancel.numeroComprobante} anulado con éxito y stock repuesto.`);
      setSelectedSaleToCancel(null);
      setCancelMotivo('');
      loadData();
    } catch (err: any) {
      notify(`Error al anular venta: ${err.message || 'Error del servidor'}`);
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">MÓDULO DE GESTIÓN OPERATIVA</p>
          <h1>
            {page}
            <span className="heading-dot">.</span>
          </h1>
          <p>{descriptions[page]}</p>
        </div>

        <div className="heading-actions">
          {page === 'Productos' && (
            <>
              <button className="secondary" onClick={exportProducts}>
                <Download size={17} /> Exportar CSV
              </button>
              <button className="primary" onClick={() => openForm('product')}>
                <Plus size={18} /> Nuevo Producto
              </button>
            </>
          )}

          {page === 'Movimientos' && (
            <>
              <button className="secondary" onClick={exportMovements}>
                <Download size={17} /> Exportar Kardex
              </button>
              <button className="primary" onClick={() => openForm('movement')}>
                <Plus size={18} /> Registrar Movimiento
              </button>
            </>
          )}

          {page === 'Almacenes' && (
            <button className="primary" onClick={() => openForm('warehouse')}>
              <Plus size={18} /> Nuevo Almacén
            </button>
          )}

          {page === 'Proveedores' && (
            <button className="primary" onClick={() => openForm('supplier')}>
              <Plus size={18} /> Nuevo Proveedor
            </button>
          )}

          {page === 'Ventas' && (
            <button className="primary" onClick={() => openForm('sale')}>
              <Plus size={18} /> Registrar Venta (POS)
            </button>
          )}

          {['Clasificación ABC', 'Reabastecimiento'].includes(page) && (
            <button className="primary" onClick={handleUpdateCalculations} disabled={updatingCalculations}>
              <RefreshCw size={17} />
              {updatingCalculations ? 'Actualizando...' : 'Actualizar cálculos'}
            </button>
          )}

          {page === 'Usuarios' && (
            <button className="primary" onClick={() => openForm('user')}>
              <Plus size={18} /> Invitar Usuario
            </button>
          )}
        </div>
      </div>

      {/* TOOLBAR */}
      {['Productos', 'Movimientos', 'Ventas', 'Lotes y vencimientos', 'Proveedores', 'Usuarios'].includes(page) && (
        <div className="toolbar">
          <label className="search">
            <Search size={18} />
            <input
              aria-label="Buscar"
              placeholder="Buscar por nombre, código SKU o referencia..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          {page === 'Productos' && (
            <select aria-label="Filtrar categoría" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="Todos">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.nombre}>
                  {c.nombre}
                </option>
              ))}
            </select>
          )}

          {page === 'Movimientos' && (
            <select aria-label="Tipo de movimiento" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="Todos">Todos los tipos</option>
              <option value="ENTRADA_COMPRA">Entrada por Compra</option>
              <option value="SALIDA_VENTA">Salida por Venta</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="MERMA_VENCIMIENTO">Merma / Pérdida</option>
            </select>
          )}

          {['Productos', 'Movimientos', 'Lotes y vencimientos'].includes(page) && (
            <select
              aria-label="Filtrar almacén"
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
            >
              <option value="Todos">
                {page === 'Productos' ? 'Todos los almacenes (Stock general)' : 'Todos los almacenes'}
              </option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.nombre}>
                  {w.nombre} ({w.tipo})
                </option>
              ))}
            </select>
          )}

          <span className="toolbar-note">Los resultados corresponden a los registros guardados.</span>
        </div>
      )}

      {/* 1. PRODUCTOS */}
      {page === 'Productos' && (
        <section className="panel">
          <Table
            headers={[
              'Producto / SKU',
              'Categoría',
              warehouseFilter === 'Todos'
                ? 'Stock Total'
                : `Stock en ${warehouses.find((w) => w.nombre === warehouseFilter || w.id === warehouseFilter)?.nombre || 'Almacén'}`,
              'Costo Promedio',
              'Precio Venta',
              'Estado',
              'Acción',
            ]}
          >
            {products
              .filter(
                (p) =>
                  matches(p.nombre + ' ' + p.sku) &&
                  (filter === 'Todos' || p.categoria?.nombre === filter),
              )
              .map((p) => {
                const totalStock = getProductStock(p.id);
                const isFilteredByWh = warehouseFilter !== 'Todos';
                const stockQty = isFilteredByWh
                  ? getProductStockInWarehouse(p.id, warehouseFilter)
                  : totalStock;
                const isOut = stockQty === 0;
                const isLow = stockQty <= p.stockMinimo;

                return (
                  <tr key={p.id}>
                    <td>
                      <div className="product-cell">
                        <span className="product-icon">
                          <Package size={20} />
                        </span>
                        <div>
                          <strong>{p.nombre}</strong>
                          <small>
                            {p.sku} {p.codigoBarras ? `· ${p.codigoBarras}` : ''}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>{p.categoria?.nombre || 'General'}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div>
                          <strong style={{ fontSize: '1.05rem', color: isOut ? '#b91c1c' : '#1e3a29' }}>
                            {stockQty}
                          </strong>{' '}
                          <small className="inline">{p.unidadMedida?.simbolo || 'UND'}</small>
                        </div>
                        {isFilteredByWh && (
                          <small style={{ fontSize: 10, color: '#687b6e', marginTop: 2 }}>
                            Total general: {totalStock} {p.unidadMedida?.simbolo || 'UND'}
                          </small>
                        )}
                      </div>
                    </td>
                    <td>{money(p.costoPromedio)}</td>
                    <td>{money(p.precioVenta)}</td>
                    <td>
                      <Badge tone={isOut ? 'red' : isLow ? 'amber' : 'green'}>
                        {isOut ? 'Agotado' : isLow ? 'Stock Bajo' : 'Disponible'}
                      </Badge>
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label={'Editar ' + p.nombre}
                        onClick={() => openForm('product', p)}
                        title="Editar producto"
                      >
                        <Pencil size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
          </Table>
          {!products.length && !loading && <Empty text="No se encontraron productos registrados" />}
          <div className="table-footer">
            {products.length} productos registrados · Trazabilidad y costos en tiempo real
            {warehouseFilter !== 'Todos' && (
              <span style={{ marginLeft: 8, fontWeight: 600, color: '#166534' }}>
                · Filtrando existencias de:{' '}
                {warehouses.find((w) => w.nombre === warehouseFilter || w.id === warehouseFilter)?.nombre}
              </span>
            )}
          </div>
        </section>
      )}

      {/* 2. MOVIMIENTOS */}
      {page === 'Movimientos' && (
        <section className="panel" style={{ minHeight: 380 }}>
          <Table headers={['Fecha', 'Tipo de Movimiento', 'Código / Producto', 'Almacén', 'Estado', 'Acción']}>
            {movements
              .filter((m) => {
                const lineas = m.detalles && m.detalles.length > 0 ? m.detalles : (m.detalle_movimiento || []);
                const prodCodes = lineas
                  .map((d: any) => `${d.producto?.sku || ''} ${d.producto?.nombre || ''} ${d.producto?.codigo_barras || ''}`)
                  .join(' ');
                return (
                  matches(`${m.tipo} ${prodCodes}`) &&
                  (filter === 'Todos' || m.tipo === filter) &&
                  (warehouseFilter === 'Todos' ||
                    m.almacenDestino?.nombre === warehouseFilter ||
                    m.almacenOrigen?.nombre === warehouseFilter)
                );
              })
              .map((m) => {
                const isEntrada = m.tipo.startsWith('ENTRADA') || m.tipo.includes('POSITIVO');
                const lineas = m.detalles && m.detalles.length > 0 ? m.detalles : (m.detalle_movimiento || []);
                const firstLine = lineas[0];
                const matchedProd =
                  firstLine?.producto ||
                  products.find((p) => p.id === (firstLine?.productoId || (firstLine as any)?.producto_id));
                const prodSku =
                  matchedProd?.sku ||
                  matchedProd?.codigo_barras ||
                  (firstLine as any)?.producto_lote?.codigo_lote ||
                  '—';
                const prodNombre = matchedProd?.nombre || 'Producto asignado';
                const extraCount = lineas.length > 1 ? lineas.length - 1 : 0;

                return (
                  <tr key={m.id}>
                    <td>{date(m.fecha)}</td>
                    <td>
                      <Badge tone={isEntrada ? 'green' : 'gray'}>
                        {m.tipo}
                      </Badge>
                      <div style={{ fontSize: 11, color: '#7a8d80', marginTop: 3 }}>
                        Por: {m.usuario?.nombre || 'Sistema'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              fontSize: 12,
                              color: '#166534',
                              background: '#eef8f2',
                              padding: '2px 6px',
                              borderRadius: 4,
                              border: '1px solid #c7e6d3',
                            }}
                          >
                            {prodSku}
                          </span>
                          {extraCount > 0 && (
                            <span
                              style={{
                                fontSize: 10,
                                color: '#556b5b',
                                background: '#e8ece9',
                                padding: '1px 5px',
                                borderRadius: 4,
                              }}
                            >
                              +{extraCount} más
                            </span>
                          )}
                        </div>
                        <small style={{ marginTop: 2, color: '#3b4e41', fontWeight: 500 }}>
                          {prodNombre} {firstLine?.cantidad ? `(${firstLine.cantidad} uds)` : ''}
                        </small>
                      </div>
                    </td>
                    <td>
                      <div>
                        {m.almacenOrigen?.nombre && `${m.almacenOrigen.nombre} → `}
                        {m.almacenDestino?.nombre || 'Almacén Principal'}
                      </div>
                      {m.proveedor && (
                        <div style={{ fontSize: 11, color: '#274b33', marginTop: 2 }}>
                          📦 Prov: {m.proveedor.razonSocial || m.proveedor.razon_social || m.proveedor.nombre}
                        </div>
                      )}
                    </td>
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
                    <td style={{ position: 'relative' }}>
                      <div className="action-menu-container" style={{ position: 'relative', display: 'inline-block' }}>
                        <button
                          type="button"
                          className="icon-button"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 30,
                            height: 30,
                            borderRadius: 6,
                            border: '1px solid #d0dad1',
                            background: openActionMenuId === m.id ? '#eef3ef' : '#fff',
                            color: '#24372b',
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenActionMenuId(openActionMenuId === m.id ? null : m.id);
                          }}
                          title="Acciones del movimiento"
                          aria-label="Acciones del movimiento"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {openActionMenuId === m.id && (
                          <div
                            style={{
                              position: 'absolute',
                              right: 0,
                              top: 'calc(100% + 4px)',
                              zIndex: 100,
                              minWidth: 180,
                              background: '#ffffff',
                              borderRadius: 8,
                              border: '1px solid #dce4dc',
                              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                              padding: 5,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 2,
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                width: '100%',
                                padding: '7px 10px',
                                fontSize: 12,
                                fontWeight: 500,
                                borderRadius: 6,
                                border: 'none',
                                background: 'transparent',
                                color: '#24372b',
                                cursor: 'pointer',
                                textAlign: 'left',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f4f1')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                              onClick={() => {
                                setOpenActionMenuId(null);
                                setSelectedViewMovement(m);
                              }}
                            >
                              <Eye size={14} style={{ color: '#28634f' }} />
                              Ver Detalle
                            </button>

                            {m.estado !== 'ANULADO' && (
                              <button
                                type="button"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  width: '100%',
                                  padding: '7px 10px',
                                  fontSize: 12,
                                  fontWeight: 500,
                                  borderRadius: 6,
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#24372b',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f4f1')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  openForm('movement', m);
                                }}
                              >
                                <Pencil size={14} style={{ color: '#24372b' }} />
                                Editar y Recalcular
                              </button>
                            )}

                            {m.estado === 'BORRADOR' && (
                              <button
                                type="button"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  width: '100%',
                                  padding: '7px 10px',
                                  fontSize: 12,
                                  fontWeight: 500,
                                  borderRadius: 6,
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#b45309',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#fef3c7')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  handleApproveMovement(m.id);
                                }}
                              >
                                <CheckCircle2 size={14} style={{ color: '#b45309' }} />
                                Aprobar Movimiento
                              </button>
                            )}

                            {m.estado === 'APROBADO' && (
                              <button
                                type="button"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  width: '100%',
                                  padding: '7px 10px',
                                  fontSize: 12,
                                  fontWeight: 500,
                                  borderRadius: 6,
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#15803d',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#dcfce7')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  handleCompleteMovement(m.id);
                                }}
                              >
                                <CheckCircle2 size={14} style={{ color: '#15803d' }} />
                                Completar Movimiento
                              </button>
                            )}

                            {m.estado !== 'ANULADO' && (
                              <>
                                <div style={{ height: 1, background: '#eef2ef', margin: '3px 0' }} />
                                <button
                                  type="button"
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    width: '100%',
                                    padding: '7px 10px',
                                    fontSize: 12,
                                    fontWeight: 500,
                                    borderRadius: 6,
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#dc2626',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = '#fee2e2')}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                  onClick={() => {
                                    setOpenActionMenuId(null);
                                    setCancelMovementTarget(m);
                                    setCancelMovementReason('');
                                  }}
                                >
                                  <Ban size={14} style={{ color: '#dc2626' }} />
                                  Anular Movimiento
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </Table>
          {!movements.length && !loading && <Empty text="No hay movimientos registrados" />}
        </section>
      )}

      {/* 3. ALMACENES */}
      {page === 'Almacenes' && (
        <div className="cards-grid">
          {warehouses.map((w) => (
            <article className="panel warehouse-card" key={w.id}>
              <div className="supplier-top">
                <span className="card-icon">
                  <Warehouse size={25} />
                </span>
                <Badge tone={w.tipo === 'MERMAS_CUARENTENA' ? 'amber' : 'green'}>{w.tipo}</Badge>
              </div>
              <h2>{w.nombre}</h2>
              <p>Código: {w.codigo}</p>

              <div className="warehouse-metrics">
                <div>
                  <strong>{w.tipo === 'PRINCIPAL' ? 'Centro' : 'Soporte'}</strong>
                  <small>Rol Operativo</small>
                </div>
                <div>
                  <strong>{w.activo ? 'Activo' : 'Inactivo'}</strong>
                  <small>Estado</small>
                </div>
              </div>

              <div className="card-detail">
                Sucursal <strong>{w.sucursal?.nombre || 'Principal'}</strong>
              </div>

              <button className="text-button" onClick={() => openForm('movement')}>
                Registrar movimiento aquí <ArrowUpRight size={16} />
              </button>
            </article>
          ))}
        </div>
      )}

      {/* 4. LOTES Y VENCIMIENTOS (FEFO) */}
      {page === 'Lotes y vencimientos' && (
        <>
          <div className="info-banner">
            <Clock size={24} />
            <div>
              <strong>Trazabilidad FEFO: First-Expired, First-Out</strong>
              <p>
                Los lotes se priorizan automáticamente por fecha de vencimiento. Los lotes vencidos quedan bloqueados para venta y se aíslan como mermas.
              </p>
            </div>
          </div>

          <section className="panel">
            <Table headers={['Producto', 'Número de Lote', 'Vencimiento', 'Disponible', 'Costo Unit.', 'Estado']}>
              {lots
                .filter(
                  (l) =>
                    matches(l.numeroLote + ' ' + (l.producto?.nombre || '')) &&
                    (warehouseFilter === 'Todos' || l.almacen?.nombre === warehouseFilter),
                )
                .sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento))
                .map((l) => {
                  const left = daysLeft(l.fechaVencimiento);
                  const isExpired = left < 0;
                  const isSoon = left >= 0 && left <= 30;

                  return (
                    <tr key={l.id}>
                      <td>
                        <strong>{l.producto?.nombre || 'Producto'}</strong>
                        <small>{l.producto?.sku}</small>
                      </td>
                      <td className="mono">{l.numeroLote}</td>
                      <td>
                        {date(l.fechaVencimiento)}
                        <small>
                          {isExpired
                            ? `Venció hace ${Math.abs(left)} días`
                            : `${left} días restantes`}
                        </small>
                      </td>
                      <td className="quantity">{l.cantidadDisponible}</td>
                      <td>{money(l.costoUnitario)}</td>
                      <td>
                        <Badge tone={isExpired ? 'red' : isSoon ? 'amber' : 'green'}>
                          {isExpired ? 'Vencido' : isSoon ? 'Próximo a Vencer' : 'Vigente'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
            </Table>
            {!lots.length && !loading && <Empty text="No hay lotes registrados" />}
          </section>
        </>
      )}

      {/* 5. PROVEEDORES */}
      {page === 'Proveedores' && (
        <div className="cards-grid">
          {suppliers
            .filter((s) => matches(s.nombre + ' ' + s.ruc))
            .map((s) => (
              <article className="panel supplier-card" key={s.id}>
                <div className="supplier-top">
                  <span className="card-icon">
                    <Truck size={24} />
                  </span>
                  <Badge tone={s.activo ? 'green' : 'gray'}>
                    {s.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
                <h2>{s.nombre}</h2>
                <p>RUC: {s.ruc}</p>

                <div className="supplier-contact">
                  {s.correo && <a href={`mailto:${s.correo}`}>{s.correo}</a>}
                  {s.telefono && <a href={`tel:${s.telefono}`}>{s.telefono}</a>}
                </div>

                <div className="card-detail">
                  Tiempo de Entrega (Lead Time) <strong>{s.leadTimeDias} días</strong>
                </div>

                <div className="card-detail">
                  Razón Social <strong>{s.razonSocial || s.nombre}</strong>
                </div>
              </article>
            ))}
          {!suppliers.length && !loading && <Empty text="No hay proveedores registrados" />}
        </div>
      )}

      {/* 6. VENTAS */}
      {page === 'Ventas' && (
        <>
          <div className="mini-stats">
            <div>
              <span>Ventas Registradas</span>
              <strong>{sales.length}</strong>
            </div>
            <div>
              <span>Monto Total Facturado</span>
              <strong>{money(sales.reduce((a, s) => a + Number(s.total), 0))}</strong>
            </div>
          </div>

          <section className="panel">
            <Table headers={['Comprobante', 'Fecha', 'Cliente', 'Items', 'Total (S/)', 'Estado', 'Acciones']}>
              {sales
                .filter((s) => matches((s.numeroComprobante || '') + ' ' + (s.clienteNombre || '')))
                .map((s) => {
                  const itemCount = s.detalles?.reduce((acc, d) => acc + (d.cantidad || 1), 0) || s.detalles?.length || 1;
                  const saleTime = new Date(s.fecha).getTime();
                  const hoursElapsed = (Date.now() - saleTime) / (1000 * 60 * 60);
                  const isWithin24h = hoursElapsed <= 24;
                  const canCancel = isWithin24h && s.estado !== 'ANULADA';

                  return (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.numeroComprobante}</strong>
                        <small>{s.tipoComprobante}</small>
                      </td>
                      <td>{date(s.fecha)}</td>
                      <td>
                        <strong>{s.clienteNombre || 'Público General'}</strong>
                        {s.clienteDocumento && <small>Doc: {s.clienteDocumento}</small>}
                      </td>
                      <td>
                        <span className="badge gray">{itemCount} unid.</span>
                      </td>
                      <td className="quantity">{money(s.total)}</td>
                      <td>
                        <Badge tone={s.estado === 'ANULADA' ? 'red' : s.estado === 'COMPLETADA' || s.estado === 'EMITIDA' ? 'green' : 'amber'}>
                          {s.estado}
                        </Badge>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => setSelectedSaleToView(s)}
                            style={{
                              padding: '5px 10px',
                              fontSize: 11,
                              height: 30,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              fontWeight: 600,
                            }}
                            title="Ver detalle del comprobante / boleta"
                          >
                            <Eye size={13} />
                            <span>Ver boleta</span>
                          </button>

                          {canCancel && (
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => {
                                setSelectedSaleToCancel(s);
                                setCancelMotivo('');
                              }}
                              style={{
                                padding: '5px 10px',
                                fontSize: 11,
                                height: 30,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                color: '#b91c1c',
                                borderColor: '#fca5a5',
                                background: '#fef2f2',
                                fontWeight: 600,
                              }}
                              title={`Anular boleta (disponible hasta ${Math.max(0, Math.ceil(24 - hoursElapsed))}h restantes)`}
                            >
                              <Ban size={13} />
                              <span>Anular boleta</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </Table>
            {!sales.length && !loading && <Empty text="Aún no se han emitido ventas" />}
          </section>
        </>
      )}

      {/* 7. PRONÓSTICOS */}
      {page === 'Pronósticos' && (
        <>
          <div className="info-banner">
            <TrendingUp size={24} />
            <div>
              <strong>Pronóstico de demanda</strong>
              <p>La proyección utilizará exclusivamente el historial de ventas registrado para el producto seleccionado.</p>
            </div>
          </div>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Consulta por producto</h2>
                <p>Selecciona el artículo y el horizonte que deseas evaluar.</p>
              </div>
              <div className="segmented">
                {[30, 60, 90].map((days) => (
                  <button key={days} className={forecastHorizon === days ? 'selected' : ''} onClick={() => setForecastHorizon(days)}>
                    {days} días
                  </button>
                ))}
              </div>
            </div>
            <div className="forecast-controls">
              <label htmlFor="forecast-product">Producto</label>
              <select id="forecast-product" value={selectedForecastProduct} onChange={(event) => setSelectedForecastProduct(event.target.value)}>
                {products.map((product) => <option key={product.id} value={product.id}>{product.sku} · {product.nombre}</option>)}
              </select>
            </div>
            <Empty text={`Aún no hay una proyección de ${forecastHorizon} días disponible. Se necesita historial de ventas suficiente para evitar resultados imprecisos.`} />
          </section>
        </>
      )}

      {/* 8. CLASIFICACIÓN ABC */}
      {page === 'Clasificación ABC' && (
        <>
          <div className="info-banner">
            <BarChart3 size={24} />
            <div>
              <strong>Clasificación por valor de consumo</strong>
              <p>Los productos se ordenan usando las ventas y costos registrados durante el periodo analizado.</p>
            </div>
          </div>
          <section className="panel">
            <div className="panel-heading">
              <div><h2>Resultado ABC</h2><p>A: mayor impacto, B: impacto intermedio, C: menor impacto.</p></div>
            </div>
            <Table headers={['Producto', 'Clasificación', 'Valor de consumo', 'Participación', 'Periodo']}>
              {abcClassifications.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.product.name}</strong><small>{item.product.sku}</small></td>
                  <td><Badge tone={item.classification === 'A' ? 'green' : item.classification === 'B' ? 'amber' : 'gray'}>Clase {item.classification}</Badge></td>
                  <td>{money(item.consumptionValue)}</td>
                  <td>{item.participationPercentage.toFixed(2)}%</td>
                  <td>{date(item.periodStart)} – {date(item.periodEnd)}</td>
                </tr>
              ))}
            </Table>
            {!abcClassifications.length && !loading && <Empty text="No hay datos suficientes para clasificar el catálogo. Registra ventas y actualiza los cálculos." />}
          </section>
        </>
      )}

      {/* 9. REABASTECIMIENTO */}
      {page === 'Reabastecimiento' && (
        <>
          <div className="info-banner">
            <ShoppingCart size={24} />
            <div>
              <strong>Control de reabastecimiento</strong>
              <p>
                Esta lista compara el stock actual con la política de seguridad y el punto de reorden calculados para cada almacén.
              </p>
            </div>
          </div>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Políticas de reposición</h2>
                <p>Revisa los niveles calculados antes de emitir una orden de compra.</p>
              </div>
            </div>

            <Table headers={['Producto', 'Almacén', 'Stock actual', 'Stock de seguridad', 'Punto de reorden', 'Stock máximo', 'Estado']}>
              {replenishmentPolicies.map((policy) => {
                const currentStock = getProductStock(policy.product.id);
                const needsReplenishment = currentStock <= policy.reorderPoint;
                return (
                  <tr key={policy.id}>
                    <td>
                      <strong>{policy.product.name}</strong>
                      <small>{policy.product.sku}</small>
                    </td>
                    <td>{policy.warehouse.name}</td>
                    <td>{currentStock} unidades</td>
                    <td>{policy.safetyStock} unidades</td>
                    <td>{policy.reorderPoint} unidades</td>
                    <td>{policy.maximumStock} unidades</td>
                    <td><Badge tone={currentStock === 0 ? 'red' : needsReplenishment ? 'amber' : 'green'}>{currentStock === 0 ? 'Sin stock' : needsReplenishment ? 'Reponer' : 'Cubierto'}</Badge></td>
                  </tr>
                );
              })}
            </Table>
            {!replenishmentPolicies.length && !loading && (
              <Empty text="Todavía no hay políticas calculadas. Registra ventas, proveedores y tiempos de entrega antes de actualizar los cálculos." />
            )}
          </section>
        </>
      )}

      {/* 10. REPORTES Y KARDEX */}
      {page === 'Reportes' && (
        <>
          <div className="cards-grid report-options">
            <article className="panel report-card">
              <span className="card-icon">
                <FileSpreadsheet size={24} />
              </span>
              <h2>Catálogo Valorizado</h2>
              <p>Existencias físicas, costo promedio ponderado y valor económico total.</p>
              <button className="primary full" onClick={exportProducts}>
                <Download size={16} /> Descargar CSV
              </button>
              <button className="secondary full" onClick={() => window.print()}>
                <Printer size={16} /> Imprimir / PDF
              </button>
            </article>

            <article className="panel report-card">
              <span className="card-icon">
                <Download size={24} />
              </span>
              <h2>Trazabilidad de Movimientos</h2>
              <p>Historial completo de entradas, salidas, traslados y mermas con autorizaciones.</p>
              <button className="primary full" onClick={exportMovements}>
                <Download size={16} /> Descargar CSV
              </button>
              <button className="secondary full" onClick={() => window.print()}>
                <Printer size={16} /> Imprimir / PDF
              </button>
            </article>

            <article className="panel report-card">
              <span className="card-icon">
                <Clock size={24} />
              </span>
              <h2>Cierre Diario de Inventario</h2>
              <p>Ejecutar snapshot formal de inventario para auditoría y consistencia contable.</p>
              <button
                className="secondary full"
                style={{ marginTop: 24 }}
                onClick={async () => {
                  try {
                    const res = await reportsApi.ejecutarCierre();
                    notify(`Cierre ejecutado: ${res.registros} almacenes consolidados.`);
                  } catch (err: any) {
                    notify(err.message || 'Error al ejecutar cierre');
                  }
                }}
              >
                Ejecutar Cierre Diario
              </button>
            </article>
          </div>

          <h2 className="section-title">Consulta de Kardex Detallado por Producto</h2>
          <section className="panel" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Seleccionar Producto:</label>
              <select
                value={selectedKardexProd}
                onChange={(e) => setSelectedKardexProd(e.target.value)}
                style={{ minWidth: 260 }}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} · {p.nombre}
                  </option>
                ))}
              </select>
            </div>

            <Table headers={['Fecha', 'Operación', 'Almacén', 'Cantidad', 'Costo Unitario', 'Lote']}>
              {kardexData.map((k: any, idx: number) => (
                <tr key={idx}>
                  <td>{date(k.movimiento?.fecha || new Date().toISOString())}</td>
                  <td>
                    <strong>{k.movimiento?.tipo}</strong>
                    <small>{k.movimiento?.motivo}</small>
                  </td>
                  <td>{k.movimiento?.almacenDestino?.nombre || k.movimiento?.almacenOrigen?.nombre || 'Principal'}</td>
                  <td className="quantity">{k.cantidad}</td>
                  <td>{money(k.costo_unitario || 0)}</td>
                  <td className="mono">{k.lote?.numero_lote || '—'}</td>
                </tr>
              ))}
            </Table>
            {!kardexData.length && (
              <p style={{ textAlign: 'center', color: '#889988', padding: '20px 0' }}>
                No hay movimientos registrados para este producto.
              </p>
            )}
          </section>
        </>
      )}

      {/* 11. USUARIOS (IAM) */}
      {page === 'Usuarios' && (
        <section className="panel">
          <Table headers={['Colaborador', 'Correo Electrónico', 'Rol Asignado', 'Estado']}>
            {users
              .filter((u) => matches(u.usuario.nombre + ' ' + u.usuario.correo))
              .map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.usuario.nombre}</strong>
                  </td>
                  <td>{u.usuario.correo}</td>
                  <td>
                    <Badge tone="green">{u.rol}</Badge>
                  </td>
                  <td>
                    <Badge tone={u.activo ? 'green' : 'gray'}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                </tr>
              ))}
          </Table>
          {!users.length && !loading && <Empty text="No se encontraron usuarios" />}
        </section>
      )}

      {/* 12. ALERTAS */}
      {page === 'Alertas' && (
        <div className="alert-list">
          {products
            .filter((p) => getProductStock(p.id) <= p.stockMinimo)
            .map((p) => {
              const currentStock = getProductStock(p.id);
              return (
                <article className="panel alert-row" key={p.id}>
                  <span className="attention-icon red">
                    <Package size={22} />
                  </span>
                  <div>
                    <h2>
                      {currentStock === 0 ? 'Quiebre de Stock' : 'Stock por Debajo del Mínimo'} ·{' '}
                      {p.nombre}
                    </h2>
                    <p>
                      Stock actual: <strong>{currentStock}</strong> {p.unidadMedida?.simbolo || 'UND'} · Mínimo configurado: {p.stockMinimo}
                    </p>
                  </div>
                  <Badge tone="red">Reponer Inmediatamente</Badge>
                </article>
              );
            })}

          {lots
            .filter((l) => l.cantidadDisponible > 0 && daysLeft(l.fechaVencimiento) <= 30)
            .map((l) => {
              const left = daysLeft(l.fechaVencimiento);
              return (
                <article className="panel alert-row" key={l.id}>
                  <span className="attention-icon amber">
                    <Clock size={22} />
                  </span>
                  <div>
                    <h2>
                      {left < 0 ? 'Lote Vencido (Aislar Merma)' : 'Próximo a Vencer'} ·{' '}
                      {l.producto?.nombre || 'Producto'}
                    </h2>
                    <p>
                      Lote: <strong>{l.numeroLote}</strong> · {l.cantidadDisponible} unidades · Vence: {date(l.fechaVencimiento)}
                    </p>
                  </div>
                  <Badge tone={left < 0 ? 'red' : 'amber'}>
                    {left < 0 ? 'Bloqueado' : 'Priorizar FEFO'}
                  </Badge>
                </article>
              );
            })}
        </div>
      )}

      {/* MODAL VER BOLETA / COMPROBANTE */}
      {selectedSaleToView && (
        <Modal
          size="wide"
          title={`Comprobante Oficial: ${selectedSaleToView.numeroComprobante}`}
          onClose={() => setSelectedSaleToView(null)}
        >
          <div className="ticket-modal-content">
            {/* FORMAT SELECTOR */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <div className="segmented">
                <button
                  type="button"
                  className={ticketFormat === 'thermal' ? 'selected' : ''}
                  onClick={() => setTicketFormat('thermal')}
                >
                  Ticket Térmico (Tiquetera / Etiquetera 80mm)
                </button>
                <button
                  type="button"
                  className={ticketFormat === 'standard' ? 'selected' : ''}
                  onClick={() => setTicketFormat('standard')}
                >
                  Formato Factura / Hoja A4
                </button>
              </div>
            </div>

            {ticketFormat === 'thermal' ? (
              <div className="thermal-preview-wrapper">
                <ThermalReceipt
                  sale={selectedSaleToView}
                  businessName={activeNegocio?.nombre}
                  businessRuc={activeNegocio?.ruc}
                  userName={user?.nombre}
                />
              </div>
            ) : (
              <div className="ticket-paper">
                <div className="ticket-header">
                  <div className="ticket-business-name">{activeNegocio?.nombre || 'BODEGA INVENTIX'}</div>
                  <div className="ticket-business-ruc">RUC: {activeNegocio?.ruc || '20999999991'}</div>
                  <div className="ticket-business-sub">Sistema de Punto de Venta y Control de Inventarios</div>
                  <div className="ticket-divider" />
                  <div className="ticket-type-badge">
                    {selectedSaleToView.tipoComprobante === 'FACTURA'
                      ? 'FACTURA ELECTRÓNICA'
                      : selectedSaleToView.tipoComprobante === 'TICKET'
                        ? 'TICKET DE VENTA'
                        : 'BOLETA DE VENTA ELECTRÓNICA'}
                  </div>
                  <div className="ticket-number">{selectedSaleToView.numeroComprobante}</div>
                  <div style={{ marginTop: 8 }}>
                    <Badge tone={selectedSaleToView.estado === 'ANULADA' ? 'red' : 'green'}>
                      {selectedSaleToView.estado === 'ANULADA' ? 'COMPROBANTE ANULADO' : 'EMITIDO VÁLIDO'}
                    </Badge>
                  </div>
                </div>

                {selectedSaleToView.estado === 'ANULADA' && (
                  <div className="ticket-cancellation-box">
                    <div className="ticket-cancel-title">
                      <Ban size={15} /> <strong>INFORMACIÓN DE ANULACIÓN</strong>
                    </div>
                    <div className="ticket-cancel-text">
                      <strong>Motivo registrado:</strong> {selectedSaleToView.anulacion?.motivo || 'Anulación de comprobante y reversión de inventario.'}
                    </div>
                    <div className="ticket-cancel-meta">
                      <span>
                        <strong>Anulado por:</strong> {selectedSaleToView.anulacion?.usuario?.nombre || 'Usuario Autorizado'}
                      </span>
                      {selectedSaleToView.anulacion?.fecha && (
                        <span>
                          <strong>Fecha/Hora:</strong> {new Date(selectedSaleToView.anulacion.fecha).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="ticket-meta-grid" style={{ marginTop: 14 }}>
                  <div>
                    <span>Fecha de Emisión:</span> <strong>{new Date(selectedSaleToView.fecha).toLocaleString()}</strong>
                  </div>
                  <div>
                    <span>Atendido por:</span> <strong>{selectedSaleToView.usuario?.nombre || user?.nombre || 'Cajero'}</strong>
                  </div>
                  <div>
                    <span>Cliente:</span> <strong>{selectedSaleToView.clienteNombre || 'Cliente Mostrador'}</strong>
                  </div>
                  <div>
                    <span>Documento:</span> <strong>{selectedSaleToView.clienteDocumento || 'Sin documento'}</strong>
                  </div>
                  <div>
                    <span>Almacén de Despacho:</span> <strong>{selectedSaleToView.almacen?.nombre || 'Almacén Principal'}</strong>
                  </div>
                  <div>
                    <span>Sucursal:</span> <strong>{selectedSaleToView.sucursal?.nombre || 'Sucursal Principal'}</strong>
                  </div>
                </div>

                <div className="ticket-divider" />

                <table className="ticket-table">
                  <thead>
                    <tr>
                      <th>Cant.</th>
                      <th>Descripción / Producto</th>
                      <th style={{ textAlign: 'right' }}>P.Unit</th>
                      <th style={{ textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSaleToView.detalles.map((d, idx) => (
                      <tr key={d.id || idx}>
                        <td><strong>{d.cantidad}</strong></td>
                        <td>
                          <strong>{d.producto?.nombre || 'Producto'}</strong>
                          {d.producto?.sku && (
                            <small style={{ display: 'block', color: '#687869' }}>
                              SKU: {d.producto.sku}
                            </small>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>S/ {d.precioUnitario.toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }}><strong>S/ {d.subtotal.toFixed(2)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="ticket-divider" />

                <div className="ticket-totals">
                  <div className="ticket-total-row">
                    <span>Subtotal / Op. Gravada:</span>
                    <span>S/ {(selectedSaleToView.subtotal || selectedSaleToView.total).toFixed(2)}</span>
                  </div>
                  <div className="ticket-total-row">
                    <span>IGV (18%):</span>
                    <span>S/ {(selectedSaleToView.impuesto || 0).toFixed(2)}</span>
                  </div>
                  <div className="ticket-total-row main">
                    <span>TOTAL A PAGAR:</span>
                    <span>S/ {selectedSaleToView.total.toFixed(2)}</span>
                  </div>
                </div>

                {selectedSaleToView.pagos && selectedSaleToView.pagos.length > 0 && (
                  <div className="ticket-payments">
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#314436', marginBottom: 4 }}>
                      Método de Pago:
                    </div>
                    {selectedSaleToView.pagos.map((p, pIdx) => (
                      <div key={p.id || pIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#4b5e52' }}>
                        <span>{p.metodoPago?.nombre || 'EFECTIVO'}:</span>
                        <span>S/ {p.monto.toFixed(2)} {p.referencia ? `(${p.referencia})` : ''}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="ticket-footer">
                  <p>¡Gracias por su compra!</p>
                  <small>Representación impresa de la boleta de venta electrónica generada por InventiX.</small>
                </div>
              </div>
            )}

            <div className="ticket-actions">
              <button
                type="button"
                className="primary"
                onClick={() => window.print()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
              >
                <Printer size={16} />
                <span>
                  {ticketFormat === 'thermal'
                    ? 'Imprimir Ticket en Tiquetera (80mm)'
                    : 'Imprimir Comprobante A4'}
                </span>
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => setSelectedSaleToView(null)}
              >
                <span>Cerrar</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL ANULAR BOLETA */}
      {selectedSaleToCancel && (
        <Modal
          title={`Anulación de Comprobante: ${selectedSaleToCancel.numeroComprobante}`}
          onClose={() => {
            if (!cancelLoading) {
              setSelectedSaleToCancel(null);
              setCancelMotivo('');
            }
          }}
        >
          <div style={{ padding: '4px 10px' }}>
            <div
              style={{
                display: 'flex',
                gap: 12,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                padding: 14,
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              <AlertTriangle size={24} style={{ color: '#dc2626', flexShrink: 0 }} />
              <div style={{ fontSize: 12, color: '#991b1b', lineHeight: 1.5 }}>
                <strong>Confirmación de anulación de venta:</strong>
                <p style={{ margin: '4px 0 0' }}>
                  Esta acción anulará el comprobante <strong>{selectedSaleToCancel.numeroComprobante}</strong> y reintegrará automáticamente las existencias a los lotes y almacenes de despacho originales.
                </p>
              </div>
            </div>

            <div
              style={{
                background: '#f8faf7',
                border: '1px solid #dce4dc',
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                fontSize: 12,
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 14px' }}>
                <div>Comprobante: <strong>{selectedSaleToCancel.numeroComprobante}</strong> ({selectedSaleToCancel.tipoComprobante})</div>
                <div>Monto Total: <strong>S/ {selectedSaleToCancel.total.toFixed(2)}</strong></div>
                <div>Fecha de Emisión: <strong>{new Date(selectedSaleToCancel.fecha).toLocaleString()}</strong></div>
                <div>Usuario Responsable: <strong>{user?.nombre || user?.correo}</strong> (ID: {user?.id?.slice(0, 8)}...)</div>
              </div>
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#2b3f33' }}>
                Motivo / Justificación de la Anulación <span style={{ color: '#dc2626' }}>* (Mínimo 30 letras obligatorio)</span>
              </span>
              <textarea
                rows={4}
                value={cancelMotivo}
                onChange={(e) => setCancelMotivo(e.target.value)}
                placeholder="Ingresa la justificación formal (ej. Error en la cantidad de productos cobrados en caja, solicitado expresamente por el cliente en ventanilla)..."
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  borderRadius: 8,
                  border: '1px solid #d0dad1',
                  padding: 10,
                  fontSize: 12,
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </label>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 6,
                fontSize: 11,
              }}
            >
              <span
                style={{
                  color: cancelMotivo.trim().length >= 30 ? '#166534' : '#b91c1c',
                  fontWeight: 600,
                }}
              >
                {cancelMotivo.trim().length >= 30
                  ? `✓ Justificación válida (${cancelMotivo.trim().length} caracteres)`
                  : `Faltan ${30 - cancelMotivo.trim().length} letras para cumplir el mínimo de 30`}
              </span>
              <span style={{ color: '#88988b' }}>{cancelMotivo.trim().length} / 30 letras</span>
            </div>

            <div
              className="form-actions"
              style={{
                marginTop: 22,
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
              }}
            >
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setSelectedSaleToCancel(null);
                  setCancelMotivo('');
                }}
                disabled={cancelLoading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="primary"
                onClick={handleConfirmCancelSale}
                disabled={cancelMotivo.trim().length < 30 || cancelLoading}
                style={{
                  background: '#dc2626',
                  borderColor: '#b91c1c',
                }}
              >
                {cancelLoading ? 'Anulando...' : 'Confirmar Anulación'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL VER DETALLE DE MOVIMIENTO */}
      {selectedViewMovement && (
        <Modal
          size="wide"
          title={`Detalle de Movimiento: ${selectedViewMovement.tipo}`}
          onClose={() => setSelectedViewMovement(null)}
        >
          <div style={{ padding: '6px 12px' }}>
            {/* Header info */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
                background: '#f8faf7',
                border: '1px solid #dce4dc',
                borderRadius: 8,
                padding: 14,
                marginBottom: 16,
                fontSize: 12,
              }}
            >
              <div>
                <span style={{ color: '#687b6e', display: 'block', marginBottom: 4 }}>Estado del Movimiento:</span>
                <Badge
                  tone={
                    selectedViewMovement.estado === 'COMPLETADO'
                      ? 'green'
                      : selectedViewMovement.estado === 'APROBADO'
                        ? 'amber'
                        : selectedViewMovement.estado === 'ANULADO'
                          ? 'red'
                          : 'gray'
                  }
                >
                  {selectedViewMovement.estado}
                </Badge>
              </div>
              <div>
                <span style={{ color: '#687b6e', display: 'block', marginBottom: 2 }}>Fecha y Hora:</span>
                <strong>{new Date(selectedViewMovement.fecha).toLocaleString()}</strong>
              </div>
              <div>
                <span style={{ color: '#687b6e', display: 'block', marginBottom: 2 }}>Almacén Origen:</span>
                <strong>{selectedViewMovement.almacenOrigen?.nombre || '—'}</strong>
              </div>
              <div>
                <span style={{ color: '#687b6e', display: 'block', marginBottom: 2 }}>Almacén Destino:</span>
                <strong>{selectedViewMovement.almacenDestino?.nombre || '—'}</strong>
              </div>
              <div>
                <span style={{ color: '#687b6e', display: 'block', marginBottom: 2 }}>Usuario Responsable:</span>
                <strong>{selectedViewMovement.usuario?.nombre || 'Sistema'}</strong>
              </div>
              <div>
                <span style={{ color: '#687b6e', display: 'block', marginBottom: 2 }}>Motivo / Referencia:</span>
                <strong>{selectedViewMovement.motivo || 'Sin motivo especificado'}</strong>
              </div>
              {selectedViewMovement.proveedor && (
                <div>
                  <span style={{ color: '#687b6e', display: 'block', marginBottom: 2 }}>Proveedor Asignado:</span>
                  <strong>
                    {selectedViewMovement.proveedor.razonSocial ||
                      selectedViewMovement.proveedor.razon_social ||
                      selectedViewMovement.proveedor.nombre ||
                      '—'}
                    {selectedViewMovement.proveedor.ruc ? ` (RUC: ${selectedViewMovement.proveedor.ruc})` : ''}
                  </strong>
                </div>
              )}
            </div>

            {/* Line items table */}
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#24372b', marginBottom: 8 }}>
                Líneas de Productos del Movimiento
              </h3>
              <div style={{ overflowX: 'auto', border: '1px solid #e1e8e2', borderRadius: 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead style={{ background: '#f3f6f3', textAlign: 'left', color: '#4d6253' }}>
                    <tr>
                      <th style={{ padding: '8px 12px' }}>Producto / SKU</th>
                      <th style={{ padding: '8px 12px' }}>Lote / Vencimiento</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Cantidad</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Costo Unitario</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      selectedViewMovement.detalles?.length > 0
                        ? selectedViewMovement.detalles
                        : (selectedViewMovement.detalle_movimiento || []).map((d: any) => ({
                            id: d.id,
                            productoId: d.producto_id,
                            cantidad: d.cantidad,
                            costoUnitario: Number(d.costo_unitario || 0),
                            producto: d.producto,
                            lote: d.producto_lote
                              ? {
                                  id: d.producto_lote.id,
                                  codigoLote: d.producto_lote.codigo_lote,
                                  fechaVencimiento: d.producto_lote.fecha_vencimiento,
                                }
                              : undefined,
                          }))
                    ).map((line, idx) => {
                      const prodName =
                        line.producto?.nombre ||
                        products.find((p) => p.id === line.productoId)?.nombre ||
                        'Producto';
                      const prodSku =
                        line.producto?.sku ||
                        products.find((p) => p.id === line.productoId)?.sku ||
                        line.productoId;
                      const loteCode =
                        line.lote?.codigoLote ||
                        (line as any).producto_lote?.codigo_lote ||
                        '—';
                      const rawVenc =
                        line.lote?.fechaVencimiento ||
                        (line as any).producto_lote?.fecha_vencimiento;
                      const vencDate = rawVenc ? new Date(rawVenc).toLocaleDateString() : '—';
                      const subtotal = Number(line.cantidad) * Number(line.costoUnitario || 0);

                      return (
                        <tr key={line.id || idx} style={{ borderTop: '1px solid #eef2ef' }}>
                          <td style={{ padding: '8px 12px' }}>
                            <strong>{prodName}</strong>
                            <div style={{ fontSize: 11, color: '#7a8d80' }}>SKU: {prodSku}</div>
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <div><strong>{loteCode}</strong></div>
                            <div style={{ fontSize: 11, color: '#7a8d80' }}>Vence: {vencDate}</div>
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>
                            {line.cantidad}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                            {money(line.costoUnitario || 0)}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>
                            {money(subtotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot style={{ background: '#f8faf7', borderTop: '2px solid #dce4dc' }}>
                    <tr>
                      <td colSpan={2} style={{ padding: '8px 12px', fontWeight: 700 }}>
                        Total Valorizado
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>
                        {(
                          selectedViewMovement.detalles || selectedViewMovement.detalle_movimiento || []
                        ).reduce((acc: number, cur: any) => acc + Number(cur.cantidad || 0), 0)}
                      </td>
                      <td style={{ padding: '8px 12px' }}></td>
                      <td
                        style={{
                          padding: '8px 12px',
                          textAlign: 'right',
                          fontWeight: 700,
                          color: '#166534',
                        }}
                      >
                        {money(
                          (
                            selectedViewMovement.detalles || selectedViewMovement.detalle_movimiento || []
                          ).reduce(
                            (acc: number, cur: any) =>
                              acc +
                              Number(cur.cantidad || 0) *
                                Number(cur.costoUnitario || cur.costo_unitario || 0),
                            0,
                          ),
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Modal actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              {selectedViewMovement.estado !== 'ANULADO' && (
                <>
                  <button
                    type="button"
                    className="secondary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#dc2626' }}
                    onClick={() => {
                      const target = selectedViewMovement;
                      setSelectedViewMovement(null);
                      setCancelMovementTarget(target);
                      setCancelMovementReason('');
                    }}
                  >
                    <Ban size={15} /> Anular Movimiento
                  </button>
                  <button
                    type="button"
                    className="primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    onClick={() => {
                      const target = selectedViewMovement;
                      setSelectedViewMovement(null);
                      openForm('movement', target);
                    }}
                  >
                    <Pencil size={15} /> Editar y Recalcular
                  </button>
                </>
              )}
              <button
                type="button"
                className="secondary"
                onClick={() => setSelectedViewMovement(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL ANULAR MOVIMIENTO */}
      {cancelMovementTarget && (
        <Modal
          title={`Anular Movimiento: ${cancelMovementTarget.tipo}`}
          onClose={() => {
            if (!cancelMovementLoading) {
              setCancelMovementTarget(null);
              setCancelMovementReason('');
            }
          }}
        >
          <div style={{ padding: '4px 10px' }}>
            <div
              style={{
                display: 'flex',
                gap: 12,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                padding: 14,
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              <AlertTriangle size={24} style={{ color: '#dc2626', flexShrink: 0 }} />
              <div style={{ fontSize: 12, color: '#991b1b', lineHeight: 1.5 }}>
                <strong>¿Confirmar anulación del movimiento?</strong>
                <p style={{ margin: '4px 0 0' }}>
                  {cancelMovementTarget.estado === 'COMPLETADO'
                    ? 'Este movimiento ya fue completado y afectó existencias. Al anularlo, el sistema revertirá físicamente el stock de los productos involucrados en sus almacenes correspondientes.'
                    : `Este movimiento está en estado ${cancelMovementTarget.estado}. Al anularlo quedará registrado como ANULADO en el kárdex sin alterar existencias.`}
                </p>
              </div>
            </div>

            <div
              style={{
                background: '#f8faf7',
                border: '1px solid #dce4dc',
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                fontSize: 12,
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 14px' }}>
                <div>Operación: <strong>{cancelMovementTarget.tipo}</strong></div>
                <div>Estado Actual: <strong>{cancelMovementTarget.estado}</strong></div>
                <div>Fecha: <strong>{new Date(cancelMovementTarget.fecha).toLocaleString()}</strong></div>
                <div>
                  Almacén:{' '}
                  <strong>
                    {cancelMovementTarget.almacenDestino?.nombre ||
                      cancelMovementTarget.almacenOrigen?.nombre ||
                      '—'}
                  </strong>
                </div>
              </div>
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#2b3f33' }}>
                Motivo / Justificación de la Anulación (Opcional)
              </span>
              <textarea
                rows={3}
                value={cancelMovementReason}
                onChange={(e) => setCancelMovementReason(e.target.value)}
                placeholder="Indica el motivo de la anulación (ej. Error en el conteo de unidades ingresadas, devolución de mercadería no autorizada, duplicación)..."
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  borderRadius: 8,
                  border: '1px solid #d0dad1',
                  padding: 10,
                  fontSize: 12,
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </label>

            <div
              className="form-actions"
              style={{
                marginTop: 20,
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
              }}
            >
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setCancelMovementTarget(null);
                  setCancelMovementReason('');
                }}
                disabled={cancelMovementLoading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="primary"
                onClick={handleConfirmCancelMovement}
                disabled={cancelMovementLoading}
                style={{
                  background: '#dc2626',
                  borderColor: '#b91c1c',
                }}
              >
                {cancelMovementLoading ? 'Anulando...' : 'Confirmar Anulación'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
