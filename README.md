# InventiX Frontend

Aplicación web dinámica para la gestión inteligente de inventarios, trazabilidad FEFO por lotes, punto de venta (POS) y asistente predictivo de compras con IA, conectada en tiempo real a la API de **NestJS** y base de datos **MySQL**.

---

## 🚀 Estado de Servicios y URLs

* **Frontend Web (Vite):** `http://localhost:5173`
* **Backend API (NestJS):** `http://localhost:3000/api/v1`
* **Documentación Backend (Swagger):** `http://localhost:3000/docs`
* **Base de Datos:** MySQL 8.0 en `localhost:4000` (`inventixs`)

---

## 🔑 Credenciales de Acceso Rápido (Demo)

Puedes hacer clic en los botones de acceso directo en la pantalla de inicio o ingresar manualmente:

### 1. Acceso Principal (Propietario / Administrador):
* **Correo:** `propietario@demo.inventix.pe`
* **Contraseña:** `Demo1234!`
* **Empresa / Negocio:** `Bodega InventiX Demo` (RUC `20999999991`)
* **Rol:** `PROPIETARIO`

### 2. Acceso Operativo (Ventas / Cajero):
* **Correo:** `vendedor@demo.inventix.pe`
* **Contraseña:** `Demo1234!`
* **Rol:** `VENDEDOR` / `CAJERO`

> **Registro Libre:** También puedes usar la pestaña **"Crear Cuenta"** para registrarte con cualquier correo y crear tu propia empresa con sucursal y almacenes configurados de inmediato.

---

## 📦 Ejecutar el Proyecto

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo en http://localhost:5173
npm run dev

# 3. Compilar para producción (TypeScript + Vite)
npm run build
```

---

## 📂 Organización del Código

```text
src/
├── api/                    Cliente HTTP, contratos, tipos y servicios
├── components/             Formularios modales, UI compartida y gráficos
├── context/                Contexto de autenticación, sesión y negocio activo
├── layouts/                Estructura general y barra lateral con cambio de empresa
├── pages/                  Pantallas principales (Dashboard, Catálogo, Kardex, etc.)
├── types/                  Tipos de navegación y estado
└── utils/                  Formato de moneda (S/), fechas y exportador CSV
```

---

## 🌟 Funcionalidades Dinámicas Conectadas a la API

1. **Panel de Control (Dashboard):** Métricas consolidadas en tiempo real (valorización de inventario al costo promedio, unidades físicas, alertas de stock bajo y ventas del día).
2. **Productos:** Catálogo con validación de SKU único, precios, costos, stock por almacén y exportación CSV.
3. **Movimientos y Kardex:** Flujo completo de inventario (`BORRADOR` $\rightarrow$ `APROBADO` $\rightarrow$ `COMPLETADO`).
4. **Lotes y Vencimientos (FEFO):** Monitoreo de lotes con fechas de caducidad y semáforo de vencimiento.
5. **Punto de Venta (Ventas):** Facturación rápida con descuento atómico de stock vía FEFO.
6. **Asistente IA (Reabastecimiento):** Análisis ROP + ABC con razonamiento explicativo de Gemini y aprobación *Human-in-the-Loop*.
7. **Reportes:** Kardex físico-valorizado por producto, reportes de mermas y ejecución de cierre diario.
