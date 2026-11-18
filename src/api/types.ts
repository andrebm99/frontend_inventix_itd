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
  activo?: boolean;
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

export interface AuthProfileResponse {
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
  manejaLotes?: boolean;
  maneja_lotes?: boolean;
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
  estado: 'DISPONIBLE' | 'POR_VENCER' | 'CUARENTENA' | 'AGOTADO' | 'VENCIDO';
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
  lote?: { id: string; codigoLote: string; fechaVencimiento?: string };
  producto_lote?: { id: string; codigo_lote: string; fecha_vencimiento?: string };
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
  proveedorId?: string;
  proveedor?: { id: string; razonSocial?: string; razon_social?: string; ruc?: string; nombre?: string };
  usuario?: { id: string; nombre: string };
  detalles: MovimientoDetalle[];
  detalle_movimiento?: any[];
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
  subtotal?: number;
  impuesto?: number;
  total: number;
  fecha: string;
  estado: string;
  usuario?: { id: string; nombre: string; correo?: string };
  sucursal?: { id: string; nombre: string };
  almacen?: { id: string; nombre: string };
  pagos?: {
    id: string;
    monto: number;
    referencia?: string;
    metodoPago?: { id?: string; nombre: string };
  }[];
  detalles: VentaDetalle[];
  anulacion?: {
    motivo: string;
    fecha: string;
    usuario?: { id: string; nombre: string; correo?: string };
  };
}

export interface AbcClassification {
  id: string;
  product: { id: string; name: string; sku?: string };
  classification: 'A' | 'B' | 'C';
  consumptionValue: number;
  participationPercentage: number;
  periodStart: string;
  periodEnd: string;
  calculatedAt?: string;
}

export interface ReplenishmentPolicy {
  id: string;
  product: { id: string; name: string; sku?: string };
  warehouse: { id: string; name: string };
  safetyStock: number;
  reorderPoint: number;
  maximumStock: number;
  calculatedAt?: string;
}

export interface AnalysisResult {
  updatedClassifications: number;
  updatedPolicies: number;
  generatedRecommendations: number;
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

