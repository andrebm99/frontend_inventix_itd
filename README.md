# InventiX Frontend

Aplicación web para administrar productos, existencias, lotes, movimientos, proveedores, ventas, usuarios y reportes.

## Ejecutar el proyecto

```bash
npm install
npm run dev
```

Para generar la versión de producción:

```bash
npm run build
```

## Organización del código

```text
src/
├── api/                    Cliente HTTP, contratos y servicios
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx     Barra superior
│   │   ├── SidebarNavigation.tsx
│   │   └── AppFooter.tsx   Pie de página
│   ├── RecordForm.tsx    Formularios de operaciones
│   └── UI.tsx            Componentes compartidos
├── context/                Sesión y negocio activo
├── layouts/
│   └── AppLayout.tsx     Composición general de la aplicación
├── pages/                  Pantallas principales
├── types/                  Tipos de navegación
└── utils/                  Formato y exportación
```

## Datos iniciales

El frontend no contiene productos, usuarios ni movimientos de demostración. Los datos se leen desde el servidor.

La plantilla [carga-datos-iniciales.mysql.sql](docs/carga-datos-iniciales.mysql.sql) permite registrar categorías, unidades, proveedores, productos y políticas de stock con información real. El stock inicial se registra como movimiento de entrada para conservar el Kardex y el responsable de la operación.
