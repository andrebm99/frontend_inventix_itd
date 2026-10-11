# InventiX

Frontend de gestión de inventarios con React, TypeScript, Vite y TailwindCSS. Sin backend. Iconos: Lucide React.

## Ejecutar

```bash
npm install
npm run dev
```

`npm run build` verifica TypeScript y genera `dist/`. `npm run preview` sirve esa compilación.

## Código

- `src/components`: controles, formularios y gráfico reutilizables.
- `src/layouts`: navegación y estructura adaptable.
- `src/pages`: resumen, vistas operativas y acceso de demostración.
- `src/hooks`: persistencia local.
- `src/types` y `src/data`: contratos y datos de ejemplo.
- `src/utils`: formatos, CSV y operaciones de inventario FEFO.
- `docs`: diagrama entidad-relación editable, SVG, PDF y reglas mínimas del modelo.

Se abre el panel como administrador de demostración. Cerrar sesión permite elegir otro perfil. No hay autenticación real: los roles muestran comportamiento del frontend. Los cambios se guardan en localStorage de este navegador. Para restaurar el ejemplo, elimina la clave `inventix-v1` del almacenamiento local.

Registro y edición de productos; proveedores y usuarios con activación; almacenes; entradas, ventas, mermas y transferencias; lotes FEFO; alertas; clasificación ABC; estimaciones 30/60/90; pedidos en borrador; reportes CSV compatibles con Excel e impresión PDF. El gráfico y el KPI de rotación son ilustrativos; los pronósticos usan una estimación simple. Las ventas de ejemplo son históricas y el stock inicial representa su saldo posterior; el importe mostrado usa el precio actual. El modelo futuro conserva los precios históricos.

No incluye envío de notificaciones, lectura por cámara ni integraciones externas. El campo SKU permite seleccionar la referencia; esas integraciones requieren la siguiente fase. La opción PDF abre la impresión de la vista actual.
