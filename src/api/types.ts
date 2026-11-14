export type RoleName =
  | 'PROPIETARIO'
  | 'ADMIN'
  | 'SUPERVISOR_ALMACEN'
  | 'OPERADOR_ALMACEN'
  | 'CAJERO';

export interface UserProfile {
  id: string;
  nombre: string;
  correo: string;
  activo: boolean;
}

export interface BusinessItem {
  id: string;
  nombre: string;
  ruc: string;
  correoContacto?: string;
  telefono?: string;
  rol: RoleName;
}

export interface AuthResponse {
  accessToken: string;
  usuario: UserProfile;
  negocios: BusinessItem[];
}

export interface Categoria {
  id: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

export interface UnidadMedida {
  id: string;
  codigo: string;
  nombre: string;
  simbolo: string;
  activo: boolean;
}

export interface Producto {
  id: string;
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
  activo: boolean;
  categoria?: { id: string; nombre: string };
  unidadMedida?: { id: string; nombre: string; simbolo: string };
  stockTotal?: number;
}

export interface Almacen {
  id: string;
  sucursalId: string;
  nombre: string;
  codigo: string;
  tipo: 'PRINCIPAL' | 'PULMON' | 'MERMAS_CUARENTENA';
  activo: boolean;
  sucursal?: { id: string; nombre: string };
  _count?: { stock_almacen: number };
}

export interface Sucursal {
  id: string;
  nombre: string;
  codigo: string;
  direccion?: string;
  almacenes?: Almacen[];
}

export interface Lote {
  id: string;
  productoId: string;
  numeroLote: string;
  fechaVencimiento: string;
  fechaFabricacion?: string;
  cantidadInicial: number;
  cantidadDisponible: number;
  costoUnitario: number;
  estado: 'ACTIVO' | 'CUARENTENA' | 'AGOTADO' | 'VENCIDO';
  producto?: { id: string; nombre: string; sku: string };
  almacen?: { id: string; nombre: string };
}

export interface StockAlmacen {
  id: string;
  almacenId: string;
  productoId: string;
  codigoExistencia: string;
  cantidad: number;
  almacen?: { id: string; nombre: string };
  producto?: { id: string; nombre: string; sku: string; precioVenta: number; costoPromedio: number };
}

export interface Proveedor {
  id: string;
  nombre: string;
  razonSocial?: string;
  ruc: string;
  correo?: string;
  telefono?: string;
  leadTimeDias: number;
  activo: boolean;
}

export type MovimientoTipo =
  | 'ENTRADA_COMPRA'
  | 'SALIDA_VENTA'
  | 'TRANSFERENCIA'
  | 'MERMA_VENCIMIENTO'
  | 'AJUSTE_POSITIVO'
  | 'AJUSTE_NEGATIVO';

export type MovimientoEstado = 'BORRADOR' | 'APROBADO' | 'COMPLETADO' | 'ANULADO';

export interface MovimientoDetalle {
  id: string;
  productoId: string;
  cantidad: number;
  costoUnitario: number;
  producto?: { id: string; nombre: string; sku: string };
}

export interface Movimiento {
  id: string;
  tipo: MovimientoTipo;
  estado: MovimientoEstado;
  motivo?: string;
  fecha: string;
  almacenOrigenId?: string;
  almacenDestinoId?: string;
  almacenOrigen?: { id: string; nombre: string };
  almacenDestino?: { id: string; nombre: string };
  usuario?: { id: string; nombre: string };
  detalles: MovimientoDetalle[];
}

export interface MetodoPago {
  id: string;
  codigo: string;
  nombre: string;
  activo: boolean;
}

export interface VentaDetalle {
  id: string;
  productoId: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  producto?: { id: string; nombre: string; sku: string };
}

export interface Venta {
  id: string;
  numeroComprobante: string;
  tipoComprobante: string;
  clienteNombre?: string;
  clienteDocumento?: string;
  total: number;
  fecha: string;
  estado: string;
  detalles: VentaDetalle[];
}

export interface RecomendacionIa {
  id: string;
  tipo: 'ORDEN_COMPRA' | 'ALERTA_SOBRESTOCK' | 'PREDICCION_QUIEBRE' | 'REUBICACION_STOCK';
  estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'MODIFICADA';
  prioridad: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';
  justificacion: string;
  productoId: string;
  almacenId: string;
  cantidadSugerida: number;
  cantidadAprobada?: number;
  producto?: { id: string; nombre: string; sku: string; stockMinimo: number; costoPromedio: number };
  almacen?: { id: string; nombre: string };
  created_at: string;
}

export interface DashboardReporte {
  resumen: {
    valor_total_inventario: number;
    unidades_disponibles: number;
    productos_bajo_stock: number;
    lotes_por_vencer: number;
    ventas_hoy_monto: number;
    ventas_mes_monto: number;
  };
  ultimos_movimientos: Movimiento[];
  productos_alerta_stock: {
    producto_id: string;
    nombre: string;
    sku: string;
    stock_actual: number;
    stock_minimo: number;
    almacen: string;
  }[];
  lotes_alerta_vencimiento: {
    lote_id: string;
    producto: string;
    numero_lote: string;
    fecha_vencimiento: string;
    dias_restantes: number;
    cantidad_disponible: number;
    almacen: string;
  }[];
  ventas_ultimos_dias?: {
    fecha: string;
    monto: number;
    cantidad: number;
  }[];
}

export interface IamUserItem {
  id: string;
  usuarioId: string;
  rol: RoleName;
  activo: boolean;
  usuario: {
    id: string;
    nombre: string;
    correo: string;
    activo: boolean;
  };
}

