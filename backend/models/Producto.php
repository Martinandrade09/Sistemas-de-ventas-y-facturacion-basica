<?php
require_once __DIR__ . '/../config/Database.php';

class Producto {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    public function listar(?string $buscar = null, ?int $idCategoria = null, ?string $estado = null, bool $soloCritico = false): array {
        $sql = "SELECT p.id_producto, p.codigo, p.nombre, p.descripcion, p.id_categoria,
                       c.nombre AS categoria, p.precio_venta, p.stock_actual, p.stock_minimo, p.estado,
                       (CASE WHEN p.stock_actual <= p.stock_minimo THEN 1 ELSE 0 END) AS es_critico
                FROM productos p
                INNER JOIN categorias c ON p.id_categoria = c.id_categoria
                WHERE 1=1";
        $params = [];

        if (!empty($estado)) {
            $sql .= " AND p.estado = :estado";
            $params[':estado'] = $estado;
        }

        if (!empty($idCategoria)) {
            $sql .= " AND p.id_categoria = :id_categoria";
            $params[':id_categoria'] = $idCategoria;
        }

        if (!empty($buscar)) {
            $sql .= " AND (p.nombre LIKE :buscar OR p.codigo LIKE :buscar OR p.descripcion LIKE :buscar)";
            $params[':buscar'] = "%$buscar%";
        }

        if ($soloCritico) {
            $sql .= " AND p.stock_actual <= p.stock_minimo";
        }

        $sql .= " ORDER BY p.nombre ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function obtenerPorId(int $id): ?array {
        $stmt = $this->db->prepare("SELECT p.*, c.nombre AS categoria 
                                    FROM productos p 
                                    INNER JOIN categorias c ON p.id_categoria = c.id_categoria 
                                    WHERE p.id_producto = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $res = $stmt->fetch();
        return $res ?: null;
    }

    public function obtenerPorCodigo(string $codigo): ?array {
        $stmt = $this->db->prepare("SELECT * FROM productos WHERE codigo = :codigo LIMIT 1");
        $stmt->execute([':codigo' => $codigo]);
        $res = $stmt->fetch();
        return $res ?: null;
    }

    public function crear(array $data): int {
        $sql = "INSERT INTO productos (codigo, nombre, descripcion, id_categoria, precio_venta, stock_actual, stock_minimo, estado)
                VALUES (:codigo, :nombre, :descripcion, :id_categoria, :precio_venta, :stock_actual, :stock_minimo, :estado)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':codigo'       => trim($data['codigo']),
            ':nombre'       => trim($data['nombre']),
            ':descripcion'  => !empty($data['descripcion']) ? trim($data['descripcion']) : null,
            ':id_categoria' => (int)$data['id_categoria'],
            ':precio_venta' => (float)$data['precio_venta'],
            ':stock_actual' => (int)($data['stock_actual'] ?? 0),
            ':stock_minimo' => (int)($data['stock_minimo'] ?? 0),
            ':estado'       => $data['estado'] ?? 'ACTIVO',
        ]);
        return (int)$this->db->lastInsertId();
    }

    public function actualizar(int $id, array $data): bool {
        $sql = "UPDATE productos SET 
                codigo = :codigo,
                nombre = :nombre,
                descripcion = :descripcion,
                id_categoria = :id_categoria,
                precio_venta = :precio_venta,
                stock_minimo = :stock_minimo,
                estado = :estado
                WHERE id_producto = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            ':id'           => $id,
            ':codigo'       => trim($data['codigo']),
            ':nombre'       => trim($data['nombre']),
            ':descripcion'  => !empty($data['descripcion']) ? trim($data['descripcion']) : null,
            ':id_categoria' => (int)$data['id_categoria'],
            ':precio_venta' => (float)$data['precio_venta'],
            ':stock_minimo' => (int)($data['stock_minimo'] ?? 0),
            ':estado'       => $data['estado'] ?? 'ACTIVO',
        ]);
    }

    public function cambiarEstado(int $id, string $estado): bool {
        $stmt = $this->db->prepare("UPDATE productos SET estado = :estado WHERE id_producto = :id");
        return $stmt->execute([':estado' => $estado, ':id' => $id]);
    }

    public function listarCategorias(): array {
        $stmt = $this->db->query("SELECT * FROM categorias WHERE estado = 'ACTIVO' ORDER BY nombre ASC");
        return $stmt->fetchAll();
    }
}

