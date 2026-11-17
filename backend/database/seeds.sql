-- DATOS INICIALES (SEEDS) PARA SISTEMA DE VENTAS Y FACTURACIÓN
USE sistema_ventas;

-- 1. ROLES
INSERT IGNORE INTO roles (id_rol, nombre) VALUES
(1, 'ADMINISTRADOR'),
(2, 'CAJERO'),
(3, 'VENDEDOR');

-- 2. USUARIOS (Password por defecto: admin123, cajero123, vendedor123)
INSERT IGNORE INTO usuarios (id_usuario, usuario, password_hash, id_rol, estado) VALUES
(1, 'carlos.admin', '$2y$10$YFHfyekBBe8qluk9bSNPpu9OXkcUEe3D.oLVCAeUodVNEE/3Guke6', 1, 'ACTIVO'),
(2, 'andres.cajero', '$2y$10$YFHfyekBBe8qluk9bSNPpu9OXkcUEe3D.oLVCAeUodVNEE/3Guke6', 2, 'ACTIVO'),
(3, 'laura.vendedora', '$2y$10$YFHfyekBBe8qluk9bSNPpu9OXkcUEe3D.oLVCAeUodVNEE/3Guke6', 3, 'ACTIVO');

-- 3. CLIENTES
INSERT IGNORE INTO clientes (id_cliente, identificacion, nombres, apellidos, telefono, correo, direccion, estado) VALUES
(1, '1098765432', 'Mariana', 'López Restrepo', '3001234567', 'mariana.lopez@email.com', 'Calle 45 # 23-10, Bogotá', 'ACTIVO'),
(2, '901234567', 'Tecnología & Redes', 'SAS', '6017894561', 'contacto@tecnoredes.co', 'Carrera 7 # 72-15 Of. 501', 'ACTIVO'),
(3, '1014258369', 'Camilo', 'Herrera Duarte', '3159876543', 'camilo.herrera@email.com', 'Avenida 19 # 104-32', 'ACTIVO'),
(4, '2222222222', 'Cliente', 'General / Mostrador', '0000000000', 'cliente@mostrador.com', 'Local Principal', 'ACTIVO');

-- 4. CATEGORIAS
INSERT IGNORE INTO categorias (id_categoria, nombre, estado) VALUES
(1, 'Almacenamiento', 'ACTIVO'),
(2, 'Periféricos', 'ACTIVO'),
(3, 'Componentes', 'ACTIVO'),
(4, 'Accesorios', 'ACTIVO');

-- 5. PRODUCTOS
INSERT IGNORE INTO productos (id_producto, codigo, nombre, descripcion, id_categoria, precio_venta, stock_actual, stock_minimo, estado) VALUES
(1, 'COD-SSD-101', 'Disco Sólido Kingston NV2 1TB PCIe 4.0', 'M.2 2280 NVMe Alta Velocidad 3500MB/s', 1, 280000.00, 14, 5, 'ACTIVO'),
(2, 'COD-MOU-204', 'Mouse Óptico Logitech G203 Lightsync', 'RGB 8000 DPI Sensor Gaming 6 Botones', 2, 95000.00, 8, 4, 'ACTIVO'),
(3, 'COD-MOU-102', 'Mouse Inalámbrico Logitech M170', 'Receptor USB 2.4GHz Color Negro', 2, 45000.00, 3, 5, 'ACTIVO'),
(4, 'COD-RAM-305', 'Memoria RAM Corsair Vengeance LPX 16GB', 'DDR4 3200MHz CL16 Disipador Negro', 3, 195000.00, 12, 4, 'ACTIVO'),
(5, 'COD-TEC-401', 'Teclado Mecánico Redragon Kumara K552', 'Switch Outemu Blue RGB Anti-Ghosting', 2, 160000.00, 6, 3, 'ACTIVO'),
(6, 'COD-CAB-502', 'Cable HDMI 2.1 Ultra Alta Velocidad 2m', 'Soporta 8K 60Hz / 4K 120Hz Trenzado', 4, 38000.00, 25, 6, 'ACTIVO');

-- 6. REGISTRO INICIAL DE INVENTARIO (ENTRADAS PARA CUBRIR EL STOCK ACTUAL)
INSERT IGNORE INTO movimientos_inventario (id_movimiento, id_producto, id_usuario, cantidad, tipo, motivo, id_venta) VALUES
(1, 1, 1, 14, 'ENTRADA', 'Carga de inventario inicial', NULL),
(2, 2, 1, 8, 'ENTRADA', 'Carga de inventario inicial', NULL),
(3, 3, 1, 3, 'ENTRADA', 'Carga de inventario inicial', NULL),
(4, 4, 1, 12, 'ENTRADA', 'Carga de inventario inicial', NULL),
(5, 5, 1, 6, 'ENTRADA', 'Carga de inventario inicial', NULL),
(6, 6, 1, 25, 'ENTRADA', 'Carga de inventario inicial', NULL);

-- 7. APERTURA DE CAJA INICIAL PARA EL CAJERO
INSERT IGNORE INTO cajas (id_caja, id_usuario, saldo_inicial, saldo_final, estado, fecha_apertura) VALUES
(1, 2, 200000.00, NULL, 'ABIERTA', NOW());

