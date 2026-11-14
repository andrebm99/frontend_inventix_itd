import { apiFetch } from './client';
import type {
  Almacen,
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
  RecomendacionIa,
  StockAlmacen,
  Sucursal,
  UnidadMedida,
  UserProfile,
  Venta,
} from './types';

export const authApi = {
  login: (data: { correo: string; password: string }) =>
    apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  register: (data: { nombre: string; correo: string; password: string }) =>
    apiFetch<{ accessToken: string; usuario: UserProfile }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMe: () => apiFetch<UserProfile>('/auth/me'),
};

export const negocioApi = {
  getMyBusinesses: () => apiFetch<BusinessItem[]>('/negocios'),

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

  getProductos: () => apiFetch<Producto[]>('/productos'),

  createProducto: (data: {
    sku: string;
    codigoBarras?: string;
    nombre: string;
    descripcion?: string;
    precioVenta: number;
    costoPromedio: number;
    stockMinimo: number;
    stockMaximo?: number;
    puntoReorden?: number;
    categoriaId: string;
    unidadMedidaId: string;
  }) =>
    apiFetch<Producto>('/productos', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateProducto: (
    id: string,
    data: Partial<{
      sku: string;
      codigoBarras: string;
      nombre: string;
      descripcion: string;
      precioVenta: number;
      stockMinimo: number;
      categoriaId: string;
      unidadMedidaId: string;
      activo: boolean;
    }>,
  ) =>
    apiFetch<Producto>(`/productos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getLotes: () => apiFetch<Lote[]>('/lotes'),
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
  getStock: () => apiFetch<StockAlmacen[]>('/stock'),

  getMovimientos: () => apiFetch<Movimiento[]>('/movimientos'),

  createMovimiento: (data: {
    tipo: string;
    motivo: string;
    almacenOrigenId?: string;
    almacenDestinoId?: string;
    detalles: {
      productoId: string;
      cantidad: number;
      costoUnitario?: number;
      numeroLote?: string;
      fechaVencimiento?: string;
    }[];
  }) =>
    apiFetch<Movimiento>('/movimientos', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  aprobarMovimiento: (id: string) =>
    apiFetch<Movimiento>(`/movimientos/${id}/aprobar`, {
      method: 'POST',
    }),

  completarMovimiento: (id: string) =>
    apiFetch<Movimiento>(`/movimientos/${id}/completar`, {
      method: 'POST',
    }),
};

export const salesApi = {
  getMetodosPago: () => apiFetch<MetodoPago[]>('/metodos-pago'),

  getVentas: () => apiFetch<Venta[]>('/ventas'),

  createVenta: (data: {
    almacenId: string;
    tipoComprobante: string;
    numeroComprobante: string;
    clienteNombre?: string;
    clienteDocumento?: string;
    detalles: {
      productoId: string;
      cantidad: number;
      precioUnitario: number;
    }[];
    pagos: {
      metodoPagoId: string;
      monto: number;
      referencia?: string;
    }[];
  }) =>
    apiFetch<Venta>('/ventas', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const aiApi = {
  getRecomendaciones: () => apiFetch<RecomendacionIa[]>('/ia/recomendaciones'),

  analizar: () =>
    apiFetch<{ mensaje: string; generadas: number }>('/ia/analizar', {
      method: 'POST',
    }),

  decidirRecomendacion: (
    id: string,
    data: {
      decision: 'APROBADA' | 'RECHAZADA' | 'MODIFICADA';
      cantidadAprobada?: number;
      notas?: string;
    },
  ) =>
    apiFetch<{ id: string; estado: string; movimientoGeneradoId?: string }>(
      `/ia/recomendaciones/${id}/decidir`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    ),
};

export const reportsApi = {
  getDashboard: () => apiFetch<DashboardReporte>('/reportes/dashboard'),

  getKardex: (productoId: string) =>
    apiFetch<any[]>(`/reportes/kardex/${productoId}`),

  getVentas: (desde?: string, hasta?: string) => {
    const q = new URLSearchParams();
    if (desde) q.append('desde', desde);
    if (hasta) q.append('hasta', hasta);
    const query = q.toString() ? `?${q.toString()}` : '';
    return apiFetch<any>(`/reportes/ventas${query}`);
  },

  getMermas: (desde?: string, hasta?: string) => {
    const q = new URLSearchParams();
    if (desde) q.append('desde', desde);
    if (hasta) q.append('hasta', hasta);
    const query = q.toString() ? `?${q.toString()}` : '';
    return apiFetch<any>(`/reportes/mermas${query}`);
  },

  ejecutarCierre: () =>
    apiFetch<{ mensaje: string; registros: number }>('/cierres/ejecutar', {
      method: 'POST',
    }),
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

