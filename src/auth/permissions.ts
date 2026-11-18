import type { Page } from '../types';

// Define los permisos que habilitan el acceso a cada sección.
export const PAGE_PERMISSIONS: Record<Page, string[]> = {
  Resumen: ['reporte:read'],
  Productos: ['catalogo:read'],
  Movimientos: ['inventario:read'],
  Almacenes: ['almacen:read'],
  'Lotes y vencimientos': ['catalogo:read'],
  Proveedores: ['proveedor:read'],
  Ventas: ['venta:read'],
  'Pronósticos': ['ia:read'],
  'Clasificación ABC': ['ia:read'],
  Reabastecimiento: ['ia:read'],
  Reportes: ['reporte:read'],
  Usuarios: ['usuario:read', 'rol:read'],
  Alertas: ['catalogo:read'],
};

// Indica si el usuario posee al menos uno de los permisos de la página.
export function canAccessPage(
  page: Page,
  hasPermission: (...permissions: string[]) => boolean,
) {
  return PAGE_PERMISSIONS[page].some((permission) => hasPermission(permission));
}

// Relaciona cada formulario con el permiso necesario para abrirlo.
export const FORM_PERMISSION = {
  product: 'catalogo:write',
  supplier: 'proveedor:write',
  warehouse: 'almacen:write',
  user: 'usuario:invite',
  movement: 'inventario:write',
  sale: 'venta:create',
} as const;
