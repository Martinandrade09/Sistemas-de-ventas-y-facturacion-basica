<?php
require_once __DIR__ . '/../config/Database.php';

class MovimientoInventario {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    public function listarPorProducto(int $idProducto): array {
        $sql = "SELECT mi.*, u.usuario, p.nombre AS producto_nombre, p.codigo AS producto_codigo
                FROM movimientos_inventario mi
                INNER JOIN usuarios u ON mi.id_usuario = u.id_usuario
                INNER JOIN productos p ON mi.id_producto = p.id_producto
                WHERE mi.id_producto = :id_producto
                ORDER BY mi.fecha DESC, mi.id_movimiento DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id_producto' => $idProducto]);
        return $stmt->fetchAll();
    }

    public function listarHistorial(int $limit = 50): array {
        $sql = "SELECT mi.*, u.usuario, p.nombre AS producto_nombre, p.codigo AS producto_codigo
                FROM movimientos_inventario mi
                INNER JOIN usuarios u ON mi.id_usuario = u.id_usuario
                INNER JOIN productos p ON mi.id_producto = p.id_producto
                ORDER BY mi.fecha DESC, mi.id_movimiento DESC
                LIMIT :limit";
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    /**
     * Registra un movimiento manual (ENTRADA o AJUSTE) actualizando stock_actual atómicamente
     */
    public function registrarAjuste(int $idProducto, int $idUsuario, int $cantidad, string $tipo, string $motivo): array {
        if (!in_array($tipo, ['ENTRADA', 'AJUSTE'])) {
            throw new InvalidArgumentException('Solo se permiten tipos ENTRADA o AJUSTE para movimientos manuales');
        }

        if (trim($motivo) === '') {
            throw new InvalidArgumentException('El motivo del movimiento es obligatorio');
        }

        if ($tipo === 'ENTRADA' && $cantidad <= 0) {
            throw new InvalidArgumentException('La cantidad para una ENTRADA debe ser mayor a 0');
        }

        $this->db->beginTransaction();
        try {
            // Bloqueo pesimista del producto
            $stmtProd = $this->db->prepare("SELECT id_producto, stock_actual, nombre FROM productos WHERE id_producto = :id FOR UPDATE");
            $stmtProd->execute([':id' => $idProducto]);
            $producto = $stmtProd->fetch();

            if (!$producto) {
                throw new Exception('Producto no encontrado');
            }

            $nuevoStock = $producto['stock_actual'] + $cantidad;
            if ($nuevoStock < 0) {
                throw new Exception("El ajuste resulta en un stock negativo ($nuevoStock). No permitido.");
            }

            // Insertar movimiento
            $stmtMov = $this->db->prepare("INSERT INTO movimientos_inventario 
                (id_producto, id_usuario, cantidad, tipo, motivo, id_venta) 
                VALUES (:id_producto, :id_usuario, :cantidad, :tipo, :motivo, NULL)");
            $stmtMov->execute([
                ':id_producto' => $idProducto,
                ':id_usuario'  => $idUsuario,
                ':cantidad'    => $cantidad,
                ':tipo'        => $tipo,
                ':motivo'      => trim($motivo)
            ]);
            $idMovimiento = (int)$this->db->lastInsertId();

            // Actualizar stock del producto
            $stmtUpdate = $this->db->prepare("UPDATE productos SET stock_actual = :nuevo_stock WHERE id_producto = :id");
            $stmtUpdate->execute([
                ':nuevo_stock' => $nuevoStock,
                ':id'          => $idProducto
            ]);

            $this->db->commit();

            return [
                'id_movimiento'   => $idMovimiento,
                'id_producto'     => $idProducto,
                'stock_anterior'  => $producto['stock_actual'],
                'stock_nuevo'     => $nuevoStock,
                'tipo'            => $tipo,
                'cantidad'        => $cantidad
            ];
        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }
}

