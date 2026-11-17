<?php
require_once __DIR__ . '/../config/Database.php';

class Usuario {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    public function obtenerPorUsuario(string $usuario): ?array {
        $stmt = $this->db->prepare("SELECT u.*, r.nombre AS rol_nombre 
                                    FROM usuarios u 
                                    INNER JOIN roles r ON u.id_rol = r.id_rol 
                                    WHERE u.usuario = :usr LIMIT 1");
        $stmt->execute([':usr' => trim($usuario)]);
        $res = $stmt->fetch();
        return $res ?: null;
    }

    public function obtenerPorId(int $id): ?array {
        $stmt = $this->db->prepare("SELECT u.id_usuario, u.usuario, u.id_rol, u.estado, u.created_at, r.nombre AS rol_nombre 
                                    FROM usuarios u 
                                    INNER JOIN roles r ON u.id_rol = r.id_rol 
                                    WHERE u.id_usuario = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $res = $stmt->fetch();
        return $res ?: null;
    }

    public function listar(): array {
        $stmt = $this->db->query("SELECT u.id_usuario, u.usuario, u.id_rol, u.estado, u.created_at, r.nombre AS rol_nombre 
                                  FROM usuarios u 
                                  INNER JOIN roles r ON u.id_rol = r.id_rol 
                                  ORDER BY u.usuario ASC");
        return $stmt->fetchAll();
    }
}

