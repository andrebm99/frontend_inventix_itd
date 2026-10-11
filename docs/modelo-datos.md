# Modelo entidad-relación de InventiX

Propuesta para el backend futuro, basada en los dos documentos entregados. No se ha implementado una base de datos.

- `NEGOCIO` delimita cada cliente SaaS. Las referencias deben pertenecer al mismo negocio; imponerlo con claves compuestas o validación transaccional.
- Unicidad: `(negocio_id, sku)` en PRODUCTO, `(negocio_id, ruc)` en PROVEEDOR, `(negocio_id, correo)` en USUARIO, `(producto_id, codigo)` en LOTE y `(negocio_id, nombre)` en CATEGORIA y ALMACEN.
- EXISTENCIA tiene clave compuesta `(lote_id, almacen_id)`; el stock de un producto es la suma de sus lotes. Cantidades enteras no negativas en existencias y positivas en detalles. Si se venden productos fraccionados, usar decimales para cantidades.
- MOVIMIENTO y DETALLE_MOVIMIENTO forman el historial inmutable. Entrada: destino obligatorio; salida/merma: origen obligatorio; transferencia: ambos y distintos. Actualizar existencias y registrar detalles en una transacción ACID. La carga inicial es un tipo de entrada.
- FEFO selecciona lotes vigentes por fecha de vencimiento. DETALLE_MOVIMIENTO conserva la asignación exacta por lote; una venta puede consumir varios lotes. Los no perecibles pueden usar lotes sin vencimiento.
- VENTA captura precios históricos en DETALLE_VENTA; su movimiento registra la salida física por lote. La referencia importada debe ser única por negocio y origen para evitar duplicados.
- PRODUCTO_PROVEEDOR resuelve la relación muchos a muchos; permite costos y plazos por producto. Los borradores y pedidos confirmados comparten ORDEN_COMPRA y sus detalles. La recepción se registra como movimiento; agregar `orden_compra_id` opcional a MOVIMIENTO al integrar ese flujo.
- PRONOSTICO guarda resultados por producto, almacén y horizonte 30/60/90. POLITICA_REPOSICION guarda el resultado vigente; CLASIFICACION_ABC conserva evaluaciones por período. No son modelos de IA implementados.
- ALERTA permite producto o lote opcionales según el tipo; almacén opcional para alertas globales y usuario opcional hasta su atención. Evitar alertas activas duplicadas para el mismo riesgo.
- Usuario, proveedor y producto se desactivan para preservar históricos. `password_hash` se usará exclusivamente en el backend; los permisos del frontend de demostración no ofrecen seguridad real.

El archivo `.mmd` contiene el diagrama editable Mermaid. El SVG y el PDF permiten visualizarlo sin instalar paquetes en el frontend.

```mermaid
erDiagram
    NEGOCIO {
        uuid id PK
        string nombre
        string ruc UK
    }
    ROL {
        uuid id PK
        string nombre UK
    }
    USUARIO {
        uuid id PK
        uuid negocio_id FK
        uuid rol_id FK
        string nombre
        string correo
        string password_hash
        boolean activo
    }
    CATEGORIA {
        uuid id PK
        uuid negocio_id FK
        string nombre
    }
    UNIDAD_MEDIDA {
        uuid id PK
        string nombre
        string simbolo
    }
    PRODUCTO {
        uuid id PK
        uuid negocio_id FK
        uuid categoria_id FK
        uuid unidad_id FK
        string sku
        string codigo_barras
        string nombre
        decimal precio_venta
        decimal costo_actual
        int stock_minimo
        boolean perecible
        boolean activo
    }
    PROVEEDOR {
        uuid id PK
        uuid negocio_id FK
        string razon_social
        string ruc
        string telefono
        string correo
        int lead_time_dias
        boolean activo
    }
    PRODUCTO_PROVEEDOR {
        uuid producto_id PK,FK
        uuid proveedor_id PK,FK
        decimal costo_compra
        int lead_time_dias
    }
    ALMACEN {
        uuid id PK
        uuid negocio_id FK
        string nombre
        string ubicacion
        boolean activo
    }
    LOTE {
        uuid id PK
        uuid producto_id FK
        string codigo
        date fecha_recepcion
        date fecha_vencimiento
    }
    EXISTENCIA {
        uuid lote_id PK,FK
        uuid almacen_id PK,FK
        int cantidad
    }
    MOVIMIENTO {
        uuid id PK
        uuid negocio_id FK
        uuid usuario_id FK
        uuid almacen_origen_id FK
        uuid almacen_destino_id FK
        uuid proveedor_id FK
        string tipo
        string motivo
        datetime fecha
    }
    DETALLE_MOVIMIENTO {
        uuid id PK
        uuid movimiento_id FK
        uuid lote_id FK
        int cantidad
        decimal costo_unitario
    }
    VENTA {
        uuid id PK
        uuid negocio_id FK
        uuid usuario_id FK
        uuid almacen_id FK
        uuid movimiento_id FK,UK
        string referencia
        datetime fecha
        string origen
    }
    DETALLE_VENTA {
        uuid id PK
        uuid venta_id FK
        uuid producto_id FK
        int cantidad
        decimal precio_unitario
        decimal descuento
    }
    ORDEN_COMPRA {
        uuid id PK
        uuid negocio_id FK
        uuid proveedor_id FK
        uuid usuario_id FK
        string estado
        datetime fecha
        date entrega_estimada
        date entrega_real
    }
    DETALLE_ORDEN {
        uuid id PK
        uuid orden_id FK
        uuid producto_id FK
        int cantidad
        decimal costo_unitario
    }
    PRONOSTICO {
        uuid id PK
        uuid producto_id FK
        uuid almacen_id FK
        date fecha_base
        int horizonte_dias
        decimal demanda_estimada
        string modelo
        decimal error_estimado
    }
    POLITICA_REPOSICION {
        uuid producto_id PK,FK
        uuid almacen_id PK,FK
        int stock_seguridad
        int punto_reorden
        datetime calculado_en
    }
    CLASIFICACION_ABC {
        uuid id PK
        uuid producto_id FK
        date periodo_inicio
        date periodo_fin
        string clase
        decimal valor_consumo
        decimal participacion
    }
    ALERTA {
        uuid id PK
        uuid negocio_id FK
        uuid producto_id FK
        uuid lote_id FK
        uuid almacen_id FK
        uuid atendida_por FK
        string tipo
        string estado
        datetime creada_en
        datetime atendida_en
    }
    NEGOCIO ||--o{ USUARIO : tiene
    ROL ||--o{ USUARIO : define
    NEGOCIO ||--o{ CATEGORIA : organiza
    NEGOCIO ||--o{ PRODUCTO : posee
    CATEGORIA ||--o{ PRODUCTO : agrupa
    UNIDAD_MEDIDA ||--o{ PRODUCTO : mide
    NEGOCIO ||--o{ PROVEEDOR : registra
    PRODUCTO ||--o{ PRODUCTO_PROVEEDOR : se_abastece
    PROVEEDOR ||--o{ PRODUCTO_PROVEEDOR : ofrece
    NEGOCIO ||--o{ ALMACEN : dispone
    PRODUCTO ||--o{ LOTE : tiene
    LOTE ||--o{ EXISTENCIA : distribuye
    ALMACEN ||--o{ EXISTENCIA : contiene
    NEGOCIO ||--o{ MOVIMIENTO : registra
    USUARIO ||--o{ MOVIMIENTO : realiza
    ALMACEN ||--o{ MOVIMIENTO : origen_destino
    PROVEEDOR ||--o{ MOVIMIENTO : abastece
    MOVIMIENTO ||--o{ DETALLE_MOVIMIENTO : detalla
    LOTE ||--o{ DETALLE_MOVIMIENTO : traza
    NEGOCIO ||--o{ VENTA : registra
    USUARIO ||--o{ VENTA : cobra
    ALMACEN ||--o{ VENTA : despacha
    VENTA ||--o{ DETALLE_VENTA : incluye
    PRODUCTO ||--o{ DETALLE_VENTA : se_vende
    NEGOCIO ||--o{ ORDEN_COMPRA : emite
    PROVEEDOR ||--o{ ORDEN_COMPRA : recibe
    USUARIO ||--o{ ORDEN_COMPRA : crea
    ORDEN_COMPRA ||--o{ DETALLE_ORDEN : incluye
    PRODUCTO ||--o{ DETALLE_ORDEN : solicita
    PRODUCTO ||--o{ PRONOSTICO : proyecta
    ALMACEN ||--o{ PRONOSTICO : segmenta
    PRODUCTO ||--o{ POLITICA_REPOSICION : parametriza
    ALMACEN ||--o{ POLITICA_REPOSICION : define
    PRODUCTO ||--o{ CLASIFICACION_ABC : clasifica
    NEGOCIO ||--o{ ALERTA : recibe
    PRODUCTO ||--o{ ALERTA : dispara
    LOTE ||--o{ ALERTA : vence
    ALMACEN ||--o{ ALERTA : localiza
    USUARIO ||--o{ ALERTA : atiende
    MOVIMIENTO ||--o| VENTA : respalda
```
