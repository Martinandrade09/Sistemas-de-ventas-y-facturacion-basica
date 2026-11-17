-- seed.sql | Datos FICTICIOS para desarrollo local, NO PRODUCCION
-- Requiere schema.sql cargado previamente (MySQL 8.0.16+).
-- Incluye 3 roles, 3 usuarios, 5 categorias, 15 productos, 5 clientes,
-- y 15 ENTRADAS iniciales con trazabilidad en movimientos_inventario.
-- Credenciales de DEMOSTRACION: ver instrucciones entregadas aparte.
-- No usar las contrasenas de demostracion en produccion.
-- Ejecutar una sola vez o repetir: se evita duplicar registros por claves naturales.
-- Si ya existen codigos de productos, NO se modifican sus existencias ni precios.

USE sistema_ventas;
SET NAMES utf8mb4;
START TRANSACTION;

-- 1. Roles
INSERT INTO roles (nombre) VALUES ('Administrador') ON DUPLICATE KEY UPDATE id_rol = id_rol;
INSERT INTO roles (nombre) VALUES ('Cajero') ON DUPLICATE KEY UPDATE id_rol = id_rol;
INSERT INTO roles (nombre) VALUES ('Vendedor') ON DUPLICATE KEY UPDATE id_rol = id_rol;

-- 2. Usuarios (hashes Bcrypt generados con PHP password_hash)
INSERT INTO usuarios (usuario,password_hash,id_rol,estado) SELECT 'admin_test', '$2y$12$m/ayfqmWoAqlPQekRfsJD.882MVOYEZ8qIs1yBQFEzFACEKgT96Yi', r.id_rol, 'ACTIVO' FROM roles r WHERE r.nombre='Administrador' ON DUPLICATE KEY UPDATE id_usuario = id_usuario;
INSERT INTO usuarios (usuario,password_hash,id_rol,estado) SELECT 'cajero_test', '$2y$12$8WxoyK5f1cp6WD23M0kIiO9LyerN2i2nb/9LKZ6wVRes8ILZE3.FS', r.id_rol, 'ACTIVO' FROM roles r WHERE r.nombre='Cajero' ON DUPLICATE KEY UPDATE id_usuario = id_usuario;
INSERT INTO usuarios (usuario,password_hash,id_rol,estado) SELECT 'vendedor_test', '$2y$12$h0JSFIyQ8ypVCP4pKpdOeeorXxZfY.0v7h6BpQtOQjFuiOAjFnPlC', r.id_rol, 'ACTIVO' FROM roles r WHERE r.nombre='Vendedor' ON DUPLICATE KEY UPDATE id_usuario = id_usuario;

-- 3. Categorias
INSERT INTO categorias (nombre,estado) VALUES ('Computadores','ACTIVO') ON DUPLICATE KEY UPDATE id_categoria=id_categoria;
INSERT INTO categorias (nombre,estado) VALUES ('Periféricos','ACTIVO') ON DUPLICATE KEY UPDATE id_categoria=id_categoria;
INSERT INTO categorias (nombre,estado) VALUES ('Almacenamiento','ACTIVO') ON DUPLICATE KEY UPDATE id_categoria=id_categoria;
INSERT INTO categorias (nombre,estado) VALUES ('Componentes','ACTIVO') ON DUPLICATE KEY UPDATE id_categoria=id_categoria;
INSERT INTO categorias (nombre,estado) VALUES ('Accesorios','ACTIVO') ON DUPLICATE KEY UPDATE id_categoria=id_categoria;

-- 4. Productos: siempre se crean con stock 0.
-- Para cada producto nuevo, la entrada se registra primero en movimientos_inventario.
-- Si el codigo ya existia, se omite tanto el producto como su entrada inicial.
INSERT INTO productos (codigo,nombre,descripcion,id_categoria,precio_venta,stock_actual,stock_minimo,estado)
SELECT 'PC-001', 'Portátil Core i5 16 GB', NULL, c.id_categoria, 2450000.00, 0, 2, 'ACTIVO'
FROM categorias c WHERE c.nombre='Computadores'
  AND NOT EXISTS (SELECT 1 FROM productos p WHERE p.codigo='PC-001');
SET @producto_nuevo = ROW_COUNT();
INSERT INTO movimientos_inventario (id_producto,id_usuario,cantidad,tipo,motivo,id_venta)
SELECT p.id_producto, u.id_usuario, 8, 'ENTRADA', 'Carga inicial de inventario (seed.sql)', NULL
FROM productos p JOIN usuarios u ON u.usuario='admin_test'
WHERE p.codigo='PC-001' AND @producto_nuevo = 1;
UPDATE productos SET stock_actual = stock_actual + 8 WHERE codigo='PC-001' AND @producto_nuevo = 1;

INSERT INTO productos (codigo,nombre,descripcion,id_categoria,precio_venta,stock_actual,stock_minimo,estado)
SELECT 'PC-002', 'Computador de escritorio Ryzen 5', NULL, c.id_categoria, 2150000.00, 0, 2, 'ACTIVO'
FROM categorias c WHERE c.nombre='Computadores'
  AND NOT EXISTS (SELECT 1 FROM productos p WHERE p.codigo='PC-002');
SET @producto_nuevo = ROW_COUNT();
INSERT INTO movimientos_inventario (id_producto,id_usuario,cantidad,tipo,motivo,id_venta)
SELECT p.id_producto, u.id_usuario, 5, 'ENTRADA', 'Carga inicial de inventario (seed.sql)', NULL
FROM productos p JOIN usuarios u ON u.usuario='admin_test'
WHERE p.codigo='PC-002' AND @producto_nuevo = 1;
UPDATE productos SET stock_actual = stock_actual + 5 WHERE codigo='PC-002' AND @producto_nuevo = 1;

INSERT INTO productos (codigo,nombre,descripcion,id_categoria,precio_venta,stock_actual,stock_minimo,estado)
SELECT 'PC-003', 'Portátil básico 8 GB', NULL, c.id_categoria, 1650000.00, 0, 2, 'ACTIVO'
FROM categorias c WHERE c.nombre='Computadores'
  AND NOT EXISTS (SELECT 1 FROM productos p WHERE p.codigo='PC-003');
SET @producto_nuevo = ROW_COUNT();
INSERT INTO movimientos_inventario (id_producto,id_usuario,cantidad,tipo,motivo,id_venta)
SELECT p.id_producto, u.id_usuario, 6, 'ENTRADA', 'Carga inicial de inventario (seed.sql)', NULL
FROM productos p JOIN usuarios u ON u.usuario='admin_test'
WHERE p.codigo='PC-003' AND @producto_nuevo = 1;
UPDATE productos SET stock_actual = stock_actual + 6 WHERE codigo='PC-003' AND @producto_nuevo = 1;

INSERT INTO productos (codigo,nombre,descripcion,id_categoria,precio_venta,stock_actual,stock_minimo,estado)
SELECT 'PER-001', 'Mouse inalámbrico', NULL, c.id_categoria, 45000.00, 0, 5, 'ACTIVO'
FROM categorias c WHERE c.nombre='Periféricos'
  AND NOT EXISTS (SELECT 1 FROM productos p WHERE p.codigo='PER-001');
SET @producto_nuevo = ROW_COUNT();
INSERT INTO movimientos_inventario (id_producto,id_usuario,cantidad,tipo,motivo,id_venta)
SELECT p.id_producto, u.id_usuario, 30, 'ENTRADA', 'Carga inicial de inventario (seed.sql)', NULL
FROM productos p JOIN usuarios u ON u.usuario='admin_test'
WHERE p.codigo='PER-001' AND @producto_nuevo = 1;
UPDATE productos SET stock_actual = stock_actual + 30 WHERE codigo='PER-001' AND @producto_nuevo = 1;

INSERT INTO productos (codigo,nombre,descripcion,id_categoria,precio_venta,stock_actual,stock_minimo,estado)
SELECT 'PER-002', 'Teclado mecánico', NULL, c.id_categoria, 180000.00, 0, 3, 'ACTIVO'
FROM categorias c WHERE c.nombre='Periféricos'
  AND NOT EXISTS (SELECT 1 FROM productos p WHERE p.codigo='PER-002');
SET @producto_nuevo = ROW_COUNT();
INSERT INTO movimientos_inventario (id_producto,id_usuario,cantidad,tipo,motivo,id_venta)
SELECT p.id_producto, u.id_usuario, 12, 'ENTRADA', 'Carga inicial de inventario (seed.sql)', NULL
FROM productos p JOIN usuarios u ON u.usuario='admin_test'
WHERE p.codigo='PER-002' AND @producto_nuevo = 1;
UPDATE productos SET stock_actual = stock_actual + 12 WHERE codigo='PER-002' AND @producto_nuevo = 1;

INSERT INTO productos (codigo,nombre,descripcion,id_categoria,precio_venta,stock_actual,stock_minimo,estado)
SELECT 'PER-003', 'Monitor 24 pulgadas', NULL, c.id_categoria, 520000.00, 0, 2, 'ACTIVO'
FROM categorias c WHERE c.nombre='Periféricos'
  AND NOT EXISTS (SELECT 1 FROM productos p WHERE p.codigo='PER-003');
SET @producto_nuevo = ROW_COUNT();
INSERT INTO movimientos_inventario (id_producto,id_usuario,cantidad,tipo,motivo,id_venta)
SELECT p.id_producto, u.id_usuario, 10, 'ENTRADA', 'Carga inicial de inventario (seed.sql)', NULL
FROM productos p JOIN usuarios u ON u.usuario='admin_test'
WHERE p.codigo='PER-003' AND @producto_nuevo = 1;
UPDATE productos SET stock_actual = stock_actual + 10 WHERE codigo='PER-003' AND @producto_nuevo = 1;

INSERT INTO productos (codigo,nombre,descripcion,id_categoria,precio_venta,stock_actual,stock_minimo,estado)
SELECT 'ALM-001', 'SSD 480 GB', NULL, c.id_categoria, 155000.00, 0, 4, 'ACTIVO'
FROM categorias c WHERE c.nombre='Almacenamiento'
  AND NOT EXISTS (SELECT 1 FROM productos p WHERE p.codigo='ALM-001');
SET @producto_nuevo = ROW_COUNT();
INSERT INTO movimientos_inventario (id_producto,id_usuario,cantidad,tipo,motivo,id_venta)
SELECT p.id_producto, u.id_usuario, 18, 'ENTRADA', 'Carga inicial de inventario (seed.sql)', NULL
FROM productos p JOIN usuarios u ON u.usuario='admin_test'
WHERE p.codigo='ALM-001' AND @producto_nuevo = 1;
UPDATE productos SET stock_actual = stock_actual + 18 WHERE codigo='ALM-001' AND @producto_nuevo = 1;

INSERT INTO productos (codigo,nombre,descripcion,id_categoria,precio_venta,stock_actual,stock_minimo,estado)
SELECT 'ALM-002', 'SSD NVMe 1 TB', NULL, c.id_categoria, 310000.00, 0, 3, 'ACTIVO'
FROM categorias c WHERE c.nombre='Almacenamiento'
  AND NOT EXISTS (SELECT 1 FROM productos p WHERE p.codigo='ALM-002');
SET @producto_nuevo = ROW_COUNT();
INSERT INTO movimientos_inventario (id_producto,id_usuario,cantidad,tipo,motivo,id_venta)
SELECT p.id_producto, u.id_usuario, 10, 'ENTRADA', 'Carga inicial de inventario (seed.sql)', NULL
FROM productos p JOIN usuarios u ON u.usuario='admin_test'
WHERE p.codigo='ALM-002' AND @producto_nuevo = 1;
UPDATE productos SET stock_actual = stock_actual + 10 WHERE codigo='ALM-002' AND @producto_nuevo = 1;

INSERT INTO productos (codigo,nombre,descripcion,id_categoria,precio_venta,stock_actual,stock_minimo,estado)
SELECT 'ALM-003', 'Memoria USB 64 GB', NULL, c.id_categoria, 38000.00, 0, 6, 'ACTIVO'
FROM categorias c WHERE c.nombre='Almacenamiento'
  AND NOT EXISTS (SELECT 1 FROM productos p WHERE p.codigo='ALM-003');
SET @producto_nuevo = ROW_COUNT();
INSERT INTO movimientos_inventario (id_producto,id_usuario,cantidad,tipo,motivo,id_venta)
SELECT p.id_producto, u.id_usuario, 35, 'ENTRADA', 'Carga inicial de inventario (seed.sql)', NULL
FROM productos p JOIN usuarios u ON u.usuario='admin_test'
WHERE p.codigo='ALM-003' AND @producto_nuevo = 1;
UPDATE productos SET stock_actual = stock_actual + 35 WHERE codigo='ALM-003' AND @producto_nuevo = 1;

INSERT INTO productos (codigo,nombre,descripcion,id_categoria,precio_venta,stock_actual,stock_minimo,estado)
SELECT 'COM-001', 'Memoria RAM DDR4 8 GB', NULL, c.id_categoria, 110000.00, 0, 5, 'ACTIVO'
FROM categorias c WHERE c.nombre='Componentes'
  AND NOT EXISTS (SELECT 1 FROM productos p WHERE p.codigo='COM-001');
SET @producto_nuevo = ROW_COUNT();
INSERT INTO movimientos_inventario (id_producto,id_usuario,cantidad,tipo,motivo,id_venta)
SELECT p.id_producto, u.id_usuario, 20, 'ENTRADA', 'Carga inicial de inventario (seed.sql)', NULL
FROM productos p JOIN usuarios u ON u.usuario='admin_test'
WHERE p.codigo='COM-001' AND @producto_nuevo = 1;
UPDATE productos SET stock_actual = stock_actual + 20 WHERE codigo='COM-001' AND @producto_nuevo = 1;

INSERT INTO productos (codigo,nombre,descripcion,id_categoria,precio_venta,stock_actual,stock_minimo,estado)
SELECT 'COM-002', 'Fuente de poder 600 W', NULL, c.id_categoria, 220000.00, 0, 2, 'ACTIVO'
FROM categorias c WHERE c.nombre='Componentes'
  AND NOT EXISTS (SELECT 1 FROM productos p WHERE p.codigo='COM-002');
SET @producto_nuevo = ROW_COUNT();
INSERT INTO movimientos_inventario (id_producto,id_usuario,cantidad,tipo,motivo,id_venta)
SELECT p.id_producto, u.id_usuario, 8, 'ENTRADA', 'Carga inicial de inventario (seed.sql)', NULL
FROM productos p JOIN usuarios u ON u.usuario='admin_test'
WHERE p.codigo='COM-002' AND @producto_nuevo = 1;
UPDATE productos SET stock_actual = stock_actual + 8 WHERE codigo='COM-002' AND @producto_nuevo = 1;

INSERT INTO productos (codigo,nombre,descripcion,id_categoria,precio_venta,stock_actual,stock_minimo,estado)
SELECT 'COM-003', 'Tarjeta gráfica básica', NULL, c.id_categoria, 890000.00, 0, 2, 'ACTIVO'
FROM categorias c WHERE c.nombre='Componentes'
  AND NOT EXISTS (SELECT 1 FROM productos p WHERE p.codigo='COM-003');
SET @producto_nuevo = ROW_COUNT();
INSERT INTO movimientos_inventario (id_producto,id_usuario,cantidad,tipo,motivo,id_venta)
SELECT p.id_producto, u.id_usuario, 4, 'ENTRADA', 'Carga inicial de inventario (seed.sql)', NULL
FROM productos p JOIN usuarios u ON u.usuario='admin_test'
WHERE p.codigo='COM-003' AND @producto_nuevo = 1;
UPDATE productos SET stock_actual = stock_actual + 4 WHERE codigo='COM-003' AND @producto_nuevo = 1;

INSERT INTO productos (codigo,nombre,descripcion,id_categoria,precio_venta,stock_actual,stock_minimo,estado)
SELECT 'ACC-001', 'Audífonos con micrófono', NULL, c.id_categoria, 85000.00, 0, 4, 'ACTIVO'
FROM categorias c WHERE c.nombre='Accesorios'
  AND NOT EXISTS (SELECT 1 FROM productos p WHERE p.codigo='ACC-001');
SET @producto_nuevo = ROW_COUNT();
INSERT INTO movimientos_inventario (id_producto,id_usuario,cantidad,tipo,motivo,id_venta)
SELECT p.id_producto, u.id_usuario, 20, 'ENTRADA', 'Carga inicial de inventario (seed.sql)', NULL
FROM productos p JOIN usuarios u ON u.usuario='admin_test'
WHERE p.codigo='ACC-001' AND @producto_nuevo = 1;
UPDATE productos SET stock_actual = stock_actual + 20 WHERE codigo='ACC-001' AND @producto_nuevo = 1;

INSERT INTO productos (codigo,nombre,descripcion,id_categoria,precio_venta,stock_actual,stock_minimo,estado)
SELECT 'ACC-002', 'Base refrigerante para portátil', NULL, c.id_categoria, 75000.00, 0, 3, 'ACTIVO'
FROM categorias c WHERE c.nombre='Accesorios'
  AND NOT EXISTS (SELECT 1 FROM productos p WHERE p.codigo='ACC-002');
SET @producto_nuevo = ROW_COUNT();
INSERT INTO movimientos_inventario (id_producto,id_usuario,cantidad,tipo,motivo,id_venta)
SELECT p.id_producto, u.id_usuario, 12, 'ENTRADA', 'Carga inicial de inventario (seed.sql)', NULL
FROM productos p JOIN usuarios u ON u.usuario='admin_test'
WHERE p.codigo='ACC-002' AND @producto_nuevo = 1;
UPDATE productos SET stock_actual = stock_actual + 12 WHERE codigo='ACC-002' AND @producto_nuevo = 1;

INSERT INTO productos (codigo,nombre,descripcion,id_categoria,precio_venta,stock_actual,stock_minimo,estado)
SELECT 'ACC-003', 'Cable HDMI 2 metros', NULL, c.id_categoria, 25000.00, 0, 8, 'ACTIVO'
FROM categorias c WHERE c.nombre='Accesorios'
  AND NOT EXISTS (SELECT 1 FROM productos p WHERE p.codigo='ACC-003');
SET @producto_nuevo = ROW_COUNT();
INSERT INTO movimientos_inventario (id_producto,id_usuario,cantidad,tipo,motivo,id_venta)
SELECT p.id_producto, u.id_usuario, 40, 'ENTRADA', 'Carga inicial de inventario (seed.sql)', NULL
FROM productos p JOIN usuarios u ON u.usuario='admin_test'
WHERE p.codigo='ACC-003' AND @producto_nuevo = 1;
UPDATE productos SET stock_actual = stock_actual + 40 WHERE codigo='ACC-003' AND @producto_nuevo = 1;

-- 5. Clientes ficticios (correo y direccion NULL)
INSERT INTO clientes (identificacion,nombres,apellidos,telefono,correo,direccion,estado) VALUES ('TEST-CLI-001','Carlos','Ramírez','3000000001',NULL,NULL,'ACTIVO') ON DUPLICATE KEY UPDATE id_cliente=id_cliente;
INSERT INTO clientes (identificacion,nombres,apellidos,telefono,correo,direccion,estado) VALUES ('TEST-CLI-002','Laura','Martínez','3000000002',NULL,NULL,'ACTIVO') ON DUPLICATE KEY UPDATE id_cliente=id_cliente;
INSERT INTO clientes (identificacion,nombres,apellidos,telefono,correo,direccion,estado) VALUES ('TEST-CLI-003','Andrés','Gómez','3000000003',NULL,NULL,'ACTIVO') ON DUPLICATE KEY UPDATE id_cliente=id_cliente;
INSERT INTO clientes (identificacion,nombres,apellidos,telefono,correo,direccion,estado) VALUES ('TEST-CLI-004','Valentina','Torres','3000000004',NULL,NULL,'ACTIVO') ON DUPLICATE KEY UPDATE id_cliente=id_cliente;
INSERT INTO clientes (identificacion,nombres,apellidos,telefono,correo,direccion,estado) VALUES ('TEST-CLI-005','Daniel','Herrera','3000000005',NULL,NULL,'INACTIVO') ON DUPLICATE KEY UPDATE id_cliente=id_cliente;

COMMIT;

-- Consultas de verificacion (no alteran datos)
SELECT "roles" AS tabla, COUNT(*) AS total FROM roles
UNION ALL SELECT "usuarios", COUNT(*) FROM usuarios
UNION ALL SELECT "categorias", COUNT(*) FROM categorias
UNION ALL SELECT "productos", COUNT(*) FROM productos
UNION ALL SELECT "clientes", COUNT(*) FROM clientes
UNION ALL SELECT "movimientos_inventario", COUNT(*) FROM movimientos_inventario;

SELECT p.codigo,p.nombre,p.stock_actual,COALESCE(SUM(CASE WHEN mi.tipo='ENTRADA' THEN mi.cantidad ELSE 0 END),0) AS entradas_registradas
FROM productos p LEFT JOIN movimientos_inventario mi ON mi.id_producto=p.id_producto
WHERE p.codigo IN ('PC-001', 'PC-002', 'PC-003', 'PER-001', 'PER-002', 'PER-003', 'ALM-001', 'ALM-002', 'ALM-003', 'COM-001', 'COM-002', 'COM-003', 'ACC-001', 'ACC-002', 'ACC-003')
GROUP BY p.id_producto,p.codigo,p.nombre,p.stock_actual ORDER BY p.codigo;

