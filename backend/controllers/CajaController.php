<?php
require_once __DIR__ . '/../models/Caja.php';
require_once __DIR__ . '/../config/Response.php';

class CajaController {
    private Caja $cajaModel;

    public function __construct() {
        $this->cajaModel = new Caja();
    }

    public function getCajaActiva(int $idUsuario): void {
        $caja = $this->cajaModel->obtenerCajaAbiertaUsuario($idUsuario);
        if (!$caja) {
            Response::json(false, 'El usuario no tiene ninguna caja abierta actualmente', null, 200);
        }
        $arqueo = $this->cajaModel->calcularArqueo((int)$caja['id_caja']);
        Response::json(true, 'Caja activa obtenida', [
            'caja'   => $caja,
            'arqueo' => $arqueo
        ]);
    }

    public function abrir(): void {
        $data = Response::getJsonInput();
        $idUsuario = (int)($data['id_usuario'] ?? 1);
        $saldoInicial = isset($data['saldo_inicial']) ? (float)$data['saldo_inicial'] : 0.0;

        try {
            $caja = $this->cajaModel->abrirCaja($idUsuario, $saldoInicial);
            Response::json(true, 'Caja abierta exitosamente', $caja, 201);
        } catch (Exception $e) {
            Response::error($e->getMessage(), null, 400);
        }
    }

    public function cerrar(int $idCaja): void {
        $data = Response::getJsonInput();
        if (!isset($data['monto_fisico_contado'])) {
            Response::error('El monto físico contado es obligatorio para el cierre (arqueo ciego)', null, 422);
        }

        $montoContado = (float)$data['monto_fisico_contado'];

        try {
            $resultado = $this->cajaModel->cerrarCaja($idCaja, $montoContado);
            Response::json(true, 'Caja cerrada y arqueo generado exitosamente', $resultado);
        } catch (Exception $e) {
            Response::error($e->getMessage(), null, 400);
        }
    }

    public function arqueo(int $idCaja): void {
        try {
            $arqueo = $this->cajaModel->calcularArqueo($idCaja);
            Response::json(true, 'Arqueo calculado correctamente', $arqueo);
        } catch (Exception $e) {
            Response::error($e->getMessage(), null, 404);
        }
    }

    public function movimientos(int $idCaja): void {
        try {
            $movimientos = $this->cajaModel->listarMovimientos($idCaja);
            Response::json(true, 'Movimientos de caja obtenidos', $movimientos);
        } catch (Exception $e) {
            Response::error($e->getMessage(), null, 404);
        }
    }

    public function nuevoMovimiento(int $idCaja): void {
        $data = Response::getJsonInput();
        $idUsuario = (int)($data['id_usuario'] ?? 1);
        $tipo = $data['tipo'] ?? '';
        $metodo = $data['metodo'] ?? 'EFECTIVO';
        $monto = (float)($data['monto'] ?? 0);
        $concepto = $data['concepto'] ?? '';

        try {
            $res = $this->cajaModel->registrarMovimientoManual($idCaja, $idUsuario, $tipo, $metodo, $monto, $concepto);
            Response::json(true, 'Movimiento de caja registrado exitosamente', $res, 201);
        } catch (Exception $e) {
            Response::error($e->getMessage(), null, 400);
        }
    }
}

