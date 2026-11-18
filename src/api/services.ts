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
  IamRole,
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
  almacen_movimiento_almacen_origen_idToalmacen?: { id: string; nombre: string };
  almacen_movimiento_almacen_destino_idToalmacen?: { id: string; nombre: string };
  usuario?: { id: string; nombre: string };
  detalle_movimiento?: Array<{
    id: string;
    producto_id: string;
    cantidad: number;
    costo_unitario: number | string;
    producto?: { id: string; nombre: string; sku: string };
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
  id?: string;
  almacen_id?: string;
  producto_id?: string;
  lote_id?: string | null;
  codigo_existencia?: string | null;
  cantidad_actual: number;
  cantidad_reservada: number;
  almacen?: { id: string; nombre: string };
  producto?: {
    id?: string;
    nombre?: string;
    sku?: string | null;
    costo_promedio?: number | string | null;
    precio_venta_base?: number | string | null;
  };
}

interface ApiProducto {
  id: string;
  sku?: string | null;
  codigo_barras?: string | null;
  nombre: string;
  descripcion?: string | null;
  precio_venta_base: number | string;
  costo_promedio?: number | string | null;
  maneja_lotes?: boolean | null;
  categoria_id?: string | null;
  unidad_medida_id?: string | null;
  activo?: boolean | null;
  categoria?: { id: string; nombre: string } | null;
  unidad_medida?: { id: string; nombre: string; simbolo: string } | null;
}

interface ApiAlmacen {
  id: string;
  sucursal_id: string;
  nombre: string;
  tipo: Almacen['tipo'];
  descripcion?: string | null;
  activo?: boolean | null;
  sucursal?: { id: string; nombre: string };
}

interface ApiSucursal {
  id: string;
  nombre: string;
  direccion?: string | null;
  ciudad?: string | null;
  telefono?: string | null;
  almacen?: ApiAlmacen[];
}

interface ApiProveedor {
  id: string;
  razon_social: string;
  ruc: string;
  correo?: string | null;
  telefono?: string | null;
  lead_time_promedio_dias?: number | null;
  activo?: boolean | null;
}

interface ApiVenta {
  id: string;
  numero_comprobante: string;
  total: number | string;
  fecha_venta?: string;
  estado?: string | null;
  detalle_venta?: Array<{
    id: string;
    producto_id: string;
    cantidad: number;
    precio_unitario: number | string;
    subtotal_linea: number | string;
    producto?: { id: string; nombre: string; sku: string };
  }>;
}

interface ApiIamMember {
  id: string;
  activo?: boolean | null;
  usuario: { id: string; nombre: string; correo: string };
  rol: { id: string; nombre: string; nivel_jerarquia?: number | null };
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
    usuario: item.usuario,
    detalles: (item.detalle_movimiento ?? []).map((detail) => ({
      id: detail.id,
      productoId: detail.producto_id,
      cantidad: detail.cantidad,
      costoUnitario: Number(detail.costo_unitario),
      producto: detail.producto,
    })),
  };
}

function normalizeProduct(item: ApiProducto): Producto {
  return {
    id: item.id,
    sku: item.sku ?? '',
    codigoBarras: item.codigo_barras ?? undefined,
    nombre: item.nombre,
    descripcion: item.descripcion ?? undefined,
    precioVenta: Number(item.precio_venta_base),
    costoPromedio: Number(item.costo_promedio ?? 0),
    stockMinimo: 0,
    categoriaId: item.categoria_id ?? '',
    unidadMedidaId: item.unidad_medida_id ?? '',
    manejaLotes: item.maneja_lotes ?? false,
    activo: item.activo ?? true,
    categoria: item.categoria ?? undefined,
    unidadMedida: item.unidad_medida ?? undefined,
  };
}

function normalizeWarehouse(item: ApiAlmacen): Almacen {
  return {
    id: item.id,
    sucursalId: item.sucursal_id,
    nombre: item.nombre,
    tipo: item.tipo,
    descripcion: item.descripcion ?? undefined,
    activo: item.activo ?? true,
    sucursal: item.sucursal,
  };
}

function normalizeSupplier(item: ApiProveedor): Proveedor {
  return {
    id: item.id,
    nombre: item.razon_social,
    razonSocial: item.razon_social,
    ruc: item.ruc,
    correo: item.correo ?? undefined,
    telefono: item.telefono ?? undefined,
    leadTimeDias: item.lead_time_promedio_dias ?? 3,
    activo: item.activo ?? true,
  };
}

function normalizeSale(item: ApiVenta): Venta {
  return {
    id: item.id,
    numeroComprobante: item.numero_comprobante,
    tipoComprobante: 'VENTA',
    total: Number(item.total),
    fecha: item.fecha_venta ?? new Date().toISOString(),
    estado: item.estado ?? 'EMITIDA',
    detalles: (item.detalle_venta ?? []).map((detail) => ({
      id: detail.id,
      productoId: detail.producto_id,
      cantidad: detail.cantidad,
      precioUnitario: Number(detail.precio_unitario),
      subtotal: Number(detail.subtotal_linea),
      producto: detail.producto,
    })),
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
  getSucursales: async (): Promise<Sucursal[]> => {
    const response = await apiFetch<ApiSucursal[]>('/sucursales');
    return response.map((item) => ({
      id: item.id,
      nombre: item.nombre,
      direccion: item.direccion ?? undefined,
      ciudad: item.ciudad ?? undefined,
      telefono: item.telefono ?? undefined,
      almacenes: (item.almacen ?? []).map(normalizeWarehouse),
    }));
  },

  getAlmacenes: async (): Promise<Almacen[]> => {
    const response = await apiFetch<ApiAlmacen[]>('/almacenes');
    return response.map(normalizeWarehouse);
  },

  createAlmacen: (data: {
    sucursalId: string;
    nombre: string;
    tipo: Almacen['tipo'];
    descripcion?: string;
  }) =>
    apiFetch<ApiAlmacen>('/almacenes', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(normalizeWarehouse),
};

export const catalogApi = {
  getCategorias: () => apiFetch<Categoria[]>('/categorias'),

  createCategoria: (data: { nombre: string; descripcion?: string }) =>
    apiFetch<Categoria>('/categorias', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getUnidadesMedida: () => apiFetch<UnidadMedida[]>('/unidades-medida'),

  getProductos: async (): Promise<Producto[]> => {
    const response = await apiFetch<ApiProducto[]>('/productos');
    return response.map(normalizeProduct);
  },

  createProducto: (data: {
    sku: string;
    codigoBarras?: string;
    nombre: string;
    descripcion?: string;
    precioVentaBase: number;
    costoPromedio?: number;
    manejaLotes?: boolean;
    categoriaId: string;
    unidadMedidaId: string;
  }) =>
    apiFetch<ApiProducto>('/productos', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(normalizeProduct),

  updateProducto: (
    id: string,
    data: Partial<{
      sku: string;
      codigoBarras: string;
      nombre: string;
      descripcion: string;
      precioVentaBase: number;
      manejaLotes: boolean;
      categoriaId: string;
      unidadMedidaId: string;
      activo: boolean;
    }>,
  ) =>
    apiFetch<ApiProducto>(`/productos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }).then(normalizeProduct),

  createLote: (data: {
    productoId: string;
    codigoLote: string;
    fechaFabricacion?: string;
    fechaVencimiento: string;
  }) =>
    apiFetch<ApiLote>('/lotes', {
      method: 'POST',
      body: JSON.stringify(data),
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
  getProveedores: async (): Promise<Proveedor[]> => {
    const response = await apiFetch<ApiProveedor[]>('/proveedores');
    return response.map(normalizeSupplier);
  },

  createProveedor: (data: {
    razonSocial: string;
    ruc: string;
    correo?: string;
    telefono?: string;
    leadTimePromedioDias?: number;
  }) =>
    apiFetch<ApiProveedor>('/proveedores', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(normalizeSupplier),
};

export const inventoryApi = {
  getStock: async (): Promise<StockAlmacen[]> => {
    const response = await apiFetch<ApiStockForLot[]>('/stock');
    return response.map((item) => ({
      id: item.id ?? '',
      almacenId: item.almacen_id ?? '',
      productoId: item.producto_id ?? '',
      codigoExistencia: item.codigo_existencia ?? '',
      cantidad: item.cantidad_actual,
      almacen: item.almacen,
      producto: item.producto?.id
        ? {
            id: item.producto.id,
            nombre: item.producto.nombre ?? '',
            sku: item.producto.sku ?? '',
            precioVenta: Number(item.producto.precio_venta_base ?? 0),
            costoPromedio: Number(item.producto.costo_promedio ?? 0),
          }
        : undefined,
    }));
  },

  getMovimientos: async (): Promise<Movimiento[]> => {
    const response = await apiFetch<ApiMovimiento[]>('/movimientos');
    return response.map(normalizeMovement);
  },

  createMovimiento: (data: {
    tipo: Movimiento['tipo'];
    sucursalId: string;
    motivo: string;
    almacenOrigenId?: string;
    almacenDestinoId?: string;
    proveedorId?: string;
    completarInmediato?: boolean;
    detalles: {
      productoId: string;
      cantidad: number;
      costoUnitario?: number;
      loteId?: string;
    }[];
  }) =>
    apiFetch<ApiMovimiento>('/movimientos', {
      method: 'POST',
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
};

export const salesApi = {
  getMetodosPago: () => apiFetch<MetodoPago[]>('/metodos-pago'),

  getVentas: async (): Promise<Venta[]> => {
    const response = await apiFetch<ApiVenta[]>('/ventas');
    return response.map(normalizeSale);
  },

  createVenta: (data: {
    almacenDespachoId: string;
    numeroComprobante?: string;
    descuentoGlobal?: number;
    tasaImpuesto?: number;
    detalles: {
      productoId: string;
      cantidad: number;
      precioUnitario: number;
      loteId?: string;
    }[];
    pagos: {
      metodoPagoId: string;
      monto: number;
      referencia?: string;
    }[];
  }) =>
    apiFetch<ApiVenta>('/ventas', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(normalizeSale),
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
  getUsuarios: async (): Promise<IamUserItem[]> => {
    const response = await apiFetch<ApiIamMember[]>('/usuarios-negocio');
    return response.map((item) => ({
      id: item.id,
      usuarioId: item.usuario.id,
      rol: {
        ...item.rol,
        nivel_jerarquia: item.rol.nivel_jerarquia ?? undefined,
      },
      activo: item.activo ?? true,
      usuario: {
        ...item.usuario,
        activo: item.activo ?? true,
      },
    }));
  },

  createUsuario: (data: {
    nombre: string;
    correo: string;
    password?: string;
    rolId: string;
  }) =>
    apiFetch<ApiIamMember>('/usuarios-negocio/invitar', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getRoles: () => apiFetch<IamRole[]>('/roles'),
};

