<?php
require_once __DIR__ . '/../models/Usuario.php';
require_once __DIR__ . '/../config/Response.php';
require_once __DIR__ . '/../config/Auth.php';

class AuthController {
    private Usuario $usuarioModel;

    public function __construct() {
        $this->usuarioModel = new Usuario();
    }

    /**
     * Inicio de sesión seguro con verificación de hash Bcrypt y cookie de sesión HttpOnly
     */
    public function login(): void {
        $data = Response::getJsonInput();

        if (empty($data['usuario']) || empty($data['password'])) {
            Response::error('Usuario y contraseña son requeridos', null, 422);
        }

        $usuario = $this->usuarioModel->obtenerPorUsuario(trim((string)$data['usuario']));

        // Mensaje genérico de seguridad para no revelar si el usuario existe
        if (!$usuario || !password_verify((string)$data['password'], (string)$usuario['password_hash'])) {
            Response::error('Credenciales de acceso inválidas', null, 401);
        }

        if ($usuario['estado'] !== 'ACTIVO') {
            Response::error('El usuario se encuentra inactivo. Comuníquese con el administrador.', null, 403);
        }

        // Registrar sesión segura en el servidor
        Auth::login($usuario);

        $usuarioSesion = [
            'id_usuario' => (int)$usuario['id_usuario'],
            'usuario'    => (string)$usuario['usuario'],
            'id_rol'     => (int)$usuario['id_rol'],
            'rol_nombre' => strtoupper(trim((string)$usuario['rol_nombre'])),
            'estado'     => (string)$usuario['estado']
        ];

        Response::json(true, 'Inicio de sesión exitoso', [
            'usuario'    => $usuarioSesion,
            'csrf_token' => Auth::csrfToken()
        ]);
    }

    /**
     * Cierre de sesión seguro: destruye la sesión y su cookie en el servidor
     */
    public function logout(): void {
        Auth::logout();
        Response::json(true, 'Sesión finalizada exitosamente');
    }

    /**
     * Consulta y valida el estado de la sesión activa
     */
    public function me(): void {
        $usuario = Auth::requireAuth();
        Response::json(true, 'Sesión activa verificada', [
            'usuario'    => $usuario,
            'csrf_token' => Auth::csrfToken()
        ]);
    }

    /**
     * Lista usuarios del sistema (Acción estrictamente restringida a ADMINISTRADOR)
     */
    public function usuarios(): void {
        Auth::requireRole('ADMINISTRADOR');
        $usuarios = $this->usuarioModel->listar();
        Response::json(true, 'Usuarios del sistema obtenidos correctamente', $usuarios);
    }
}
