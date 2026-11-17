<?php
require_once __DIR__ . '/../models/Producto.php';
require_once __DIR__ . '/../models/MovimientoInventario.php';
require_once __DIR__ . '/../config/Response.php';

class ProductoController {
    private Producto $productoModel;
    private MovimientoInventario $kardexModel;

    public function __construct() {
        $this->productoModel = new Producto();
        $this->kardexModel = new MovimientoInventario();
    }

    public function index(): void {
        $buscar = $_GET['buscar'] ?? null;
        $idCategoria = isset($_GET['categoria']) ? (int)$_GET['categoria'] : null;
        $estado = $_GET['estado'] ?? null;
        $soloCritico = isset($_GET['critico']) && ($_GET['critico'] === '1' || $_GET['critico'] === 'true');

        $productos = $this->productoModel->listar($buscar, $idCategoria, $estado, $soloCritico);
        Response::json(true, 'Productos obtenidos correctamente', $productos);
    }

    public function show(int $id): void {
        $producto = $this->productoModel->obtenerPorId($id);
        if (!$producto) {
            Response::error('Producto no encontrado', null, 404);
        }
        Response::json(true, 'Producto obtenido correctamente', $producto);
    }

    public function store(): void {
        $data = Response::getJsonInput();

        // Validaciones
        if (empty($data['codigo']) || empty($data['nombre']) || empty($data['id_categoria']) || !isset($data['precio_venta'])) {
            Response::error('Código, nombre, categoría y precio de venta son obligatorios', null, 422);
        }

        if ((float)$data['precio_venta'] <= 0) {
            Response::error('El precio de venta debe ser mayor a cero (CHECK aplicado)', null, 422);
        }

        $existente = $this->productoModel->obtenerPorCodigo($data['codigo']);
        if ($existente) {
            Response::error('El código de producto ya se encuentra registrado', null, 409);
        }

        try {
            $nuevoId = $this->productoModel->crear($data);

            // Si se registró con stock inicial mayor a 0, registrar movimiento de entrada
            $stockInicial = (int)($data['stock_actual'] ?? 0);
            if ($stockInicial > 0) {
                $idUsuario = (int)($data['id_usuario'] ?? 1);
                $this->kardexModel->registrarAjuste($nuevoId, $idUsuario, $stockInicial, 'ENTRADA', 'Carga inicial de inventario');
            }

            $productoCreado = $this->productoModel->obtenerPorId($nuevoId);
            Response::json(true, 'Producto registrado exitosamente', $productoCreado, 201);
        } catch (Exception $e) {
            Response::error('Error al registrar producto: ' . $e->getMessage(), null, 500);
        }
    }

    public function update(int $id): void {
        $producto = $this->productoModel->obtenerPorId($id);
        if (!$producto) {
            Response::error('Producto no encontrado', null, 404);
        }

        $data = Response::getJsonInput();
        if (empty($data['codigo']) || empty($data['nombre']) || empty($data['id_categoria']) || !isset($data['precio_venta'])) {
            Response::error('Código, nombre, categoría y precio de venta son obligatorios', null, 422);
        }

        if ((float)$data['precio_venta'] <= 0) {
            Response::error('El precio de venta debe ser mayor a cero', null, 422);
        }

        $existente = $this->productoModel->obtenerPorCodigo($data['codigo']);
        if ($existente && (int)$existente['id_producto'] !== $id) {
            Response::error('El código de producto ya pertenece a otro artículo', null, 409);
        }

        try {
            $this->productoModel->actualizar($id, $data);
            $productoActualizado = $this->productoModel->obtenerPorId($id);
            Response::json(true, 'Producto actualizado exitosamente', $productoActualizado);
        } catch (Exception $e) {
            Response::error('Error al actualizar producto: ' . $e->getMessage(), null, 500);
        }
    }

    public function destroy(int $id): void {
        $producto = $this->productoModel->obtenerPorId($id);
        if (!$producto) {
            Response::error('Producto no encontrado', null, 404);
        }

        try {
            $this->productoModel->cambiarEstado($id, 'INACTIVO');
            Response::json(true, 'Producto desactivado exitosamente', ['id_producto' => $id, 'estado' => 'INACTIVO']);
        } catch (Exception $e) {
            Response::error('Error al desactivar producto: ' . $e->getMessage(), null, 500);
        }
    }

    public function ajustarStock(): void {
        $data = Response::getJsonInput();

        if (empty($data['id_producto']) || empty($data['cantidad']) || empty($data['tipo']) || empty($data['motivo'])) {
            Response::error('id_producto, cantidad, tipo (ENTRADA/AJUSTE) y motivo son obligatorios', null, 422);
        }

        $idUsuario = (int)($data['id_usuario'] ?? 1);

        try {
            $res = $this->kardexModel->registrarAjuste(
                (int)$data['id_producto'],
                $idUsuario,
                (int)$data['cantidad'],
                (string)$data['tipo'],
                (string)$data['motivo']
            );
            Response::json(true, 'Ajuste de stock realizado con éxito', $res);
        } catch (Exception $e) {
            Response::error($e->getMessage(), null, 400);
        }
    }

    public function kardex(int $idProducto): void {
        $movimientos = $this->kardexModel->listarPorProducto($idProducto);
        Response::json(true, 'Movimientos de inventario obtenidos', $movimientos);
    }

    public function categorias(): void {
        $categorias = $this->productoModel->listarCategorias();
        Response::json(true, 'Categorías obtenidas correctamente', $categorias);
    }
}

