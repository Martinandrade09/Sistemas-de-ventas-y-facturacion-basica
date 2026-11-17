<?php
require_once __DIR__ . '/../models/Venta.php';
require_once __DIR__ . '/../config/Response.php';

class VentaController {
    private Venta $ventaModel;

    public function __construct() {
        $this->ventaModel = new Venta();
    }

    public function index(): void {
        $estado = $_GET['estado'] ?? null;
        $fecha = $_GET['fecha'] ?? null;
        $idVendedor = isset($_GET['vendedor']) ? (int)$_GET['vendedor'] : null;

        $ventas = $this->ventaModel->listar($estado, $fecha, $idVendedor);
        Response::json(true, 'Ventas listadas correctamente', $ventas);
    }

    public function show(int $id): void {
        $venta = $this->ventaModel->obtenerPorId($id);
        if (!$venta) {
            Response::error('Venta no encontrada', null, 404);
        }
        Response::json(true, 'Venta obtenida correctamente', $venta);
    }

    public function crear(): void {
        $data = Response::getJsonInput();

        if (empty($data['id_cliente']) || empty($data['items']) || !is_array($data['items'])) {
            Response::error('id_cliente y array items con al menos un producto son requeridos', null, 422);
        }

        $idCliente = (int)$data['id_cliente'];
        $idVendedor = (int)($data['id_vendedor'] ?? 1);
        $items = $data['items'];

        try {
            $venta = $this->ventaModel->crearVentaPendiente($idCliente, $idVendedor, $items);
            Response::json(true, 'Venta registrada en estado PENDIENTE', $venta, 201);
        } catch (Exception $e) {
            Response::error($e->getMessage(), null, 400);
        }
    }

    public function pagar(int $idVenta): void {
        $data = Response::getJsonInput();

        if (empty($data['metodo'])) {
            Response::error('El método de pago (EFECTIVO o TRANSFERENCIA) es obligatorio', null, 422);
        }

        $idCajero = (int)($data['id_cajero'] ?? 2);
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
        $data = Response::getJsonInput();

        if (empty($data['motivo_anulacion'])) {
            Response::error('El motivo de anulación es obligatorio', null, 422);
        }

        $idUsuarioAnulacion = (int)($data['id_usuario'] ?? 1);
        $motivo = (string)$data['motivo_anulacion'];

        try {
            $ventaAnulada = $this->ventaModel->anularVenta($idVenta, $idUsuarioAnulacion, $motivo);
            Response::json(true, 'Venta anulada y reversión ejecutada exitosamente', $ventaAnulada);
        } catch (Exception $e) {
            Response::error($e->getMessage(), null, 400);
        }
    }
}

