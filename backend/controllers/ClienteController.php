<?php
require_once __DIR__ . '/../models/Cliente.php';
require_once __DIR__ . '/../config/Response.php';
require_once __DIR__ . '/../config/Auth.php';

class ClienteController {
    private Cliente $clienteModel;

    public function __construct() {
        $this->clienteModel = new Cliente();
    }

    public function index(): void {
        Auth::requireAuth();

        $buscar = $_GET['buscar'] ?? null;
        $estado = $_GET['estado'] ?? null;
        $clientes = $this->clienteModel->listar($buscar, $estado);
        Response::json(true, 'Clientes obtenidos correctamente', $clientes);
    }

    public function show(int $id): void {
        Auth::requireAuth();

        $cliente = $this->clienteModel->obtenerPorId($id);
        if (!$cliente) {
            Response::error('Cliente no encontrado', null, 404);
        }
        Response::json(true, 'Cliente obtenido correctamente', $cliente);
    }

    public function store(): void {
        Auth::requireRole(['ADMINISTRADOR', 'VENDEDOR', 'CAJERO']);

        $data = Response::getJsonInput();

        // Validaciones obligatorias de negocio
        if (empty($data['identificacion']) || empty($data['nombres']) || empty($data['apellidos']) || empty($data['telefono'])) {
            Response::error('Identificación, nombres, apellidos y teléfono son campos obligatorios', null, 422);
        }

        // Verificar duplicidad de identificación
        $existente = $this->clienteModel->obtenerPorIdentificacion(trim((string)$data['identificacion']));
        if ($existente) {
            Response::error('Ya existe un cliente registrado con la identificación ingresada', null, 409);
        }

        try {
            $nuevoId = $this->clienteModel->crear($data);
            $clienteCreado = $this->clienteModel->obtenerPorId($nuevoId);
            Response::json(true, 'Cliente registrado exitosamente', $clienteCreado, 201);
        } catch (Exception $e) {
            Response::error('Error al registrar cliente: ' . $e->getMessage(), null, 500);
        }
    }

    public function update(int $id): void {
        Auth::requireRole(['ADMINISTRADOR', 'VENDEDOR', 'CAJERO']);

        $cliente = $this->clienteModel->obtenerPorId($id);
        if (!$cliente) {
            Response::error('Cliente no encontrado', null, 404);
        }

        $data = Response::getJsonInput();
        if (empty($data['identificacion']) || empty($data['nombres']) || empty($data['apellidos']) || empty($data['telefono'])) {
            Response::error('Identificación, nombres, apellidos y teléfono son campos obligatorios', null, 422);
        }

        // Verificar si la identificación pertenece a otro cliente
        $existente = $this->clienteModel->obtenerPorIdentificacion(trim((string)$data['identificacion']));
        if ($existente && (int)$existente['id_cliente'] !== $id) {
            Response::error('La identificación ya se encuentra asignada a otro cliente', null, 409);
        }

        try {
            $this->clienteModel->actualizar($id, $data);
            $clienteActualizado = $this->clienteModel->obtenerPorId($id);
            Response::json(true, 'Cliente actualizado exitosamente', $clienteActualizado);
        } catch (Exception $e) {
            Response::error('Error al actualizar cliente: ' . $e->getMessage(), null, 500);
        }
    }

    public function destroy(int $id): void {
        // Desactivación de clientes reservada al ADMINISTRADOR
        Auth::requireRole('ADMINISTRADOR');

        $cliente = $this->clienteModel->obtenerPorId($id);
        if (!$cliente) {
            Response::error('Cliente no encontrado', null, 404);
        }

        try {
            $this->clienteModel->cambiarEstado($id, 'INACTIVO');
            Response::json(true, 'Cliente desactivado exitosamente', ['id_cliente' => $id, 'estado' => 'INACTIVO']);
        } catch (Exception $e) {
            Response::error('Error al desactivar cliente: ' . $e->getMessage(), null, 500);
        }
    }
}
