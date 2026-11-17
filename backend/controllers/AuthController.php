<?php
require_once __DIR__ . '/../models/Usuario.php';
require_once __DIR__ . '/../config/Response.php';

class AuthController {
    private Usuario $usuarioModel;

    public function __construct() {
        $this->usuarioModel = new Usuario();
    }

    public function login(): void {
        $data = Response::getJsonInput();

        if (empty($data['usuario']) || empty($data['password'])) {
            Response::error('Usuario y contraseña son requeridos', null, 422);
        }

        $usuario = $this->usuarioModel->obtenerPorUsuario($data['usuario']);

        if (!$usuario || !password_verify($data['password'], $usuario['password_hash'])) {
            Response::error('Credenciales de acceso inválidas', null, 401);
        }

        if ($usuario['estado'] !== 'ACTIVO') {
            Response::error('El usuario se encuentra inactivo. Comuníquese con el administrador.', null, 403);
        }

        // Retornar información segura de sesión sin exponer el hash
        unset($usuario['password_hash']);
        Response::json(true, 'Inicio de sesión exitoso', [
            'usuario' => $usuario,
            'token'   => base64_encode(json_encode([
                'id_usuario' => $usuario['id_usuario'],
                'usuario'    => $usuario['usuario'],
                'rol'        => $usuario['rol_nombre'],
                'exp'        => time() + (86400 * 7) // 7 días
            ]))
        ]);
    }

    public function usuarios(): void {
        // Tarea B1: Acceso deshabilitado temporalmente desde peticiones públicas por seguridad
        Response::error('Acceso denegado. Este recurso no está disponible de forma pública.', null, 403);
    }
}

