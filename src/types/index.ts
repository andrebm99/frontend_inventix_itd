export type Page = 'Resumen' | 'Productos' | 'Movimientos' | 'Almacenes' | 'Lotes y vencimientos' | 'Proveedores' | 'Ventas' | 'Pronósticos' | 'Clasificación ABC' | 'Reabastecimiento' | 'Reportes' | 'Usuarios' | 'Alertas';
export interface Product { id: string; sku: string; name: string; category: string; unit: string; price: number; cost: number; min: number; supplier: string; }
export interface Lot { id: string; productId: string; code: string; expiry: string; warehouse: string; quantity: number; }
export interface Supplier { id: string; name: string; ruc: string; email: string; phone: string; lead: number; active: boolean; }
export interface Movement { id: string; productId: string; type: 'Entrada' | 'Salida' | 'Transferencia' | 'Merma'; quantity: number; warehouse: string; destination?: string; date: string; reason: string; user: string; }
export interface User { id: string; name: string; email: string; role: 'Administrador' | 'Almacenero' | 'Cajero'; active: boolean; }
export interface Store { products: Product[]; lots: Lot[]; suppliers: Supplier[]; movements: Movement[]; warehouses: string[]; users: User[]; orders: {id: string; productId: string; quantity: number; date: string}[]; }
