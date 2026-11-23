<?php
require_once __DIR__ . '/../models/Venta.php';
require_once __DIR__ . '/../config/Response.php';
require_once __DIR__ . '/../config/Auth.php';

class VentaController {
    private Venta $ventaModel;

    public function __construct() {
        $this->ventaModel = new Venta();
    }

    public function index(): void {
        $usuario = Auth::requireAuth();

        $estado = $_GET['estado'] ?? null;
        $fecha = $_GET['fecha'] ?? null;

        // Regla RBAC: El Vendedor solo consulta las ventas que le corresponden
        if ($usuario['rol_nombre'] === 'VENDEDOR') {
            $idVendedor = (int)$usuario['id_usuario'];
        } else {
            // Administrador y Cajero pueden filtrar libremente
            $idVendedor = isset($_GET['vendedor']) ? (int)$_GET['vendedor'] : null;
        }

        $ventas = $this->ventaModel->listar($estado, $fecha, $idVendedor);
        Response::json(true, 'Ventas listadas correctamente', $ventas);
    }

    public function show(int $id): void {
        $usuario = Auth::requireAuth();

        $venta = $this->ventaModel->obtenerPorId($id);
        if (!$venta) {
            Response::error('Venta no encontrada', null, 404);
        }

        // Si es vendedor, verificar que la venta haya sido creada por él
        if ($usuario['rol_nombre'] === 'VENDEDOR' && (int)$venta['id_vendedor'] !== (int)$usuario['id_usuario']) {
            Response::error('Acceso denegado. No tiene autorización para consultar ventas de otros usuarios.', null, 403);
        }

        Response::json(true, 'Venta obtenida correctamente', $venta);
    }

    public function crear(): void {
        // Solo Administrador y Vendedor pueden crear órdenes de venta
        $usuario = Auth::requireRole(['ADMINISTRADOR', 'VENDEDOR']);

        $data = Response::getJsonInput();

        if (empty($data['id_cliente']) || empty($data['items']) || !is_array($data['items'])) {
            Response::error('id_cliente y array items con al menos un producto son requeridos', null, 422);
        }

        $idCliente = (int)$data['id_cliente'];
        // Identidad inyectada desde la sesión autenticada (no confiada al cliente)
        $idVendedor = (int)$usuario['id_usuario'];
        $items = $data['items'];

        try {
            $venta = $this->ventaModel->crearVentaPendiente($idCliente, $idVendedor, $items);
            Response::json(true, 'Venta registrada en estado PENDIENTE', $venta, 201);
        } catch (Exception $e) {
            Response::error($e->getMessage(), null, 400);
        }
    }

    public function pagar(int $idVenta): void {
        // Solo Administrador y Cajero pueden cobrar y registrar pagos
        $usuario = Auth::requireRole(['ADMINISTRADOR', 'CAJERO']);

        $data = Response::getJsonInput();

        if (empty($data['metodo'])) {
            Response::error('El método de pago (EFECTIVO o TRANSFERENCIA) es obligatorio', null, 422);
        }

        // Identidad del cajero tomada de la sesión autenticada
        $idCajero = (int)$usuario['id_usuario'];
        $metodo = strtoupper((string)$data['metodo']);
        $referencia = $data['referencia'] ?? null;

        try {
            $ventaPagada = $this->ventaModel->confirmarPago($idVenta, $idCajero, $metodo, $referencia);
            Response::json(true, 'Pago confirmado y comprobante emitido exitosamente', $ventaPagada);
        } catch (Exception $e) {
            Response::error($e->getMessage(), null, 400);
        }
    }

    public function anular(int $idVenta): void {
        // Acción estrictamente restringida al rol ADMINISTRADOR
        $usuario = Auth::requireRole('ADMINISTRADOR');

        $data = Response::getJsonInput();

        if (empty($data['motivo_anulacion'])) {
            Response::error('El motivo de anulación es obligatorio', null, 422);
        }

        // Identidad del usuario de anulación tomada de la sesión autenticada
        $idUsuarioAnulacion = (int)$usuario['id_usuario'];
        $motivo = (string)$data['motivo_anulacion'];

        try {
            $ventaAnulada = $this->ventaModel->anularVenta($idVenta, $idUsuarioAnulacion, $motivo);
            Response::json(true, 'Venta anulada y reversión ejecutada exitosamente', $ventaAnulada);
        } catch (Exception $e) {
            Response::error($e->getMessage(), null, 400);
        }
    }
}
