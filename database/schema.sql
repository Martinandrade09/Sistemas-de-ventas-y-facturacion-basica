-- SISTEMA DE GESTION DE VENTAS Y FACTURACION BASICA
-- Esquema aprobado: 12 tablas, 79 atributos de negocio.
-- Destino: MySQL 8.0.16+ (CHECK aplicado); indices funcionales MySQL 8.0.13+.
-- Ejecutar sobre una base de datos NUEVA; no elimina tablas existentes.
-- Reglas de permisos, concurrencia, calculos, estados y transacciones
-- deben implementarse tambien en servicios PHP/PDO.

CREATE DATABASE IF NOT EXISTS sistema_ventas
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sistema_ventas;

-- 1. ROLES
CREATE TABLE IF NOT EXISTS roles (
  id_rol INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(30) NOT NULL,
  PRIMARY KEY (id_rol),
  CONSTRAINT uq_roles_nombre UNIQUE (nombre)
) ENGINE=InnoDB;

-- 2. USUARIOS
CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario VARCHAR(50) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  id_rol INT UNSIGNED NOT NULL,
  estado ENUM('ACTIVO','INACTIVO') NOT NULL DEFAULT 'ACTIVO',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_usuario),
  CONSTRAINT uq_usuarios_usuario UNIQUE (usuario),
  INDEX idx_usuarios_rol (id_rol),
  CONSTRAINT fk_usuarios_rol FOREIGN KEY (id_rol) REFERENCES roles (id_rol)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

-- 3. CLIENTES
CREATE TABLE IF NOT EXISTS clientes (
  id_cliente INT UNSIGNED NOT NULL AUTO_INCREMENT,
  identificacion VARCHAR(20) NOT NULL,
  nombres VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  telefono VARCHAR(20) NOT NULL,
  correo VARCHAR(150) NULL,
  direccion VARCHAR(200) NULL,
  estado ENUM('ACTIVO','INACTIVO') NOT NULL DEFAULT 'ACTIVO',
  PRIMARY KEY (id_cliente),
  CONSTRAINT uq_clientes_identificacion UNIQUE (identificacion)
) ENGINE=InnoDB;

-- 4. CATEGORIAS
CREATE TABLE IF NOT EXISTS categorias (
  id_categoria INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  estado ENUM('ACTIVO','INACTIVO') NOT NULL DEFAULT 'ACTIVO',
  PRIMARY KEY (id_categoria),
  CONSTRAINT uq_categorias_nombre UNIQUE (nombre)
) ENGINE=InnoDB;

-- 5. PRODUCTOS
CREATE TABLE IF NOT EXISTS productos (
  id_producto INT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo VARCHAR(30) NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT NULL,
  id_categoria INT UNSIGNED NOT NULL,
  precio_venta DECIMAL(12,2) NOT NULL,
  stock_actual INT UNSIGNED NOT NULL DEFAULT 0,
  stock_minimo INT UNSIGNED NOT NULL DEFAULT 0,
  estado ENUM('ACTIVO','INACTIVO') NOT NULL DEFAULT 'ACTIVO',
  PRIMARY KEY (id_producto),
  CONSTRAINT uq_productos_codigo UNIQUE (codigo),
  INDEX idx_productos_categoria (id_categoria),
  CONSTRAINT chk_productos_precio CHECK (precio_venta > 0),
  CONSTRAINT fk_productos_categoria FOREIGN KEY (id_categoria) REFERENCES categorias (id_categoria)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

-- 6. VENTAS (se crea antes de movimientos_inventario por su FK opcional)
CREATE TABLE IF NOT EXISTS ventas (
  id_venta INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_cliente INT UNSIGNED NOT NULL,
  id_vendedor INT UNSIGNED NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  estado ENUM('PENDIENTE','PAGADA','ANULADA') NOT NULL DEFAULT 'PENDIENTE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  motivo_anulacion VARCHAR(255) NULL,
  fecha_anulacion DATETIME NULL,
  id_usuario_anulacion INT UNSIGNED NULL,
  PRIMARY KEY (id_venta),
  INDEX idx_ventas_cliente (id_cliente),
  INDEX idx_ventas_vendedor (id_vendedor),
  INDEX idx_ventas_usuario_anulacion (id_usuario_anulacion),
  INDEX idx_ventas_estado_fecha (estado, created_at),
  CONSTRAINT chk_ventas_total CHECK (total > 0),
  CONSTRAINT chk_ventas_anulacion CHECK (
    (estado = 'ANULADA' AND motivo_anulacion IS NOT NULL
       AND CHAR_LENGTH(TRIM(motivo_anulacion)) > 0
       AND fecha_anulacion IS NOT NULL AND id_usuario_anulacion IS NOT NULL)
    OR
    (estado <> 'ANULADA' AND motivo_anulacion IS NULL
       AND fecha_anulacion IS NULL AND id_usuario_anulacion IS NULL)
  ),
  CONSTRAINT fk_ventas_cliente FOREIGN KEY (id_cliente) REFERENCES clientes (id_cliente)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_ventas_vendedor FOREIGN KEY (id_vendedor) REFERENCES usuarios (id_usuario)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_ventas_usuario_anulacion FOREIGN KEY (id_usuario_anulacion) REFERENCES usuarios (id_usuario)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

-- 7. MOVIMIENTOS DE INVENTARIO (8 atributos aprobados)
CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id_movimiento INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_producto INT UNSIGNED NOT NULL,
  id_usuario INT UNSIGNED NOT NULL,
  cantidad INT NOT NULL,
  tipo ENUM('ENTRADA','AJUSTE','VENTA','ANULACION') NOT NULL,
  motivo VARCHAR(255) NOT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  id_venta INT UNSIGNED NULL,
  PRIMARY KEY (id_movimiento),
  INDEX idx_mi_producto (id_producto),
  INDEX idx_mi_usuario (id_usuario),
  INDEX idx_mi_venta (id_venta),
  CONSTRAINT chk_mi_cantidad CHECK (cantidad <> 0),
  CONSTRAINT chk_mi_signo CHECK (
    (tipo IN ('ENTRADA','ANULACION') AND cantidad > 0)
    OR (tipo = 'VENTA' AND cantidad < 0)
    OR tipo = 'AJUSTE'
  ),
  CONSTRAINT chk_mi_motivo CHECK (CHAR_LENGTH(TRIM(motivo)) > 0),
  CONSTRAINT chk_mi_venta_requerida CHECK (
    (tipo IN ('VENTA','ANULACION') AND id_venta IS NOT NULL)
    OR (tipo IN ('ENTRADA','AJUSTE') AND id_venta IS NULL)
  ),
  CONSTRAINT fk_mi_producto FOREIGN KEY (id_producto) REFERENCES productos (id_producto)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_mi_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_mi_venta FOREIGN KEY (id_venta) REFERENCES ventas (id_venta)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

-- 8. DETALLE DE VENTA
CREATE TABLE IF NOT EXISTS detalle_venta (
  id_detalle INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_venta INT UNSIGNED NOT NULL,
  id_producto INT UNSIGNED NOT NULL,
  cantidad INT UNSIGNED NOT NULL,
  precio_unitario DECIMAL(12,2) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (id_detalle),
  CONSTRAINT uq_detalle_venta_producto UNIQUE (id_venta, id_producto),
  INDEX idx_detalle_producto (id_producto),
  CONSTRAINT chk_detalle_cantidad CHECK (cantidad > 0),
  CONSTRAINT chk_detalle_precio CHECK (precio_unitario > 0),
  CONSTRAINT chk_detalle_subtotal CHECK (subtotal >= 0),
  CONSTRAINT chk_detalle_calculo CHECK (subtotal = cantidad * precio_unitario),
  CONSTRAINT fk_detalle_venta FOREIGN KEY (id_venta) REFERENCES ventas (id_venta)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_detalle_producto FOREIGN KEY (id_producto) REFERENCES productos (id_producto)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

-- 9. PAGOS
CREATE TABLE IF NOT EXISTS pagos (
  id_pago INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_venta INT UNSIGNED NOT NULL,
  id_cajero INT UNSIGNED NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  metodo ENUM('EFECTIVO','TRANSFERENCIA') NOT NULL,
  referencia VARCHAR(100) NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_pago),
  CONSTRAINT uq_pagos_venta UNIQUE (id_venta),
  INDEX idx_pagos_cajero (id_cajero),
  CONSTRAINT chk_pagos_monto CHECK (monto > 0),
  CONSTRAINT chk_pagos_referencia CHECK (
    (metodo = 'EFECTIVO' AND referencia IS NULL)
    OR (metodo = 'TRANSFERENCIA' AND referencia IS NOT NULL
        AND CHAR_LENGTH(TRIM(referencia)) > 0)
  ),
  CONSTRAINT fk_pagos_venta FOREIGN KEY (id_venta) REFERENCES ventas (id_venta)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_pagos_cajero FOREIGN KEY (id_cajero) REFERENCES usuarios (id_usuario)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

-- 10. COMPROBANTES
CREATE TABLE IF NOT EXISTS comprobantes (
  id_comprobante INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_venta INT UNSIGNED NOT NULL,
  numero_comprobante VARCHAR(30) NOT NULL,
  fecha_emision DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado ENUM('VIGENTE','ANULADO') NOT NULL DEFAULT 'VIGENTE',
  PRIMARY KEY (id_comprobante),
  CONSTRAINT uq_comprobantes_venta UNIQUE (id_venta),
  CONSTRAINT uq_comprobantes_numero UNIQUE (numero_comprobante),
  CONSTRAINT fk_comprobantes_venta FOREIGN KEY (id_venta) REFERENCES ventas (id_venta)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

-- 11. CAJAS
CREATE TABLE IF NOT EXISTS cajas (
  id_caja INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_usuario INT UNSIGNED NOT NULL,
  saldo_inicial DECIMAL(12,2) NOT NULL,
  saldo_final DECIMAL(12,2) NULL,
  estado ENUM('ABIERTA','CERRADA') NOT NULL DEFAULT 'ABIERTA',
  fecha_apertura DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_cierre DATETIME NULL,
  PRIMARY KEY (id_caja),
  INDEX idx_cajas_usuario (id_usuario),
  CONSTRAINT chk_cajas_saldo_inicial CHECK (saldo_inicial >= 0),
  CONSTRAINT chk_cajas_saldo_final CHECK (saldo_final IS NULL OR saldo_final >= 0),
  CONSTRAINT chk_cajas_cierre CHECK (
    (estado = 'ABIERTA' AND saldo_final IS NULL AND fecha_cierre IS NULL)
    OR (estado = 'CERRADA' AND saldo_final IS NOT NULL
      AND fecha_cierre IS NOT NULL AND fecha_cierre >= fecha_apertura)
  ),
  CONSTRAINT fk_cajas_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

-- 12. MOVIMIENTOS DE CAJA (9 atributos aprobados)
CREATE TABLE IF NOT EXISTS movimientos_caja (
  id_movimiento_caja INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_caja INT UNSIGNED NOT NULL,
  tipo ENUM('INGRESO','EGRESO','DEVOLUCION') NOT NULL,
  metodo ENUM('EFECTIVO','TRANSFERENCIA') NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  concepto VARCHAR(255) NOT NULL,
  id_pago INT UNSIGNED NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  id_usuario INT UNSIGNED NOT NULL,
  PRIMARY KEY (id_movimiento_caja),
  INDEX idx_mc_caja (id_caja),
  INDEX idx_mc_pago (id_pago),
  INDEX idx_mc_usuario (id_usuario),
  CONSTRAINT chk_mc_monto CHECK (monto > 0),
  CONSTRAINT chk_mc_concepto CHECK (CHAR_LENGTH(TRIM(concepto)) > 0),
  CONSTRAINT chk_mc_pago CHECK (
    (tipo = 'EGRESO' AND id_pago IS NULL)
    OR (tipo = 'DEVOLUCION' AND id_pago IS NOT NULL)
    OR (tipo = 'INGRESO')
  ),
  CONSTRAINT fk_mc_caja FOREIGN KEY (id_caja) REFERENCES cajas (id_caja)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_mc_pago FOREIGN KEY (id_pago) REFERENCES pagos (id_pago)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_mc_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

