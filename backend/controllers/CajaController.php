<?php
require_once __DIR__ . '/../models/Caja.php';
require_once __DIR__ . '/../config/Response.php';
require_once __DIR__ . '/../config/Auth.php';

class CajaController {
    private Caja $cajaModel;

    public function __construct() {
        $this->cajaModel = new Caja();
    }

    public function getCajaActiva(int $idUsuarioFallback): void {
        $usuario = Auth::requireRole(['ADMINISTRADOR', 'CAJERO']);

        // El cajero solo puede consultar su propia caja activa; el admin puede consultar otra vía query param
        $idUsuario = ($usuario['rol_nombre'] === 'ADMINISTRADOR' && isset($_GET['usuario']))
            ? (int)$_GET['usuario']
            : (int)$usuario['id_usuario'];

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
        $usuario = Auth::requireRole(['ADMINISTRADOR', 'CAJERO']);

        $data = Response::getJsonInput();

        // Asignar el id_usuario autenticado en sesión
        $idUsuario = (int)$usuario['id_usuario'];
        $saldoInicial = isset($data['saldo_inicial']) ? (float)$data['saldo_inicial'] : 0.0;

        try {
            $caja = $this->cajaModel->abrirCaja($idUsuario, $saldoInicial);
            Response::json(true, 'Caja abierta exitosamente', $caja, 201);
        } catch (Exception $e) {
            Response::error($e->getMessage(), null, 400);
        }
    }

    public function cerrar(int $idCaja): void {
        $usuario = Auth::requireRole(['ADMINISTRADOR', 'CAJERO']);

        $caja = $this->cajaModel->obtenerPorId($idCaja);
        if (!$caja) {
            Response::error('Caja no encontrada', null, 404);
        }

        // Si es cajero, verificar que la caja a cerrar le pertenezca
        if ($usuario['rol_nombre'] === 'CAJERO' && (int)$caja['id_usuario'] !== (int)$usuario['id_usuario']) {
            Response::error('Acceso denegado. No puede cerrar una caja asignada a otro usuario.', null, 403);
        }

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
        $usuario = Auth::requireRole(['ADMINISTRADOR', 'CAJERO']);

        $caja = $this->cajaModel->obtenerPorId($idCaja);
        if (!$caja) {
            Response::error('Caja no encontrada', null, 404);
        }

        if ($usuario['rol_nombre'] === 'CAJERO' && (int)$caja['id_usuario'] !== (int)$usuario['id_usuario']) {
            Response::error('Acceso denegado. No puede consultar el arqueo de otro cajero.', null, 403);
        }

        try {
            $arqueo = $this->cajaModel->calcularArqueo($idCaja);
            Response::json(true, 'Arqueo calculado correctamente', $arqueo);
        } catch (Exception $e) {
            Response::error($e->getMessage(), null, 404);
        }
    }

    public function movimientos(int $idCaja): void {
        $usuario = Auth::requireRole(['ADMINISTRADOR', 'CAJERO']);

        $caja = $this->cajaModel->obtenerPorId($idCaja);
        if (!$caja) {
            Response::error('Caja no encontrada', null, 404);
        }

        if ($usuario['rol_nombre'] === 'CAJERO' && (int)$caja['id_usuario'] !== (int)$usuario['id_usuario']) {
            Response::error('Acceso denegado. No puede consultar movimientos de otro cajero.', null, 403);
        }

        try {
            $movimientos = $this->cajaModel->listarMovimientos($idCaja);
            Response::json(true, 'Movimientos de caja obtenidos', $movimientos);
        } catch (Exception $e) {
            Response::error($e->getMessage(), null, 404);
        }
    }

    public function nuevoMovimiento(int $idCaja): void {
        $usuario = Auth::requireRole(['ADMINISTRADOR', 'CAJERO']);

        $caja = $this->cajaModel->obtenerPorId($idCaja);
        if (!$caja) {
            Response::error('Caja no encontrada', null, 404);
        }

        if ($usuario['rol_nombre'] === 'CAJERO' && (int)$caja['id_usuario'] !== (int)$usuario['id_usuario']) {
            Response::error('Acceso denegado. No puede registrar movimientos en la caja de otro usuario.', null, 403);
        }

        $data = Response::getJsonInput();
        $idUsuario = (int)$usuario['id_usuario'];
        $tipo = (string)($data['tipo'] ?? '');
        $metodo = (string)($data['metodo'] ?? 'EFECTIVO');
        $monto = (float)($data['monto'] ?? 0);
        $concepto = (string)($data['concepto'] ?? '');

        try {
            $res = $this->cajaModel->registrarMovimientoManual($idCaja, $idUsuario, $tipo, $metodo, $monto, $concepto);
            Response::json(true, 'Movimiento de caja registrado exitosamente', $res, 201);
        } catch (Exception $e) {
            Response::error($e->getMessage(), null, 400);
        }
    }
}
