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
} from 'lucide-react';
import type { Page } from '../types';
import type { FormKind } from '../components/RecordForm';
import { Badge, Empty, Table } from '../components/UI';
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
  openForm: (kind: FormKind, edit?: Producto) => void;
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
  const [selectedForecastProduct, setSelectedForecastProduct] = useState('');
  const [selectedKardexProd, setSelectedKardexProd] = useState<string>('');
  const [kardexData, setKardexData] = useState<any[]>([]);

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

  // Stock calculator per product
  const getProductStock = (prodId: string) => {
    return stockList
      .filter((s) => s.productoId === prodId)
      .reduce((acc, curr) => acc + Number(curr.cantidad), 0);
  };

  // Movement actions
  const handleApproveMovement = async (id: string) => {
    try {
      await inventoryApi.aprobarMovimiento(id);
      notify('Movimiento aprobado');
      loadData();
    } catch (err: any) {
      notify(err.message || 'Error al aprobar');
    }
  };

  const handleCompleteMovement = async (id: string) => {
    try {
      await inventoryApi.completarMovimiento(id);
      notify('Movimiento completado. Stock actualizado.');
      loadData();
    } catch (err: any) {
      notify(err.message || 'Error al completar');
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
    downloadCSV('inventix-productos', [
      ['SKU', 'Producto', 'Categoría', 'Stock Total', 'Costo Promedio', 'Precio Venta', 'Valorizado Costo'],
      ...products.map((product) => {
        const currentStock = getProductStock(product.id);
        return [product.sku, product.nombre, product.categoria?.nombre || 'General', currentStock, product.costoPromedio, product.precioVenta, currentStock * product.costoPromedio];
      }),
    ]);
    notify('Reporte de productos descargado en CSV');
  };

  const exportMovements = () => {
    downloadCSV('inventix-kardex-movimientos', [
      ['Fecha', 'Tipo', 'Estado', 'Motivo', 'Almacén'],
      ...movements.map((m) => [m.fecha, m.tipo, m.estado, m.motivo || '', m.almacenDestino?.nombre || m.almacenOrigen?.nombre || '']),
    ]);
    notify('Reporte de movimientos descargado');
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

          {['Movimientos', 'Lotes y vencimientos'].includes(page) && (
            <select
              aria-label="Filtrar almacén"
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
            >
              <option value="Todos">Todos los almacenes</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.nombre}>
                  {w.nombre}
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
          <Table headers={['Producto / SKU', 'Categoría', 'Stock Total', 'Costo Promedio', 'Precio Venta', 'Estado', 'Acción']}>
            {products
              .filter(
                (p) =>
                  matches(p.nombre + ' ' + p.sku) &&
                  (filter === 'Todos' || p.categoria?.nombre === filter),
              )
              .map((p) => {
                const stockQty = getProductStock(p.id);
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
                      <strong>{stockQty}</strong>{' '}
                      <small className="inline">{p.unidadMedida?.simbolo || 'UND'}</small>
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
          </div>
        </section>
      )}

      {/* 2. MOVIMIENTOS */}
      {page === 'Movimientos' && (
        <section className="panel">
          <Table headers={['Fecha', 'Operación / Motivo', 'Tipo', 'Almacén', 'Estado', 'Acción']}>
            {movements
              .filter(
                (m) =>
                  matches((m.motivo || '') + ' ' + m.tipo) &&
                  (filter === 'Todos' || m.tipo === filter) &&
                  (warehouseFilter === 'Todos' ||
                    m.almacenDestino?.nombre === warehouseFilter ||
                    m.almacenOrigen?.nombre === warehouseFilter),
              )
              .map((m) => {
                const isEntrada = m.tipo.startsWith('ENTRADA') || m.tipo.includes('POSITIVO');
                return (
                  <tr key={m.id}>
                    <td>{date(m.fecha)}</td>
                    <td>
                      <strong>{m.motivo || 'Operación de almacén'}</strong>
                      <small>Usuario: {m.usuario?.nombre || 'Sistema'}</small>
                    </td>
                    <td>
                      <Badge tone={isEntrada ? 'green' : 'gray'}>
                        {m.tipo}
                      </Badge>
                    </td>
                    <td>
                      {m.almacenOrigen?.nombre && `${m.almacenOrigen.nombre} → `}
                      {m.almacenDestino?.nombre || 'Almacén Principal'}
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
                    <td>
                      {m.estado === 'BORRADOR' && (
                        <button
                          className="secondary"
                          style={{ fontSize: 11, padding: '4px 8px' }}
                          onClick={() => handleApproveMovement(m.id)}
                        >
                          Aprobar
                        </button>
                      )}
                      {m.estado === 'APROBADO' && (
                        <button
                          className="primary"
                          style={{ fontSize: 11, padding: '4px 8px' }}
                          onClick={() => handleCompleteMovement(m.id)}
                        >
                          Completar
                        </button>
                      )}
                      {m.estado === 'COMPLETADO' && (
                        <span style={{ color: '#28634f', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle2 size={13} /> Aplicado
                        </span>
                      )}
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
            <Table headers={['Comprobante', 'Fecha', 'Cliente', 'Total (S/)', 'Estado']}>
              {sales
                .filter((s) => matches((s.numeroComprobante || '') + ' ' + (s.clienteNombre || '')))
                .map((s) => (
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
                    <td className="quantity">{money(s.total)}</td>
                    <td>
                      <Badge tone="green">{s.estado}</Badge>
                    </td>
                  </tr>
                ))}
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
    </>
  );
}
