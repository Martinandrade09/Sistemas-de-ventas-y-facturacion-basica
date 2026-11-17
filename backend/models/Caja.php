<?php
require_once __DIR__ . '/../config/Database.php';

class Caja {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    public function obtenerCajaAbiertaUsuario(int $idUsuario): ?array {
        $stmt = $this->db->prepare("SELECT c.*, u.usuario AS cajero_nombre 
                                    FROM cajas c 
                                    INNER JOIN usuarios u ON c.id_usuario = u.id_usuario 
                                    WHERE c.id_usuario = :id_usuario AND c.estado = 'ABIERTA' 
                                    LIMIT 1");
        $stmt->execute([':id_usuario' => $idUsuario]);
        $res = $stmt->fetch();
        return $res ?: null;
    }

    public function obtenerPorId(int $idCaja): ?array {
        $stmt = $this->db->prepare("SELECT c.*, u.usuario AS cajero_nombre 
                                    FROM cajas c 
                                    INNER JOIN usuarios u ON c.id_usuario = u.id_usuario 
                                    WHERE c.id_caja = :id LIMIT 1");
        $stmt->execute([':id' => $idCaja]);
        $res = $stmt->fetch();
        return $res ?: null;
    }

    public function abrirCaja(int $idUsuario, float $saldoInicial): array {
        if ($saldoInicial < 0) {
            throw new InvalidArgumentException('El saldo inicial no puede ser negativo');
        }

        $this->db->beginTransaction();
        try {
            // Verificar si el usuario ya tiene una caja abierta con FOR UPDATE
            $existente = $this->obtenerCajaAbiertaUsuario($idUsuario);
            if ($existente) {
                throw new Exception("El usuario ya cuenta con la caja #{$existente['id_caja']} en estado ABIERTA.");
            }

            $stmt = $this->db->prepare("INSERT INTO cajas (id_usuario, saldo_inicial, estado, fecha_apertura) 
                                        VALUES (:id_usuario, :saldo_inicial, 'ABIERTA', NOW())");
            $stmt->execute([
                ':id_usuario'     => $idUsuario,
                ':saldo_inicial' => $saldoInicial
            ]);
            $idCaja = (int)$this->db->lastInsertId();

            $this->db->commit();
            return $this->obtenerPorId($idCaja);
        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }

    public function calcularArqueo(int $idCaja): array {
        $caja = $this->obtenerPorId($idCaja);
        if (!$caja) {
            throw new Exception("Caja no encontrada");
        }

        // Obtener movimientos agrupados por tipo y método
        $stmt = $this->db->prepare("SELECT tipo, metodo, SUM(monto) AS total, COUNT(*) AS cantidad 
                                    FROM movimientos_caja 
                                    WHERE id_caja = :id_caja 
                                    GROUP BY tipo, metodo");
        $stmt->execute([':id_caja' => $idCaja]);
        $movimientos = $stmt->fetchAll();

        $ingresosEfectivo = 0.0;
        $egresosEfectivo = 0.0;
        $devolucionesEfectivo = 0.0;
        $ingresosTransferencia = 0.0;
        $devolucionesTransferencia = 0.0;

        foreach ($movimientos as $m) {
            $monto = (float)$m['total'];
            if ($m['metodo'] === 'EFECTIVO') {
                if ($m['tipo'] === 'INGRESO') $ingresosEfectivo += $monto;
                if ($m['tipo'] === 'EGRESO') $egresosEfectivo += $monto;
                if ($m['tipo'] === 'DEVOLUCION') $devolucionesEfectivo += $monto;
            } elseif ($m['metodo'] === 'TRANSFERENCIA') {
                if ($m['tipo'] === 'INGRESO') $ingresosTransferencia += $monto;
                if ($m['tipo'] === 'DEVOLUCION') $devolucionesTransferencia += $monto;
            }
        }

        $saldoInicial = (float)$caja['saldo_inicial'];
        $saldoEsperadoEfectivo = $saldoInicial + $ingresosEfectivo - $egresosEfectivo - $devolucionesEfectivo;
        $totalBanco = $ingresosTransferencia - $devolucionesTransferencia;

        return [
            'id_caja'                   => $idCaja,
            'cajero'                    => $caja['cajero_nombre'],
            'estado'                    => $caja['estado'],
            'fecha_apertura'            => $caja['fecha_apertura'],
            'fecha_cierre'              => $caja['fecha_cierre'],
            'saldo_inicial'             => $saldoInicial,
            'ingresos_efectivo'         => $ingresosEfectivo,
            'egresos_efectivo'          => $egresosEfectivo,
            'devoluciones_efectivo'     => $devolucionesEfectivo,
            'saldo_esperado_efectivo'   => $saldoEsperadoEfectivo,
            'ingresos_transferencia'    => $ingresosTransferencia,
            'devoluciones_transferencia'=> $devolucionesTransferencia,
            'total_transferencias'      => $totalBanco,
            'total_general_en_caja'     => $saldoEsperadoEfectivo + $totalBanco,
        ];
    }

    public function cerrarCaja(int $idCaja, float $montoFisicoContado): array {
        $this->db->beginTransaction();
        try {
            // Bloqueo pesimista de la caja
            $stmtLock = $this->db->prepare("SELECT * FROM cajas WHERE id_caja = :id FOR UPDATE");
            $stmtLock->execute([':id' => $idCaja]);
            $caja = $stmtLock->fetch();

            if (!$caja) {
                throw new Exception('Caja no encontrada');
            }

            if ($caja['estado'] !== 'ABIERTA') {
                throw new Exception('La caja ya se encuentra CERRADA.');
            }

            $arqueo = $this->calcularArqueo($idCaja);
            $saldoEsperado = $arqueo['saldo_esperado_efectivo'];
            $diferencia = $montoFisicoContado - $saldoEsperado;

            // Actualizar cierre de caja
            $stmtClose = $this->db->prepare("UPDATE cajas SET 
                saldo_final = :saldo_final,
                estado = 'CERRADA',
                fecha_cierre = NOW() 
                WHERE id_caja = :id");
            $stmtClose->execute([
                ':saldo_final' => $montoFisicoContado,
                ':id'          => $idCaja
            ]);

            $this->db->commit();

            return [
                'caja'                   => $this->obtenerPorId($idCaja),
                'saldo_esperado'         => $saldoEsperado,
                'monto_fisico_contado'   => $montoFisicoContado,
                'diferencia'             => $diferencia,
                'estado_arqueo'          => $diferencia === 0.0 ? 'CUADRADO' : ($diferencia > 0 ? 'SOBRANTE' : 'FALTANTE')
            ];
        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }

    public function listarMovimientos(int $idCaja): array {
        $stmt = $this->db->prepare("SELECT mc.*, u.usuario AS registrado_por, p.metodo AS metodo_pago, p.referencia 
                                    FROM movimientos_caja mc 
                                    INNER JOIN usuarios u ON mc.id_usuario = u.id_usuario 
                                    LEFT JOIN pagos p ON mc.id_pago = p.id_pago 
                                    WHERE mc.id_caja = :id_caja 
                                    ORDER BY mc.fecha DESC, mc.id_movimiento_caja DESC");
        $stmt->execute([':id_caja' => $idCaja]);
        return $stmt->fetchAll();
    }

    public function registrarMovimientoManual(int $idCaja, int $idUsuario, string $tipo, string $metodo, float $monto, string $concepto): array {
        if (!in_array($tipo, ['INGRESO', 'EGRESO'])) {
            throw new InvalidArgumentException('Solo se permiten tipos INGRESO o EGRESO manual');
        }

        if (!in_array($metodo, ['EFECTIVO', 'TRANSFERENCIA'])) {
            throw new InvalidArgumentException('Método de pago no válido');
        }

        if ($monto <= 0) {
            throw new InvalidArgumentException('El monto debe ser mayor a cero');
        }

        if (trim($concepto) === '') {
            throw new InvalidArgumentException('El concepto del movimiento es obligatorio');
        }

        $caja = $this->obtenerPorId($idCaja);
        if (!$caja || $caja['estado'] !== 'ABIERTA') {
            throw new Exception('No se pueden registrar movimientos en una caja CERRADA o inexistente.');
        }

        $stmt = $this->db->prepare("INSERT INTO movimientos_caja 
            (id_caja, tipo, metodo, monto, concepto, id_pago, id_usuario, fecha) 
            VALUES (:id_caja, :tipo, :metodo, :monto, :concepto, NULL, :id_usuario, NOW())");
        $stmt->execute([
            ':id_caja'    => $idCaja,
            ':tipo'       => $tipo,
            ':metodo'     => $metodo,
            ':monto'      => $monto,
            ':concepto'   => trim($concepto),
            ':id_usuario' => $idUsuario
        ]);

        return ['id_movimiento_caja' => (int)$this->db->lastInsertId(), 'monto' => $monto, 'tipo' => $tipo];
    }
}

