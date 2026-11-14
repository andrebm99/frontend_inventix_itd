# InventiX Web · Frontend Dinámico

Plataforma web dinámica para el control de inventario inteligente, trazabilidad FEFO por lotes, punto de venta y asistente predictivo de compras con IA, conectada en tiempo real a la API de **NestJS** y base de datos **MySQL**.

---

## 🚀 Estado de Servicios y URLs

* **Frontend Web (Vite):** `http://localhost:5173`
* **Backend API (NestJS):** `http://localhost:3000/api/v1`
* **Documentación Backend (Swagger):** `http://localhost:3000/docs`
* **Base de Datos:** MySQL 8.0 en `localhost:4000` (`inventixs`)

---

## 🔑 Credenciales de Acceso Rápido (Demo)

Puedes presionar el botón **"Entrar con Acceso Rápido Demo (Carlos Admin)"** en la pantalla de inicio o usar:

* **Correo:** `admin@inventix.com`
* **Contraseña:** `Secret123!`
* **Empresa / Negocio:** `Minimarket La Esquina` (RUC `20609876543`)
* **Rol:** `PROPIETARIO`

> **Registro Libre:** También puedes usar la pestaña **"Crear Cuenta"** para registrarte con cualquier correo y crear tu propia empresa con sucursal y almacenes configurados de inmediato.

---

## 🛠️ Tecnologías Utilizadas

* **Framework:** React 19 (`^19.1.0`)
* **Bundler & Dev Server:** Vite 6 (`^6.3.0`)
* **Estilos & UI:** Tailwind CSS v4 (`@tailwindcss/vite` + `@theme` bosque/dorado)
* **Iconografía:** Lucide React (`^0.468.0`)
* **Tipado:** TypeScript 5.8
* **Consumo API:** Fetch nativo con proxy inverso y cliente tipado

---

## 📦 Comandos de Ejecución

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo en http://localhost:5173
npm run dev

# 3. Compilar para producción (TypeScript + Vite)
npm run build

# 4. Previsualizar compilación de producción
npm run preview
```

---

## 🧩 Arquitectura del Frontend (`src/`)

```
src/
├── api/
│   ├── client.ts           # Wrapper fetch, tokens JWT, cabecera x-negocio-id y manejo de errores
│   ├── types.ts            # Interfaces TypeScript sincronizadas con el backend
│   └── services.ts         # Servicios: auth, catálogo, movimientos, ventas, IA, reportes e IAM
├── context/
│   └── AuthContext.tsx     # Contexto global: sesión, token, selector multi-tenant y logout
├── layouts/
│   └── AppLayout.tsx       # Estructura principal, barra lateral con cambio de empresa y topbar
├── pages/
│   ├── Login.tsx           # Inicio de sesión, registro, botón demo y setup de empresa
│   ├── Dashboard.tsx       # Métricas en vivo (KPIs, stock valorizado, alertas y accesos rápidos)
│   └── Workspace.tsx       # Vistas operativas (Productos, Kardex, Lotes FEFO, Ventas, IA, etc.)
├── components/
│   ├── RecordForm.tsx      # Formularios modales dinámicos conectados a la API
│   ├── UI.tsx              # Componentes base: Modal, Badge, Table, Field, Empty
│   └── TrendChart.tsx      # Gráficos de tendencias y proyección de demanda
├── styles.css              # Sistema visual con tema Forest (#174b3b) y acentos dorados
└── utils/
    ├── format.ts           # Formateadores de moneda (PEN), fechas (es-PE) y exportador CSV
    └── inventory.ts        # Reglas auxiliares de cálculo y FEFO
```

---

## 🌟 Módulos y Funcionalidades Dinámicas

### 1. Panel de Resumen (Dashboard)
* Conectado al endpoint `GET /api/v1/reportes/dashboard`.
* Muestra el **Valor total del inventario** al costo promedio ponderado, **Unidades disponibles**, **Ventas acumuladas del mes** y **Productos que requieren reposición**.
* Botón directo **"⚡ Asistente IA Reposición"** para ejecutar análisis de compras.

### 2. Catálogo de Productos
* Conectado a `GET /api/v1/productos` y `GET /api/v1/categorias`.
* Búsqueda instantánea por SKU o nombre y filtro por categoría.
* Modal para **Nuevo Producto** (`POST /api/v1/productos`) y edición (`PATCH /api/v1/productos/:id`).
* Botón **"Exportar CSV"** para auditoría y compatibilidad con Excel.

### 3. Movimientos y Kardex
* Conectado a `GET /api/v1/movimientos`.
* Ciclo de vida completo: `BORRADOR` $\rightarrow$ `APROBADO` $\rightarrow$ `COMPLETADO`.
* Botones de acción directa para **Aprobar** y **Completar** movimientos actualizando las existencias de inmediato.

### 4. Trazabilidad de Lotes y Vencimientos (FEFO)
* Conectado a `GET /api/v1/lotes`.
* Ordenamiento prioritario por fecha de caducidad.
* Etiquetas dinámicas: `Vigente` (verde), `Próximo a Vencer` (ámbar, $\le 30$ días) y `Vencido` (rojo, aislado para venta).

### 5. Punto de Venta (Ventas Rápidas)
* Conectado a `GET /api/v1/ventas` y `POST /api/v1/ventas`.
* Registro de ventas seleccionando almacén, producto, cliente y método de pago (Efectivo, Tarjeta, Yape/Plin).
* Descuento automático de inventario bajo la regla **FEFO**.

### 6. Asistente Predictivo con IA (Human-in-the-Loop)
* Conectado a `GET /api/v1/ia/recomendaciones` y `POST /api/v1/ia/analizar`.
* Dispara el modelo Gemini para razonar la reposición óptima basada en ROP y rotación ABC.
* Botón **"Aprobar"**: genera automáticamente el borrador de orden de compra en los Movimientos del sistema.
* Botón **"Descartar"**: archiva la recomendación.

### 7. Clasificación ABC & Pronósticos
* Análisis de Pareto (Clase A: 80% del valor, Clase B: 15%, Clase C: 5%).
* Pronósticos con horizontes configurables de 30, 60 y 90 días.

### 8. Reportes y Kardex por Producto
* Selector interactivo para ver el historial físico-valorizado de cualquier producto.
* Descargas de reportes en formato CSV.
* Botón de **"Ejecutar Cierre Diario"** para snapshots formales de auditoría contable.

### 9. Colaboradores y Control de Acceso (IAM)
* Conectado a `GET /api/v1/iam/usuarios`.
* Lista de miembros del equipo y sus roles asignados (`PROPIETARIO`, `ADMIN`, `SUPERVISOR_ALMACEN`, `OPERADOR_ALMACEN`, `CAJERO`).
* Modal para invitar y asignar roles a nuevos colaboradores.
