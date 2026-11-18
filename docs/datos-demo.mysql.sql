-- InventiX - datos mínimos de demostración para MySQL 8+
-- Ejecutar después de crear las tablas con Prisma y seleccionar la base:
--   USE inventixs;
-- El script es repetible: usa UUID fijos reservados para la muestra.
-- Accesos: propietario@demo.inventix.pe / Demo1234!
--          vendedor@demo.inventix.pe   / Demo1234!

SET NAMES utf8mb4;
START TRANSACTION;

-- Identificadores estables de la muestra
SET @negocio       = '10000000-0000-4000-8000-000000000001';
SET @sucursal_1    = '11000000-0000-4000-8000-000000000001';
SET @sucursal_2    = '11000000-0000-4000-8000-000000000002';
SET @almacen_1     = '12000000-0000-4000-8000-000000000001';
SET @almacen_2     = '12000000-0000-4000-8000-000000000002';
SET @categoria_1   = '13000000-0000-4000-8000-000000000001';
SET @categoria_2   = '13000000-0000-4000-8000-000000000002';
SET @unidad_1      = '14000000-0000-4000-8000-000000000001';
SET @unidad_2      = '14000000-0000-4000-8000-000000000002';
SET @producto_1    = '15000000-0000-4000-8000-000000000001';
SET @producto_2    = '15000000-0000-4000-8000-000000000002';
SET @lote_1        = '16000000-0000-4000-8000-000000000001';
SET @lote_2        = '16000000-0000-4000-8000-000000000002';
SET @proveedor_1   = '17000000-0000-4000-8000-000000000001';
SET @proveedor_2   = '17000000-0000-4000-8000-000000000002';
SET @usuario_1     = '18000000-0000-4000-8000-000000000001';
SET @usuario_2     = '18000000-0000-4000-8000-000000000002';
SET @rol_1         = '19000000-0000-4000-8000-000000000001';
SET @rol_2         = '19000000-0000-4000-8000-000000000002';
SET @metodo_1      = '1b000000-0000-4000-8000-000000000001';
SET @metodo_2      = '1b000000-0000-4000-8000-000000000002';
SET @movimiento_1  = '1c000000-0000-4000-8000-000000000001';
SET @movimiento_2  = '1c000000-0000-4000-8000-000000000002';
SET @venta_1       = '1d000000-0000-4000-8000-000000000001';
SET @venta_2       = '1d000000-0000-4000-8000-000000000002';
SET @cierre_1      = '1e000000-0000-4000-8000-000000000001';
SET @cierre_2      = '1e000000-0000-4000-8000-000000000002';

INSERT INTO negocio
  (id, nombre, ruc, correo_contacto, telefono, activo)
VALUES
  (@negocio, 'Bodega InventiX Demo', '20999999991', 'contacto@demo.inventix.pe', '999111222', TRUE)
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre), correo_contacto = VALUES(correo_contacto), activo = TRUE;

INSERT INTO configuracion_negocio
  (negocio_id, usa_lotes, usa_multi_almacen, dias_alerta_vencimiento, permite_stock_negativo)
VALUES
  (@negocio, TRUE, TRUE, 30, FALSE)
ON DUPLICATE KEY UPDATE
  usa_lotes = TRUE, usa_multi_almacen = TRUE, dias_alerta_vencimiento = 30,
  permite_stock_negativo = FALSE;

INSERT INTO sucursal
  (id, negocio_id, nombre, direccion, ciudad, telefono, activo)
VALUES
  (@sucursal_1, @negocio, 'Sucursal Centro', 'Av. Principal 123', 'Lima', '014001001', TRUE),
  (@sucursal_2, @negocio, 'Sucursal Norte', 'Av. Los Olivos 456', 'Lima', '014001002', TRUE)
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), activo = TRUE, deleted_at = NULL;

INSERT INTO almacen
  (id, sucursal_id, nombre, tipo, descripcion, activo)
VALUES
  (@almacen_1, @sucursal_1, 'Almacén Principal', 'PRINCIPAL', 'Recepción y despacho principal', TRUE),
  (@almacen_2, @sucursal_2, 'Almacén de Exposición', 'EXPOSICION', 'Stock disponible para venta', TRUE)
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), tipo = VALUES(tipo), activo = TRUE, deleted_at = NULL;

INSERT INTO categoria (id, negocio_id, nombre, activo)
VALUES
  (@categoria_1, @negocio, 'Bebidas', TRUE),
  (@categoria_2, @negocio, 'Abarrotes', TRUE)
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), activo = TRUE, deleted_at = NULL;

INSERT INTO unidad_medida (id, negocio_id, nombre, simbolo)
VALUES
  (@unidad_1, @negocio, 'Unidad', 'UND'),
  (@unidad_2, @negocio, 'Paquete', 'PAQ')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), simbolo = VALUES(simbolo);

INSERT INTO producto
  (id, negocio_id, categoria_id, unidad_medida_id, sku, codigo_barras, nombre,
   descripcion, costo_promedio, precio_venta_base, maneja_lotes, activo)
VALUES
  (@producto_1, @negocio, @categoria_1, @unidad_1, 'BEB-001', '7750000000011',
   'Leche entera 1 L', 'Producto de demostración con control de lote', 3.2000, 4.80, TRUE, TRUE),
  (@producto_2, @negocio, @categoria_2, @unidad_2, 'ABA-001', '7750000000028',
   'Galletas clásicas x6', 'Paquete para venta minorista', 2.1000, 3.50, TRUE, TRUE)
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre), costo_promedio = VALUES(costo_promedio),
  precio_venta_base = VALUES(precio_venta_base), activo = TRUE, deleted_at = NULL;

INSERT INTO producto_lote
  (id, producto_id, codigo_lote, fecha_fabricacion, fecha_vencimiento, estado)
VALUES
  (@lote_1, @producto_1, 'LECHE-2026-01', '2026-10-01', '2027-04-30', 'DISPONIBLE'),
  (@lote_2, @producto_2, 'GALL-2026-01', '2026-09-15', '2027-09-15', 'DISPONIBLE')
ON DUPLICATE KEY UPDATE fecha_vencimiento = VALUES(fecha_vencimiento), estado = VALUES(estado);

INSERT INTO proveedor
  (id, negocio_id, razon_social, ruc, telefono, correo, lead_time_promedio_dias, activo)
VALUES
  (@proveedor_1, @negocio, 'Distribuidora Andina SAC', '20555555551', '987111111', 'ventas@andina.demo', 3, TRUE),
  (@proveedor_2, @negocio, 'Comercial Lima EIRL', '20555555552', '987222222', 'pedidos@lima.demo', 5, TRUE)
ON DUPLICATE KEY UPDATE razon_social = VALUES(razon_social), activo = TRUE, deleted_at = NULL;

INSERT INTO producto_proveedor
  (id, producto_id, proveedor_id, codigo_proveedor, costo_compra, lead_time_dias, es_preferente)
VALUES
  ('20000000-0000-4000-8000-000000000001', @producto_1, @proveedor_1, 'AND-LECHE-1L', 3.2000, 3, TRUE),
  ('20000000-0000-4000-8000-000000000002', @producto_2, @proveedor_2, 'LIM-GALL-X6', 2.1000, 5, TRUE)
ON DUPLICATE KEY UPDATE costo_compra = VALUES(costo_compra), lead_time_dias = VALUES(lead_time_dias);

INSERT INTO producto_ubicacion_almacen
  (id, producto_id, almacen_id, pasillo, estante, coordenada_x, coordenada_y, zona_rotulo)
VALUES
  ('21000000-0000-4000-8000-000000000001', @producto_1, @almacen_1, 'A', '01', 1, 1, 'Refrigerados'),
  ('21000000-0000-4000-8000-000000000002', @producto_2, @almacen_2, 'B', '02', 2, 1, 'Abarrotes secos')
ON DUPLICATE KEY UPDATE pasillo = VALUES(pasillo), estante = VALUES(estante), zona_rotulo = VALUES(zona_rotulo);

-- Hash bcrypt de la contraseña Demo1234!
INSERT INTO usuario (id, nombre, correo, password_hash, activo)
VALUES
  (@usuario_1, 'Propietario Demo', 'propietario@demo.inventix.pe', '$2b$10$DGXZkjbUWO1lXrAZRXPcQeh4cfUb5aGSCC8QcVpFmccjVPd7TSTWq', TRUE),
  (@usuario_2, 'Vendedor Demo', 'vendedor@demo.inventix.pe', '$2b$10$DGXZkjbUWO1lXrAZRXPcQeh4cfUb5aGSCC8QcVpFmccjVPd7TSTWq', TRUE)
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), password_hash = VALUES(password_hash), activo = TRUE, deleted_at = NULL;

-- El catálogo completo de permisos permite usar la muestra aun si la API no se
-- inició antes (normalmente SeedService crea estos registros al arrancar Nest).
INSERT INTO permiso (id, clave, descripcion)
VALUES
  (UUID(), 'negocio:read', 'Ver negocio'),
  (UUID(), 'negocio:write', 'Editar negocio'),
  (UUID(), 'sucursal:read', 'Ver sucursales'),
  (UUID(), 'sucursal:write', 'Gestionar sucursales'),
  (UUID(), 'almacen:read', 'Ver almacenes'),
  (UUID(), 'almacen:write', 'Gestionar almacenes'),
  (UUID(), 'usuario:read', 'Ver usuarios'),
  (UUID(), 'usuario:invite', 'Invitar usuarios'),
  (UUID(), 'usuario:manage', 'Gestionar usuarios'),
  (UUID(), 'rol:read', 'Ver roles'),
  (UUID(), 'rol:write', 'Gestionar roles'),
  (UUID(), 'catalogo:read', 'Ver catálogo'),
  (UUID(), 'catalogo:write', 'Gestionar catálogo'),
  (UUID(), 'proveedor:read', 'Ver proveedores'),
  (UUID(), 'proveedor:write', 'Gestionar proveedores'),
  (UUID(), 'inventario:read', 'Ver inventario'),
  (UUID(), 'inventario:write', 'Registrar movimientos'),
  (UUID(), 'inventario:approve', 'Aprobar movimientos'),
  (UUID(), 'inventario:cancel', 'Anular movimientos'),
  (UUID(), 'venta:read', 'Ver ventas'),
  (UUID(), 'venta:create', 'Registrar ventas'),
  (UUID(), 'venta:cancel', 'Anular ventas'),
  (UUID(), 'cierre:read', 'Ver cierres'),
  (UUID(), 'cierre:execute', 'Ejecutar cierres'),
  (UUID(), 'ia:read', 'Ver análisis IA'),
  (UUID(), 'ia:decide', 'Decidir recomendaciones IA'),
  (UUID(), 'reporte:read', 'Ver reportes')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

INSERT INTO rol (id, negocio_id, nombre, descripcion, nivel_jerarquia)
VALUES
  (@rol_1, @negocio, 'PROPIETARIO', 'Propietario del negocio de demostración', 100),
  (@rol_2, @negocio, 'VENDEDOR', 'Vendedor del negocio de demostración', 20)
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), descripcion = VALUES(descripcion);

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT @rol_1, id FROM permiso
ON DUPLICATE KEY UPDATE rol_id = VALUES(rol_id);

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT @rol_2, id
FROM permiso
WHERE clave IN ('catalogo:read', 'inventario:read', 'venta:read', 'venta:create')
ON DUPLICATE KEY UPDATE rol_id = VALUES(rol_id);

INSERT INTO usuario_negocio
  (id, usuario_id, negocio_id, rol_id, invitado_por_usuario_id, activo)
VALUES
  ('22000000-0000-4000-8000-000000000001', @usuario_1, @negocio, @rol_1, NULL, TRUE),
  ('22000000-0000-4000-8000-000000000002', @usuario_2, @negocio, @rol_2, @usuario_1, TRUE)
ON DUPLICATE KEY UPDATE rol_id = VALUES(rol_id), activo = TRUE;

INSERT INTO metodo_pago (id, nombre, activo)
VALUES
  (@metodo_1, 'EFECTIVO DEMO', TRUE),
  (@metodo_2, 'YAPE DEMO', TRUE)
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), activo = TRUE;

INSERT INTO movimiento
  (id, negocio_id, sucursal_id, almacen_origen_id, almacen_destino_id,
   proveedor_id, usuario_creador_id, tipo, estado, motivo, fecha_registro, fecha_aplicacion)
VALUES
  (@movimiento_1, @negocio, @sucursal_1, NULL, @almacen_1, @proveedor_1, @usuario_1,
   'ENTRADA_COMPRA', 'COMPLETADO', 'Carga inicial de inventario demo', '2026-11-01 09:00:00', '2026-11-01 09:05:00'),
  (@movimiento_2, @negocio, @sucursal_1, @almacen_1, NULL, NULL, @usuario_2,
   'SALIDA_VENTA', 'COMPLETADO', 'Salida vinculada a ventas demo', '2026-11-15 11:00:00', '2026-11-15 11:01:00')
ON DUPLICATE KEY UPDATE estado = VALUES(estado), motivo = VALUES(motivo);

INSERT INTO detalle_movimiento
  (id, movimiento_id, producto_id, lote_id, cantidad, costo_unitario, descuento_unitario)
VALUES
  ('23000000-0000-4000-8000-000000000001', @movimiento_1, @producto_1, @lote_1, 40, 3.2000, 0),
  ('23000000-0000-4000-8000-000000000002', @movimiento_1, @producto_2, @lote_2, 24, 2.1000, 0),
  ('23000000-0000-4000-8000-000000000003', @movimiento_2, @producto_1, @lote_1, 2, 3.2000, 0),
  ('23000000-0000-4000-8000-000000000004', @movimiento_2, @producto_2, @lote_2, 1, 2.1000, 0)
ON DUPLICATE KEY UPDATE cantidad = VALUES(cantidad), costo_unitario = VALUES(costo_unitario);

INSERT INTO stock_almacen
  (id, almacen_id, producto_id, lote_id, codigo_existencia, cantidad_actual, cantidad_reservada)
VALUES
  ('24000000-0000-4000-8000-000000000001', @almacen_1, @producto_1, @lote_1, 'EX-BEB-001-LECHE-2026-01', 38, 0),
  ('24000000-0000-4000-8000-000000000002', @almacen_1, @producto_2, @lote_2, 'EX-ABA-001-GALL-2026-01', 23, 0)
ON DUPLICATE KEY UPDATE cantidad_actual = VALUES(cantidad_actual), cantidad_reservada = VALUES(cantidad_reservada);

INSERT INTO venta
  (id, negocio_id, sucursal_id, almacen_despacho_id, movimiento_id, usuario_id,
   numero_comprobante, subtotal, descuento_global, impuesto, total, estado, fecha_venta)
VALUES
  (@venta_1, @negocio, @sucursal_1, @almacen_1, @movimiento_2, @usuario_2,
   'B001-000001', 9.60, 0, 0, 9.60, 'EMITIDA', '2026-11-15 11:00:00'),
  (@venta_2, @negocio, @sucursal_1, @almacen_1, NULL, @usuario_2,
   'B001-000002', 3.50, 0, 0, 3.50, 'EMITIDA', '2026-11-15 11:10:00')
ON DUPLICATE KEY UPDATE total = VALUES(total), estado = VALUES(estado);

INSERT INTO detalle_venta
  (id, venta_id, producto_id, lote_id, cantidad, precio_unitario, descuento, subtotal_linea)
VALUES
  ('25000000-0000-4000-8000-000000000001', @venta_1, @producto_1, @lote_1, 2, 4.80, 0, 9.60),
  ('25000000-0000-4000-8000-000000000002', @venta_2, @producto_2, @lote_2, 1, 3.50, 0, 3.50)
ON DUPLICATE KEY UPDATE cantidad = VALUES(cantidad), subtotal_linea = VALUES(subtotal_linea);

INSERT INTO pago_venta (id, venta_id, metodo_pago_id, monto, referencia, fecha_pago)
VALUES
  ('26000000-0000-4000-8000-000000000001', @venta_1, @metodo_1, 9.60, 'PAGO-EFECTIVO-001', '2026-11-15 11:00:00'),
  ('26000000-0000-4000-8000-000000000002', @venta_2, @metodo_2, 3.50, 'YAPE-000002', '2026-11-15 11:10:00')
ON DUPLICATE KEY UPDATE monto = VALUES(monto), referencia = VALUES(referencia);

INSERT INTO politica_reposicion
  (id, producto_id, almacen_id, stock_seguridad, punto_reorden, stock_maximo)
VALUES
  ('27000000-0000-4000-8000-000000000001', @producto_1, @almacen_1, 10, 15, 60),
  ('27000000-0000-4000-8000-000000000002', @producto_2, @almacen_1, 8, 12, 48)
ON DUPLICATE KEY UPDATE
  stock_seguridad = VALUES(stock_seguridad), punto_reorden = VALUES(punto_reorden), stock_maximo = VALUES(stock_maximo);

INSERT INTO clasificacion_abc
  (id, negocio_id, producto_id, periodo_inicio, periodo_fin, clase,
   valor_consumo, porcentaje_participacion, calculado_el)
VALUES
  ('28000000-0000-4000-8000-000000000001', @negocio, @producto_1, '2026-11-01', '2026-11-30', 'A', 192.00, 70.00, NOW()),
  ('28000000-0000-4000-8000-000000000002', @negocio, @producto_2, '2026-11-01', '2026-11-30', 'B', 84.00, 30.00, NOW())
ON DUPLICATE KEY UPDATE clase = VALUES(clase), valor_consumo = VALUES(valor_consumo);

INSERT INTO recomendacion_reposicion_ia
  (id, negocio_id, sucursal_id, producto_id, proveedor_sugerido_id,
   stock_actual_evaluado, demanda_proyectada_proximos_dias, cantidad_sugerida_comprar,
   confianza_modelo, motivo_explicacion, estado)
VALUES
  ('29000000-0000-4000-8000-000000000001', @negocio, @sucursal_1, @producto_1, @proveedor_1,
   38, 45, 22, 0.88, 'La demanda proyectada supera el stock disponible más el margen de seguridad.', 'PENDIENTE'),
  ('29000000-0000-4000-8000-000000000002', @negocio, @sucursal_1, @producto_2, @proveedor_2,
   23, 28, 13, 0.82, 'Se recomienda reponer antes de alcanzar el punto de reorden.', 'PENDIENTE')
ON DUPLICATE KEY UPDATE cantidad_sugerida_comprar = VALUES(cantidad_sugerida_comprar), estado = VALUES(estado);

INSERT INTO cierre_inventario_periodo
  (id, negocio_id, sucursal_id, almacen_id, fecha_cierre, tipo_periodo,
   total_unidades_cerradas, valor_total_inventario, ejecutado_por_usuario_id, observaciones)
VALUES
  (@cierre_1, @negocio, @sucursal_1, @almacen_1, '2026-11-15', 'DIARIO', 61, 169.90, @usuario_1, 'Cierre diario de muestra'),
  (@cierre_2, @negocio, @sucursal_1, @almacen_1, '2026-11-16', 'DIARIO', 61, 169.90, @usuario_1, 'Segundo cierre diario de muestra')
ON DUPLICATE KEY UPDATE total_unidades_cerradas = VALUES(total_unidades_cerradas), valor_total_inventario = VALUES(valor_total_inventario);

INSERT INTO cierre_inventario_detalle
  (id, cierre_periodo_id, producto_id, lote_id, cantidad_inicial, cantidad_entradas,
   cantidad_salidas, cantidad_final, costo_unitario_corte, valor_total_linea)
VALUES
  ('2a000000-0000-4000-8000-000000000001', @cierre_1, @producto_1, @lote_1, 40, 0, 2, 38, 3.2000, 121.6000),
  ('2a000000-0000-4000-8000-000000000002', @cierre_1, @producto_2, @lote_2, 24, 0, 1, 23, 2.1000, 48.3000)
ON DUPLICATE KEY UPDATE cantidad_final = VALUES(cantidad_final), valor_total_linea = VALUES(valor_total_linea);

COMMIT;

-- Comprobación rápida de la muestra cargada
SELECT n.nombre AS negocio, COUNT(DISTINCT p.id) AS productos,
       SUM(sa.cantidad_actual) AS unidades_en_stock
FROM negocio n
LEFT JOIN producto p ON p.negocio_id = n.id AND p.deleted_at IS NULL
LEFT JOIN stock_almacen sa ON sa.producto_id = p.id
WHERE n.id = @negocio
GROUP BY n.id, n.nombre;
