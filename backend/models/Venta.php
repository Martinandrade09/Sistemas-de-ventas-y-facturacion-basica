<?php
require_once __DIR__ . '/../config/Database.php';

class Venta {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    public function listar(?string $estado = null, ?string $fecha = null, ?int $idVendedor = null): array {
        $sql = "SELECT v.*, 
                       CONCAT(c.nombres, ' ', c.apellidos) AS cliente_nombre,
                       c.identificacion AS cliente_identificacion,
                       u.usuario AS vendedor_nombre,
                       p.metodo AS metodo_pago,
                       p.monto AS monto_pagado,
                       comp.numero_comprobante,
                       comp.estado AS estado_comprobante
                FROM ventas v
                INNER JOIN clientes c ON v.id_cliente = c.id_cliente
                INNER JOIN usuarios u ON v.id_vendedor = u.id_usuario
                LEFT JOIN pagos p ON v.id_venta = p.id_venta
                LEFT JOIN comprobantes comp ON v.id_venta = comp.id_venta
                WHERE 1=1";
        $params = [];

        if (!empty($estado)) {
            $sql .= " AND v.estado = :estado";
            $params[':estado'] = $estado;
        }

        if (!empty($fecha)) {
            $sql .= " AND DATE(v.created_at) = :fecha";
            $params[':fecha'] = $fecha;
        }

        if (!empty($idVendedor)) {
            $sql .= " AND v.id_vendedor = :id_vendedor";
            $params[':id_vendedor'] = $idVendedor;
        }

        $sql .= " ORDER BY v.created_at DESC, v.id_venta DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function obtenerPorId(int $idVenta): ?array {
        $sql = "SELECT v.*, 
                       CONCAT(c.nombres, ' ', c.apellidos) AS cliente_nombre,
                       c.identificacion AS cliente_identificacion,
                       c.telefono AS cliente_telefono,
                       c.correo AS cliente_correo,
                       c.direccion AS cliente_direccion,
                       u.usuario AS vendedor_nombre,
                       ua.usuario AS usuario_anulacion_nombre,
                       p.id_pago, p.metodo AS metodo_pago, p.referencia AS referencia_pago, p.monto AS monto_pago, p.fecha AS fecha_pago,
                       caj.usuario AS cajero_nombre,
                       comp.id_comprobante, comp.numero_comprobante, comp.fecha_emision AS fecha_comprobante, comp.estado AS estado_comprobante
                FROM ventas v
                INNER JOIN clientes c ON v.id_cliente = c.id_cliente
                INNER JOIN usuarios u ON v.id_vendedor = u.id_usuario
                LEFT JOIN usuarios ua ON v.id_usuario_anulacion = ua.id_usuario
                LEFT JOIN pagos p ON v.id_venta = p.id_venta
                LEFT JOIN usuarios caj ON p.id_cajero = caj.id_usuario
                LEFT JOIN comprobantes comp ON v.id_venta = comp.id_venta
                WHERE v.id_venta = :id LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $idVenta]);
        $venta = $stmt->fetch();

        if (!$venta) return null;

        // Cargar detalle
        $stmtDet = $this->db->prepare("SELECT dv.*, prod.codigo AS producto_codigo, prod.nombre AS producto_nombre 
                                       FROM detalle_venta dv 
                                       INNER JOIN productos prod ON dv.id_producto = prod.id_producto 
                                       WHERE dv.id_venta = :id_venta");
        $stmtDet->execute([':id_venta' => $idVenta]);
        $venta['items'] = $stmtDet->fetchAll();

        return $venta;
    }

    /**
     * Paso 1: Crear Venta en estado PENDIENTE con items calculados en servidor
     */
    public function crearVentaPendiente(int $idCliente, int $idVendedor, array $items): array {
        if (empty($items)) {
            throw new InvalidArgumentException('La venta debe tener al menos un producto (>= 1 detalle).');
        }

        $this->db->beginTransaction();
        try {
            // Verificar cliente activo
            $stmtCli = $this->db->prepare("SELECT id_cliente, estado FROM clientes WHERE id_cliente = :id");
            $stmtCli->execute([':id' => $idCliente]);
            $cliente = $stmtCli->fetch();
            if (!$cliente || $cliente['estado'] !== 'ACTIVO') {
                throw new Exception('El cliente no existe o se encuentra inactivo.');
            }

            // Calcular total verificando precios y stock con bloqueo
            $totalVenta = 0.0;
            $itemsValidados = [];

            foreach ($items as $item) {
                $idProd = (int)$item['id_producto'];
                $cant = (int)$item['cantidad'];

                if ($cant <= 0) {
                    throw new Exception("Cantidad inválida para producto ID $idProd. Debe ser mayor a 0.");
                }

                $stmtP = $this->db->prepare("SELECT id_producto, codigo, nombre, precio_venta, stock_actual, estado 
                                             FROM productos WHERE id_producto = :id FOR UPDATE");
                $stmtP->execute([':id' => $idProd]);
                $prod = $stmtP->fetch();

                if (!$prod || $prod['estado'] !== 'ACTIVO') {
                    throw new Exception("El producto con ID $idProd no existe o no está activo.");
                }

                if ($prod['stock_actual'] < $cant) {
                    throw new Exception("Stock insuficiente para '{$prod['nombre']}'. Disponible: {$prod['stock_actual']}, solicitado: $cant.");
                }

                $precioUnitario = (float)$prod['precio_venta'];
                $subtotal = round($precioUnitario * $cant, 2);
                $totalVenta += $subtotal;

                $itemsValidados[] = [
                    'id_producto'     => $idProd,
                    'cantidad'        => $cant,
                    'precio_unitario' => $precioUnitario,
                    'subtotal'        => $subtotal,
                ];
            }

            if ($totalVenta <= 0) {
                throw new Exception('El total calculado de la venta debe ser mayor a 0.');
            }

            // Insertar cabecera de la venta
            $stmtV = $this->db->prepare("INSERT INTO ventas (id_cliente, id_vendedor, total, estado, created_at) 
                                         VALUES (:id_cliente, :id_vendedor, :total, 'PENDIENTE', NOW())");
            $stmtV->execute([
                ':id_cliente'  => $idCliente,
                ':id_vendedor' => $idVendedor,
                ':total'       => $totalVenta
            ]);
            $idVenta = (int)$this->db->lastInsertId();

            // Insertar detalles
            $stmtDet = $this->db->prepare("INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario, subtotal) 
                                           VALUES (:id_venta, :id_producto, :cantidad, :precio_unitario, :subtotal)");
            foreach ($itemsValidados as $iv) {
                $stmtDet->execute([
                    ':id_venta'        => $idVenta,
                    ':id_producto'     => $iv['id_producto'],
                    ':cantidad'        => $iv['cantidad'],
                    ':precio_unitario' => $iv['precio_unitario'],
                    ':subtotal'        => $iv['subtotal']
                ]);
            }

            $this->db->commit();
            return $this->obtenerPorId($idVenta);
        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Paso 2: Confirmar Pago en Caja (Transacción Atómica ACID Completa)
     */
    public function confirmarPago(int $idVenta, int $idCajero, string $metodo, ?string $referencia = null): array {
        if (!in_array($metodo, ['EFECTIVO', 'TRANSFERENCIA'])) {
            throw new InvalidArgumentException("Método de pago no soportado: $metodo");
        }

        if ($metodo === 'EFECTIVO') {
            $referencia = null; // Exigido por CHECK
        } else {
            if (empty(trim($referencia ?? ''))) {
                throw new InvalidArgumentException("Para pago con TRANSFERENCIA la referencia bancaria es obligatoria.");
            }
            $referencia = trim($referencia);
        }

        $this->db->beginTransaction();
        try {
            // 1. Bloquear y verificar venta
            $stmtV = $this->db->prepare("SELECT * FROM ventas WHERE id_venta = :id FOR UPDATE");
            $stmtV->execute([':id' => $idVenta]);
            $venta = $stmtV->fetch();

            if (!$venta) {
                throw new Exception("Venta no encontrada.");
            }

            if ($venta['estado'] !== 'PENDIENTE') {
                throw new Exception("Solo se puede cobrar una venta en estado PENDIENTE. Estado actual: {$venta['estado']}.");
            }

            // 2. Verificar que el cajero tenga una caja ABIERTA y bloquearla
            $stmtCaja = $this->db->prepare("SELECT * FROM cajas WHERE id_usuario = :id_cajero AND estado = 'ABIERTA' FOR UPDATE");
            $stmtCaja->execute([':id_cajero' => $idCajero]);
            $caja = $stmtCaja->fetch();

            if (!$caja) {
                throw new Exception("El cajero no tiene ninguna caja ABIERTA para procesar el cobro.");
            }
            $idCaja = (int)$caja['id_caja'];

            // 3. Obtener detalle de venta y verificar/bloquear stock
            $stmtDet = $this->db->prepare("SELECT * FROM detalle_venta WHERE id_venta = :id_venta");
            $stmtDet->execute([':id_venta' => $idVenta]);
            $detalles = $stmtDet->fetchAll();

            foreach ($detalles as $det) {
                $stmtProd = $this->db->prepare("SELECT id_producto, stock_actual, nombre FROM productos WHERE id_producto = :id FOR UPDATE");
                $stmtProd->execute([':id' => $det['id_producto']]);
                $prod = $stmtProd->fetch();

                if ($prod['stock_actual'] < $det['cantidad']) {
                    throw new Exception("Stock insuficiente para {$prod['nombre']}. Actual: {$prod['stock_actual']}, Requerido: {$det['cantidad']}.");
                }

                // Descontar stock
                $nuevoStock = $prod['stock_actual'] - $det['cantidad'];
                $stmtUpProd = $this->db->prepare("UPDATE productos SET stock_actual = :stk WHERE id_producto = :id");
                $stmtUpProd->execute([':stk' => $nuevoStock, ':id' => $det['id_producto']]);

                // Registrar salida en movimientos_inventario (tipo VENTA, cantidad negativa)
                $stmtMI = $this->db->prepare("INSERT INTO movimientos_inventario 
                    (id_producto, id_usuario, cantidad, tipo, motivo, id_venta, fecha) 
                    VALUES (:id_producto, :id_usuario, :cantidad, 'VENTA', :motivo, :id_venta, NOW())");
                $stmtMI->execute([
                    ':id_producto' => $det['id_producto'],
                    ':id_usuario'  => $idCajero,
                    ':cantidad'    => -((int)$det['cantidad']),
                    ':motivo'      => "Despacho venta #VTA-$idVenta",
                    ':id_venta'    => $idVenta
                ]);
            }

            // 4. Registrar Pago
            $stmtPago = $this->db->prepare("INSERT INTO pagos (id_venta, id_cajero, monto, metodo, referencia, fecha) 
                                            VALUES (:id_venta, :id_cajero, :monto, :metodo, :referencia, NOW())");
            $stmtPago->execute([
                ':id_venta'   => $idVenta,
                ':id_cajero'  => $idCajero,
                ':monto'      => $venta['total'],
                ':metodo'     => $metodo,
                ':referencia' => $referencia
            ]);
            $idPago = (int)$this->db->lastInsertId();

            // 5. Registrar Movimiento de Caja (tipo INGRESO vinculado al pago)
            $stmtMC = $this->db->prepare("INSERT INTO movimientos_caja 
                (id_caja, tipo, metodo, monto, concepto, id_pago, id_usuario, fecha) 
                VALUES (:id_caja, 'INGRESO', :metodo, :monto, :concepto, :id_pago, :id_usuario, NOW())");
            $stmtMC->execute([
                ':id_caja'    => $idCaja,
                ':metodo'     => $metodo,
                ':monto'      => $venta['total'],
                ':concepto'   => "Cobro de venta #VTA-$idVenta ($metodo)",
                ':id_pago'    => $idPago,
                ':id_usuario' => $idCajero
            ]);

            // 6. Generar Comprobante Único
            $stmtCompIns = $this->db->prepare("INSERT INTO comprobantes (id_venta, numero_comprobante, fecha_emision, estado) 
                                               VALUES (:id_venta, :num, NOW(), 'VIGENTE')");
            // Generar número provisional para obtener el id_comprobante
            $tempNumero = "TEMP-" . uniqid();
            $stmtCompIns->execute([':id_venta' => $idVenta, ':num' => $tempNumero]);
            $idComprobante = (int)$this->db->lastInsertId();
            $numeroFinal = "COMP-" . str_pad((string)$idComprobante, 6, "0", STR_PAD_LEFT);

            $stmtCompUp = $this->db->prepare("UPDATE comprobantes SET numero_comprobante = :num WHERE id_comprobante = :id");
            $stmtCompUp->execute([':num' => $numeroFinal, ':id' => $idComprobante]);

            // 7. Actualizar estado de Venta a PAGADA
            $stmtUpV = $this->db->prepare("UPDATE ventas SET estado = 'PAGADA' WHERE id_venta = :id");
            $stmtUpV->execute([':id' => $idVenta]);

            $this->db->commit();
            return $this->obtenerPorId($idVenta);
        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Paso 3: Anular Venta (Rollback Atómico en Inventario, Caja y Comprobante)
     */
    public function anularVenta(int $idVenta, int $idUsuarioAnulacion, string $motivoAnulacion): array {
        if (empty(trim($motivoAnulacion))) {
            throw new InvalidArgumentException("El motivo de anulación es obligatorio (CHECK aplicado).");
        }

        $this->db->beginTransaction();
        try {
            // 1. Bloquear y verificar venta
            $stmtV = $this->db->prepare("SELECT * FROM ventas WHERE id_venta = :id FOR UPDATE");
            $stmtV->execute([':id' => $idVenta]);
            $venta = $stmtV->fetch();

            if (!$venta) {
                throw new Exception("Venta no encontrada.");
            }

            if ($venta['estado'] === 'ANULADA') {
                throw new Exception("La venta ya se encuentra ANULADA previamente.");
            }

            $eraPagada = ($venta['estado'] === 'PAGADA');

            if ($eraPagada) {
                // Obtener pago original
                $stmtP = $this->db->prepare("SELECT * FROM pagos WHERE id_venta = :id_venta");
                $stmtP->execute([':id_venta' => $idVenta]);
                $pago = $stmtP->fetch();

                if (!$pago) {
                    throw new Exception("Error de consistencia: Venta marcada como PAGADA no tiene registro en tabla pagos.");
                }

                // Obtener caja abierta para asentar la devolución
                $stmtCaja = $this->db->prepare("SELECT * FROM cajas WHERE id_usuario = :id_usr AND estado = 'ABIERTA' FOR UPDATE");
                $stmtCaja->execute([':id_usr' => $idUsuarioAnulacion]);
                $caja = $stmtCaja->fetch();

                // Si el usuario anulador no tiene caja abierta, buscar cualquier caja abierta
                if (!$caja) {
                    $stmtCajaAny = $this->db->query("SELECT * FROM cajas WHERE estado = 'ABIERTA' ORDER BY id_caja DESC LIMIT 1");
                    $caja = $stmtCajaAny->fetch();
                }

                if (!$caja) {
                    throw new Exception("Debe existir una caja ABIERTA en el sistema para asentar la DEVOLUCIÓN del dinero.");
                }
                $idCaja = (int)$caja['id_caja'];

                // 2. Registrar movimiento en caja tipo DEVOLUCION vinculado al pago
                $stmtDevCaja = $this->db->prepare("INSERT INTO movimientos_caja 
                    (id_caja, tipo, metodo, monto, concepto, id_pago, id_usuario, fecha) 
                    VALUES (:id_caja, 'DEVOLUCION', :metodo, :monto, :concepto, :id_pago, :id_usuario, NOW())");
                $stmtDevCaja->execute([
                    ':id_caja'    => $idCaja,
                    ':metodo'     => $pago['metodo'],
                    ':monto'      => $pago['monto'],
                    ':concepto'   => "Reembolso por anulación de venta #VTA-$idVenta: " . trim($motivoAnulacion),
                    ':id_pago'    => $pago['id_pago'],
                    ':id_usuario' => $idUsuarioAnulacion
                ]);

                // 3. Restaurar stock de cada producto y registrar en movimientos_inventario (ANULACION)
                $stmtDet = $this->db->prepare("SELECT * FROM detalle_venta WHERE id_venta = :id_venta");
                $stmtDet->execute([':id_venta' => $idVenta]);
                $detalles = $stmtDet->fetchAll();

                foreach ($detalles as $det) {
                    $stmtUpProd = $this->db->prepare("UPDATE productos SET stock_actual = stock_actual + :cant WHERE id_producto = :id");
                    $stmtUpProd->execute([':cant' => $det['cantidad'], ':id' => $det['id_producto']]);

                    $stmtMI = $this->db->prepare("INSERT INTO movimientos_inventario 
                        (id_producto, id_usuario, cantidad, tipo, motivo, id_venta, fecha) 
                        VALUES (:id_producto, :id_usuario, :cantidad, 'ANULACION', :motivo, :id_venta, NOW())");
                    $stmtMI->execute([
                        ':id_producto' => $det['id_producto'],
                        ':id_usuario'  => $idUsuarioAnulacion,
                        ':cantidad'    => (int)$det['cantidad'],
                        ':motivo'      => "Reingreso por anulación de venta #VTA-$idVenta",
                        ':id_venta'    => $idVenta
                    ]);
                }

                // 4. Anular Comprobante
                $stmtComp = $this->db->prepare("UPDATE comprobantes SET estado = 'ANULADO' WHERE id_venta = :id_venta");
                $stmtComp->execute([':id_venta' => $idVenta]);
            }

            // 5. Actualizar Venta a ANULADA
            $stmtUpV = $this->db->prepare("UPDATE ventas SET 
                estado = 'ANULADA',
                motivo_anulacion = :motivo,
                fecha_anulacion = NOW(),
                id_usuario_anulacion = :id_usuario
                WHERE id_venta = :id");
            $stmtUpV->execute([
                ':motivo'     => trim($motivoAnulacion),
                ':id_usuario' => $idUsuarioAnulacion,
                ':id'         => $idVenta
            ]);

            $this->db->commit();
            return $this->obtenerPorId($idVenta);
        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }
}

