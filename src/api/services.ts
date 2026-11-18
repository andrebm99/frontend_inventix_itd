import { apiFetch } from './client';
import type {
  Almacen,
  AbcClassification,
  AnalysisResult,
  AuthProfileResponse,
  AuthResponse,
  BusinessItem,
  Categoria,
  DashboardReporte,
  IamUserItem,
  Lote,
  MetodoPago,
  Movimiento,
  Producto,
  Proveedor,
  ReplenishmentPolicy,
  StockAlmacen,
  Sucursal,
  UnidadMedida,
  UserProfile,
  Venta,
} from './types';

type ApiBusinessItem = Omit<BusinessItem, 'id' | 'rol'> & {
  id?: string;
  negocioId?: string;
  rol: BusinessItem['rol'] | { nombre: BusinessItem['rol'] };
};

type ApiAuthResponse = Omit<AuthResponse, 'negocios'> & { negocios?: ApiBusinessItem[] };
type ApiAuthProfileResponse = Omit<AuthProfileResponse, 'negocios'> & { negocios?: ApiBusinessItem[] };

function normalizeBusiness(item: ApiBusinessItem): BusinessItem {
  const id = item.id ?? item.negocioId;
  if (!id) {
    throw new Error('El servidor devolvió un negocio sin identificador.');
  }

  return {
    ...item,
    id,
    rol: typeof item.rol === 'string' ? item.rol : item.rol.nombre,
  };
}

function normalizeBusinesses(items: ApiBusinessItem[] = []): BusinessItem[] {
  return items.map(normalizeBusiness);
}

interface ApiAbcClassification {
  id: string;
  clase: 'A' | 'B' | 'C';
  valor_consumo: number | string;
  porcentaje_participacion: number | string;
  periodo_inicio: string;
  periodo_fin: string;
  calculado_el?: string;
  producto: { id: string; nombre: string; sku?: string };
}

interface ApiReplenishmentPolicy {
  id: string;
  stock_seguridad?: number;
  punto_reorden?: number;
  stock_maximo?: number;
  calculado_el?: string;
  producto: { id: string; nombre: string; sku?: string };
  almacen: { id: string; nombre: string };
}

interface ApiDashboardResponse {
  inventario: {
    totalProductosActivos: number;
    totalUnidadesFisicas: number;
    valorTotalInventario: number;
  };
  ventasHoy: {
    totalVendido: number;
    cantidadComprobantes: number;
  };
  alertas: {
    productosSinStock: number;
    productosStockBajo: number;
    lotesPorVencer: number;
    lotesVencidos: number;
    recomendacionesPendientes: number;
  };
}

interface ApiMovimiento {
  id: string;
  tipo: Movimiento['tipo'];
  estado: Movimiento['estado'];
  motivo?: string;
  fecha_registro?: string;
  fecha_aplicacion?: string;
  almacen_origen_id?: string;
  almacen_destino_id?: string;
  proveedor_id?: string;
  proveedor?: { id: string; razon_social?: string; razonSocial?: string; ruc?: string; nombre?: string };
  almacen_movimiento_almacen_origen_idToalmacen?: { id: string; nombre: string };
  almacen_movimiento_almacen_destino_idToalmacen?: { id: string; nombre: string };
  usuario?: { id: string; nombre: string };
  detalle_movimiento?: Array<{
    id: string;
    producto_id: string;
    cantidad: number;
    costo_unitario: number | string;
    producto?: { id: string; nombre: string; sku: string };
    producto_lote?: { id: string; codigo_lote: string; fecha_vencimiento?: string };
  }>;
}

interface ApiSalesReport {
  totales: {
    totalFacturado: number;
  };
}

interface ApiLote {
  id: string;
  producto_id: string;
  codigo_lote: string;
  fecha_fabricacion?: string | null;
  fecha_vencimiento: string;
  estado?: Lote['estado'] | null;
  producto?: { id: string; nombre: string; sku: string };
}

interface ApiStockForLot {
  lote_id?: string | null;
  cantidad_actual: number;
  cantidad_reservada: number;
  almacen?: { id: string; nombre: string };
  producto?: { costo_promedio?: number | string | null };
}

interface ApiKardexResponse {
  lineasKardex: Array<{
    fecha: string;
    tipo: string;
    motivo?: string;
    almacenOrigen?: string | null;
    almacenDestino?: string | null;
    lote?: string | null;
    entrada: { cantidad: number; costoUnitario: number };
    salida: { cantidad: number; costoUnitario: number };
  }>;
}

function normalizeMovement(item: ApiMovimiento): Movimiento {
  return {
    id: item.id,
    tipo: item.tipo,
    estado: item.estado,
    motivo: item.motivo,
    fecha: item.fecha_aplicacion ?? item.fecha_registro ?? new Date().toISOString(),
    almacenOrigenId: item.almacen_origen_id,
    almacenDestinoId: item.almacen_destino_id,
    almacenOrigen: item.almacen_movimiento_almacen_origen_idToalmacen,
    almacenDestino: item.almacen_movimiento_almacen_destino_idToalmacen,
    proveedorId: item.proveedor_id || (item.proveedor ? item.proveedor.id : undefined),
    proveedor: item.proveedor
      ? {
          id: item.proveedor.id,
          razonSocial: item.proveedor.razon_social || item.proveedor.razonSocial || item.proveedor.nombre,
          razon_social: item.proveedor.razon_social,
          ruc: item.proveedor.ruc,
          nombre: item.proveedor.nombre || item.proveedor.razon_social || item.proveedor.razonSocial,
        }
      : undefined,
    usuario: item.usuario,
    detalles: (item.detalle_movimiento ?? []).map((detail) => ({
      id: detail.id,
      productoId: detail.producto_id,
      cantidad: detail.cantidad,
      costoUnitario: Number(detail.costo_unitario),
      producto: detail.producto,
      producto_lote: detail.producto_lote,
      lote: detail.producto_lote
        ? {
            id: detail.producto_lote.id,
            codigoLote: detail.producto_lote.codigo_lote,
            fechaVencimiento: detail.producto_lote.fecha_vencimiento,
          }
        : undefined,
    })),
    detalle_movimiento: item.detalle_movimiento,
  };
}

export const authApi = {
  login: async (data: { correo: string; password: string }): Promise<AuthResponse> => {
    const response = await apiFetch<ApiAuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return { ...response, negocios: normalizeBusinesses(response.negocios) };
  },

  register: (data: { nombre: string; correo: string; password: string }) =>
    apiFetch<{ accessToken: string; usuario: UserProfile }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMe: async (): Promise<AuthProfileResponse> => {
    const response = await apiFetch<ApiAuthProfileResponse>('/auth/me');
    return { ...response, negocios: normalizeBusinesses(response.negocios) };
  },
};

export const negocioApi = {
  getMyBusinesses: async () => {
    const response = await apiFetch<ApiBusinessItem[]>('/negocios');
    return normalizeBusinesses(response);
  },

  create: (data: {
    nombre: string;
    ruc: string;
    correoContacto?: string;
    telefono?: string;
    sucursalPrincipalNombre?: string;
    almacenPrincipalNombre?: string;
  }) =>
    apiFetch<{ id: string; nombre: string; ruc: string; sucursalPrincipal: any }>('/negocios', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getCurrent: () => apiFetch<any>('/negocios/actual'),
};

export const organizationApi = {
  getSucursales: () => apiFetch<Sucursal[]>('/sucursales'),

  getAlmacenes: () => apiFetch<Almacen[]>('/almacenes'),

  createAlmacen: (data: {
    sucursalId: string;
    nombre: string;
    codigo: string;
    tipo: 'PRINCIPAL' | 'PULMON' | 'MERMAS_CUARENTENA';
  }) =>
    apiFetch<Almacen>('/almacenes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const catalogApi = {
  getCategorias: () => apiFetch<Categoria[]>('/categorias'),

  createCategoria: (data: { nombre: string; descripcion?: string }) =>
    apiFetch<Categoria>('/categorias', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getUnidadesMedida: () => apiFetch<UnidadMedida[]>('/unidades-medida'),

  getProductos: async () => {
    const list = await apiFetch<any[]>('/productos');
    return (list || []).map((p) => ({
      ...p,
      precioVenta:
        p.precioVenta !== undefined && p.precioVenta !== null
          ? Number(p.precioVenta)
          : Number(p.precio_venta_base || 0),
      costoPromedio:
        p.costoPromedio !== undefined && p.costoPromedio !== null
          ? Number(p.costoPromedio)
          : Number(p.costo_promedio || 0),
      codigoBarras: p.codigoBarras || p.codigo_barras || '',
      categoriaId: p.categoriaId || p.categoria_id,
      unidadMedidaId: p.unidadMedidaId || p.unidad_medida_id,
      manejaLotes: p.manejaLotes ?? p.maneja_lotes ?? false,
      stockMinimo: p.stockMinimo ?? 0,
      puntoReorden: p.puntoReorden ?? 0,
      stockMaximo: p.stockMaximo ?? 0,
      stockTotal: p.stockTotal !== undefined && p.stockTotal !== null ? Number(p.stockTotal) : undefined,
    })) as Producto[];
  },

  createProducto: (data: {
    sku: string;
    codigoBarras?: string;
    nombre: string;
    descripcion?: string;
    precioVenta: number;
    precioVentaBase?: number;
    costoPromedio: number;
    stockMinimo: number;
    stockMaximo?: number;
    puntoReorden?: number;
    categoriaId: string;
    unidadMedidaId: string;
  }) =>
    apiFetch<Producto>('/productos', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        precioVenta: data.precioVenta,
        precioVentaBase: data.precioVentaBase ?? data.precioVenta,
      }),
    }),

  updateProducto: (
    id: string,
    data: Partial<{
      sku: string;
      codigoBarras: string;
      nombre: string;
      descripcion: string;
      precioVenta: number;
      precioVentaBase: number;
      costoPromedio: number;
      stockMinimo: number;
      stockMaximo: number;
      puntoReorden: number;
      categoriaId: string;
      unidadMedidaId: string;
      activo: boolean;
    }>,
  ) =>
    apiFetch<Producto>(`/productos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...data,
        precioVenta: data.precioVenta,
        precioVentaBase: data.precioVentaBase ?? data.precioVenta,
      }),
    }),

  getLotes: async (): Promise<Lote[]> => {
    const [lots, stock] = await Promise.all([
      apiFetch<ApiLote[]>('/lotes'),
      apiFetch<ApiStockForLot[]>('/stock').catch(() => []),
    ]);

    return lots.map((lot) => {
      const lotStock = stock.filter((item) => item.lote_id === lot.id);
      const available = lotStock.reduce(
        (total, item) => total + item.cantidad_actual - item.cantidad_reservada,
        0,
      );
      const firstStock = lotStock[0];

      return {
        id: lot.id,
        productoId: lot.producto_id,
        numeroLote: lot.codigo_lote,
        fechaVencimiento: lot.fecha_vencimiento.slice(0, 10),
        fechaFabricacion: lot.fecha_fabricacion?.slice(0, 10),
        cantidadInicial: available,
        cantidadDisponible: available,
        costoUnitario: Number(firstStock?.producto?.costo_promedio ?? 0),
        estado: lot.estado ?? 'DISPONIBLE',
        producto: lot.producto,
        almacen: firstStock?.almacen,
      };
    });
  },
};

export const suppliersApi = {
  getProveedores: () => apiFetch<Proveedor[]>('/proveedores'),

  createProveedor: (data: {
    nombre: string;
    razonSocial?: string;
    ruc: string;
    correo?: string;
    telefono?: string;
    leadTimeDias?: number;
  }) =>
    apiFetch<Proveedor>('/proveedores', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const inventoryApi = {
  getStock: async () => {
    const list = await apiFetch<any[]>('/stock');
    return (list || []).map((s) => ({
      ...s,
      id: s.id,
      almacenId: s.almacenId || s.almacen_id,
      productoId: s.productoId || s.producto_id,
      codigoExistencia: s.codigoExistencia || s.codigo_existencia,
      cantidad: s.cantidad !== undefined ? Number(s.cantidad) : Number(s.cantidad_actual || 0),
      almacen: s.almacen,
      producto: s.producto,
    })) as StockAlmacen[];
  },

  getMovimientos: async (): Promise<Movimiento[]> => {
    const response = await apiFetch<ApiMovimiento[]>('/movimientos');
    return response.map(normalizeMovement);
  },

  getMovimiento: (id: string) =>
    apiFetch<ApiMovimiento>(`/movimientos/${id}`).then(normalizeMovement),

  createMovimiento: (data: {
    tipo: string;
    sucursalId?: string;
    proveedorId?: string;
    motivo?: string;
    almacenOrigenId?: string;
    almacenDestinoId?: string;
    detalles: {
      productoId: string;
      cantidad: number;
      costoUnitario?: number;
      numeroLote?: string;
      codigoLote?: string;
      fechaVencimiento?: string;
    }[];
  }) =>
    apiFetch<ApiMovimiento>('/movimientos', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(normalizeMovement),

  updateMovimiento: (id: string, data: any) =>
    apiFetch<ApiMovimiento>(`/movimientos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }).then(normalizeMovement),

  aprobarMovimiento: (id: string) =>
    apiFetch<ApiMovimiento>(`/movimientos/${id}/aprobar`, {
      method: 'POST',
    }).then(normalizeMovement),

  completarMovimiento: (id: string) =>
    apiFetch<ApiMovimiento>(`/movimientos/${id}/completar`, {
      method: 'POST',
    }).then(normalizeMovement),

  anularMovimiento: (id: string, motivo?: string) =>
    apiFetch<any>(`/movimientos/${id}/anular`, {
      method: 'POST',
      body: JSON.stringify({ motivo: motivo || 'Anulación solicitada por el usuario' }),
    }),
};

export const salesApi = {
  getMetodosPago: () => apiFetch<MetodoPago[]>('/metodos-pago'),

  getVentas: async (): Promise<Venta[]> => {
    const list = await apiFetch<any[]>('/ventas');
    return (list ?? []).map((v: any) => {
      const rev = v.movimiento?.other_movimiento?.[0];
      return {
        id: v.id,
        numeroComprobante: v.numero_comprobante || v.numeroComprobante || 'VTA-000',
        tipoComprobante: v.tipo_comprobante || v.tipoComprobante || 'BOLETA',
        clienteNombre: v.cliente_nombre || v.clienteNombre || 'Cliente Mostrador',
        clienteDocumento: v.cliente_documento || v.clienteDocumento,
        subtotal: Number(v.subtotal ?? 0),
        impuesto: Number(v.impuesto ?? 0),
        total: Number(v.total ?? 0),
        fecha: v.fecha_venta || v.fecha || v.created_at || new Date().toISOString(),
        estado: v.estado,
        usuario: v.usuario,
        sucursal: v.sucursal,
        almacen: v.almacen,
        pagos: (v.pago_venta ?? []).map((p: any) => ({
          id: p.id,
          monto: Number(p.monto ?? 0),
          referencia: p.referencia,
          metodoPago: p.metodo_pago,
        })),
        detalles: (v.detalle_venta ?? v.detalles ?? []).map((d: any) => ({
          id: d.id,
          productoId: d.producto_id || d.productoId,
          cantidad: Number(d.cantidad ?? 1),
          precioUnitario: Number(d.precio_unitario ?? d.precioUnitario ?? 0),
          subtotal: Number(d.subtotal_linea ?? d.subtotal ?? 0),
          producto: d.producto,
        })),
        anulacion: rev
          ? {
              motivo: rev.motivo?.replace(/^REVERSIÓN \([^)]*\):\s*/, '') || rev.motivo,
              fecha: rev.fecha_aplicacion,
              usuario: rev.usuario,
            }
          : undefined,
      };
    });
  },

  anularVenta: (id: string, motivo: string) =>
    apiFetch<any>(`/ventas/${id}/anular`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
    }),

  createVenta: (data: {
    almacenDespachoId: string;
    numeroComprobante?: string;
    tipoComprobante?: string;
    autoCorrelativo?: boolean;
    clienteNombre?: string;
    clienteDocumento?: string;
    descuentoGlobal?: number;
    tasaImpuesto?: number;
    detalles: {
      productoId: string;
      loteId?: string;
      cantidad: number;
      precioUnitario?: number;
      descuento?: number;
    }[];
    pagos: {
      metodoPagoId: string;
      monto: number;
      referencia?: string;
    }[];
  }) =>
    apiFetch<any>('/ventas', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const analyticsApi = {
  getAbcClassification: async (): Promise<AbcClassification[]> => {
    const response = await apiFetch<ApiAbcClassification[]>('/ia/clasificacion-abc');
    return response.map((item) => ({
      id: item.id,
      product: { id: item.producto.id, name: item.producto.nombre, sku: item.producto.sku },
      classification: item.clase,
      consumptionValue: Number(item.valor_consumo),
      participationPercentage: Number(item.porcentaje_participacion),
      periodStart: item.periodo_inicio,
      periodEnd: item.periodo_fin,
      calculatedAt: item.calculado_el,
    }));
  },

  getReplenishmentPolicies: async (): Promise<ReplenishmentPolicy[]> => {
    const response = await apiFetch<ApiReplenishmentPolicy[]>('/ia/politicas-reposicion');
    return response.map((item) => ({
      id: item.id,
      product: { id: item.producto.id, name: item.producto.nombre, sku: item.producto.sku },
      warehouse: { id: item.almacen.id, name: item.almacen.nombre },
      safetyStock: item.stock_seguridad ?? 0,
      reorderPoint: item.punto_reorden ?? 0,
      maximumStock: item.stock_maximo ?? 0,
      calculatedAt: item.calculado_el,
    }));
  },

  updateCalculations: async (historyWindowDays = 30, targetCoverageDays = 14): Promise<AnalysisResult> => {
    const response = await apiFetch<{
      clasificacionesAbcActualizadas: number;
      politicasActualizadas: number;
      recomendacionesGeneradas: unknown[];
    }>('/ia/analizar', {
      method: 'POST',
      body: JSON.stringify({ ventanaDias: historyWindowDays, diasCoberturaObjetivo: targetCoverageDays }),
    });
    return {
      updatedClassifications: response.clasificacionesAbcActualizadas,
      updatedPolicies: response.politicasActualizadas,
      generatedRecommendations: response.recomendacionesGeneradas.length,
    };
  },
};

export const reportsApi = {
  getDashboard: async (): Promise<DashboardReporte> => {
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const [dashboard, movements, monthlySales] = await Promise.all([
      apiFetch<ApiDashboardResponse>('/reportes/dashboard'),
      apiFetch<ApiMovimiento[]>('/movimientos').catch(() => []),
      apiFetch<ApiSalesReport>(
        `/reportes/ventas?fechaInicio=${encodeURIComponent(monthStart)}&fechaFin=${encodeURIComponent(today)}`,
      ).catch(() => ({ totales: { totalFacturado: 0 } })),
    ]);

    return {
      resumen: {
        valor_total_inventario: Number(dashboard.inventario.valorTotalInventario ?? 0),
        unidades_disponibles: Number(dashboard.inventario.totalUnidadesFisicas ?? 0),
        productos_bajo_stock:
          Number(dashboard.alertas.productosSinStock ?? 0) +
          Number(dashboard.alertas.productosStockBajo ?? 0),
        lotes_por_vencer: Number(dashboard.alertas.lotesPorVencer ?? 0),
        ventas_hoy_monto: Number(dashboard.ventasHoy.totalVendido ?? 0),
        ventas_mes_monto: Number(monthlySales.totales.totalFacturado ?? 0),
      },
      ultimos_movimientos: movements.map(normalizeMovement),
      productos_alerta_stock: [],
      lotes_alerta_vencimiento: [],
    };
  },

  getKardex: async (productoId: string): Promise<any[]> => {
    const response = await apiFetch<ApiKardexResponse>(`/reportes/kardex/${productoId}`);
    return response.lineasKardex.map((line) => {
      const isEntry = line.entrada.cantidad > 0;
      return {
        movimiento: {
          fecha: line.fecha,
          tipo: line.tipo,
          motivo: line.motivo,
          almacenOrigen: line.almacenOrigen ? { nombre: line.almacenOrigen } : undefined,
          almacenDestino: line.almacenDestino ? { nombre: line.almacenDestino } : undefined,
        },
        cantidad: isEntry ? line.entrada.cantidad : -line.salida.cantidad,
        costo_unitario: isEntry ? line.entrada.costoUnitario : line.salida.costoUnitario,
        lote: line.lote ? { numero_lote: line.lote } : undefined,
      };
    });
  },

  getVentas: (desde?: string, hasta?: string) => {
    const q = new URLSearchParams();
    if (desde) q.append('fechaInicio', desde);
    if (hasta) q.append('fechaFin', hasta);
    const query = q.toString() ? `?${q.toString()}` : '';
    return apiFetch<any>(`/reportes/ventas${query}`);
  },

  getMermas: (desde?: string, hasta?: string) => {
    const q = new URLSearchParams();
    if (desde) q.append('fechaInicio', desde);
    if (hasta) q.append('fechaFin', hasta);
    const query = q.toString() ? `?${q.toString()}` : '';
    return apiFetch<any>(`/reportes/mermas${query}`);
  },

  ejecutarCierre: async () => {
    const response = await apiFetch<{ resultados: unknown[] }>('/cierres/ejecutar', {
      method: 'POST',
    });
    return { mensaje: 'Cierre ejecutado', registros: response.resultados.length };
  },
};

export const iamApi = {
  getUsuarios: () => apiFetch<IamUserItem[]>('/iam/usuarios'),

  createUsuario: (data: {
    nombre: string;
    correo: string;
    password?: string;
    rol: string;
  }) =>
    apiFetch<any>('/iam/usuarios', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getRoles: () => apiFetch<any[]>('/iam/roles'),
};

