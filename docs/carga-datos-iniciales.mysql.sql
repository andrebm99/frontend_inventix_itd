-- InventiX: plantilla para registrar datos maestros reales.
-- Completa las variables con datos de tu negocio antes de ejecutar el script.
-- El negocio, la sucursal y el almacén deben haberse creado desde la aplicación.

USE inventixs;

SET @ruc_negocio = NULL;              -- Ejemplo: el RUC con el que registraste el negocio
SET @nombre_categoria = NULL;          -- Categoría real del producto
SET @nombre_unidad = NULL;             -- Ejemplo conceptual: unidad, caja, kilogramo
SET @simbolo_unidad = NULL;            -- Abreviatura que usará tu negocio

SET @ruc_proveedor = NULL;
SET @razon_social_proveedor = NULL;
SET @correo_proveedor = NULL;
SET @telefono_proveedor = NULL;
SET @dias_entrega_proveedor = 3;

SET @sku_producto = NULL;
SET @codigo_barras_producto = NULL;
SET @nombre_producto = NULL;
SET @descripcion_producto = NULL;
SET @costo_producto = 0.0000;
SET @precio_venta_producto = 0.00;
SET @producto_maneja_lotes = FALSE;
SET @stock_minimo = 0;
SET @stock_maximo = 0;

START TRANSACTION;

SET @negocio_id = (
  SELECT id
  FROM negocio
  WHERE ruc = @ruc_negocio AND activo = TRUE AND deleted_at IS NULL
  LIMIT 1
);

-- Categoría
INSERT INTO categoria (id, negocio_id, nombre, activo)
SELECT UUID(), @negocio_id, TRIM(@nombre_categoria), TRUE
WHERE @negocio_id IS NOT NULL
  AND NULLIF(TRIM(@nombre_categoria), '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM categoria
    WHERE negocio_id = @negocio_id
      AND nombre = TRIM(@nombre_categoria)
      AND deleted_at IS NULL
  );

SET @categoria_id = (
  SELECT id FROM categoria
  WHERE negocio_id = @negocio_id
    AND nombre = TRIM(@nombre_categoria)
    AND deleted_at IS NULL
  LIMIT 1
);

-- Unidad de medida
INSERT INTO unidad_medida (id, negocio_id, nombre, simbolo)
SELECT UUID(), @negocio_id, TRIM(@nombre_unidad), UPPER(TRIM(@simbolo_unidad))
WHERE @negocio_id IS NOT NULL
  AND NULLIF(TRIM(@nombre_unidad), '') IS NOT NULL
  AND NULLIF(TRIM(@simbolo_unidad), '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM unidad_medida
    WHERE negocio_id = @negocio_id
      AND nombre = TRIM(@nombre_unidad)
  );

SET @unidad_id = (
  SELECT id FROM unidad_medida
  WHERE negocio_id = @negocio_id
    AND nombre = TRIM(@nombre_unidad)
  LIMIT 1
);

-- Proveedor
INSERT INTO proveedor (
  id, negocio_id, razon_social, ruc, telefono, correo,
  lead_time_promedio_dias, activo
)
SELECT
  UUID(), @negocio_id, TRIM(@razon_social_proveedor), TRIM(@ruc_proveedor),
  NULLIF(TRIM(@telefono_proveedor), ''), NULLIF(TRIM(@correo_proveedor), ''),
  @dias_entrega_proveedor, TRUE
WHERE @negocio_id IS NOT NULL
  AND NULLIF(TRIM(@razon_social_proveedor), '') IS NOT NULL
  AND NULLIF(TRIM(@ruc_proveedor), '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM proveedor
    WHERE negocio_id = @negocio_id
      AND ruc = TRIM(@ruc_proveedor)
      AND deleted_at IS NULL
  );

SET @proveedor_id = (
  SELECT id FROM proveedor
  WHERE negocio_id = @negocio_id
    AND ruc = TRIM(@ruc_proveedor)
    AND deleted_at IS NULL
  LIMIT 1
);

-- Producto
INSERT INTO producto (
  id, negocio_id, categoria_id, unidad_medida_id, sku, codigo_barras,
  nombre, descripcion, costo_promedio, precio_venta_base, maneja_lotes, activo
)
SELECT
  UUID(), @negocio_id, @categoria_id, @unidad_id, TRIM(@sku_producto),
  NULLIF(TRIM(@codigo_barras_producto), ''), TRIM(@nombre_producto),
  NULLIF(TRIM(@descripcion_producto), ''), @costo_producto,
  @precio_venta_producto, @producto_maneja_lotes, TRUE
WHERE @negocio_id IS NOT NULL
  AND NULLIF(TRIM(@sku_producto), '') IS NOT NULL
  AND NULLIF(TRIM(@nombre_producto), '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM producto
    WHERE negocio_id = @negocio_id AND sku = TRIM(@sku_producto)
  );

SET @producto_id = (
  SELECT id FROM producto
  WHERE negocio_id = @negocio_id AND sku = TRIM(@sku_producto)
  LIMIT 1
);

-- Relación entre producto y proveedor
INSERT INTO producto_proveedor (
  id, producto_id, proveedor_id, costo_compra,
  lead_time_dias, es_preferente
)
SELECT
  UUID(), @producto_id, @proveedor_id, @costo_producto,
  @dias_entrega_proveedor, TRUE
WHERE @producto_id IS NOT NULL
  AND @proveedor_id IS NOT NULL
ON DUPLICATE KEY UPDATE
  costo_compra = VALUES(costo_compra),
  lead_time_dias = VALUES(lead_time_dias),
  es_preferente = VALUES(es_preferente),
  updated_at = CURRENT_TIMESTAMP;

-- Política de stock para cada almacén activo del negocio
INSERT INTO politica_reposicion (
  id, producto_id, almacen_id, stock_seguridad, punto_reorden, stock_maximo
)
SELECT
  UUID(), @producto_id, almacen.id, @stock_minimo,
  @stock_minimo, @stock_maximo
FROM almacen
INNER JOIN sucursal ON sucursal.id = almacen.sucursal_id
WHERE @producto_id IS NOT NULL
  AND sucursal.negocio_id = @negocio_id
  AND sucursal.activo = TRUE
  AND sucursal.deleted_at IS NULL
  AND almacen.activo = TRUE
  AND almacen.deleted_at IS NULL
ON DUPLICATE KEY UPDATE
  stock_seguridad = VALUES(stock_seguridad),
  punto_reorden = VALUES(punto_reorden),
  stock_maximo = VALUES(stock_maximo),
  calculado_el = CURRENT_TIMESTAMP;

-- Verifica el resultado antes de confirmar.
SELECT
  producto.id,
  producto.sku,
  producto.nombre,
  categoria.nombre AS categoria,
  unidad_medida.simbolo AS unidad,
  producto.costo_promedio,
  producto.precio_venta_base
FROM producto
LEFT JOIN categoria ON categoria.id = producto.categoria_id
LEFT JOIN unidad_medida ON unidad_medida.id = producto.unidad_medida_id
WHERE producto.id = @producto_id;

COMMIT;

-- El stock inicial debe registrarse como movimiento de entrada desde la aplicación.
-- De esa manera quedan guardados el Kardex, el usuario responsable y el costo real.
