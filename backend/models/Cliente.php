<?php
require_once __DIR__ . '/../config/Database.php';

class Cliente {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    public function listar(?string $buscar = null, ?string $estado = null): array {
        $sql = "SELECT id_cliente, identificacion, nombres, apellidos, telefono, correo, direccion, estado 
                FROM clientes WHERE 1=1";
        $params = [];

        if (!empty($estado)) {
            $sql .= " AND estado = :estado";
            $params[':estado'] = $estado;
        }

        if (!empty($buscar)) {
            $sql .= " AND (identificacion LIKE :buscar OR nombres LIKE :buscar OR apellidos LIKE :buscar OR correo LIKE :buscar)";
            $params[':buscar'] = "%$buscar%";
        }

        $sql .= " ORDER BY nombres ASC, apellidos ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function obtenerPorId(int $id): ?array {
        $stmt = $this->db->prepare("SELECT * FROM clientes WHERE id_cliente = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $res = $stmt->fetch();
        return $res ?: null;
    }

    public function obtenerPorIdentificacion(string $identificacion): ?array {
        $stmt = $this->db->prepare("SELECT * FROM clientes WHERE identificacion = :identificacion LIMIT 1");
        $stmt->execute([':identificacion' => $identificacion]);
        $res = $stmt->fetch();
        return $res ?: null;
    }

    public function crear(array $data): int {
        $sql = "INSERT INTO clientes (identificacion, nombres, apellidos, telefono, correo, direccion, estado)
                VALUES (:identificacion, :nombres, :apellidos, :telefono, :correo, :direccion, :estado)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':identificacion' => trim($data['identificacion']),
            ':nombres'        => trim($data['nombres']),
            ':apellidos'      => trim($data['apellidos']),
            ':telefono'       => trim($data['telefono']),
            ':correo'         => !empty($data['correo']) ? trim($data['correo']) : null,
            ':direccion'      => !empty($data['direccion']) ? trim($data['direccion']) : null,
            ':estado'         => $data['estado'] ?? 'ACTIVO',
        ]);
        return (int)$this->db->lastInsertId();
    }

    public function actualizar(int $id, array $data): bool {
        $sql = "UPDATE clientes SET 
                identificacion = :identificacion,
                nombres = :nombres,
                apellidos = :apellidos,
                telefono = :telefono,
                correo = :correo,
                direccion = :direccion,
                estado = :estado
                WHERE id_cliente = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            ':id'             => $id,
            ':identificacion' => trim($data['identificacion']),
            ':nombres'        => trim($data['nombres']),
            ':apellidos'      => trim($data['apellidos']),
            ':telefono'       => trim($data['telefono']),
            ':correo'         => !empty($data['correo']) ? trim($data['correo']) : null,
            ':direccion'      => !empty($data['direccion']) ? trim($data['direccion']) : null,
            ':estado'         => $data['estado'] ?? 'ACTIVO',
        ]);
    }

    public function cambiarEstado(int $id, string $estado): bool {
        $stmt = $this->db->prepare("UPDATE clientes SET estado = :estado WHERE id_cliente = :id");
        return $stmt->execute([':estado' => $estado, ':id' => $id]);
    }
}

