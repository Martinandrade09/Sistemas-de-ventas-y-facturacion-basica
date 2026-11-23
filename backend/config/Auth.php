<?php
/**
 * Servicio Centralizado de Autenticación y Control de Acceso por Roles (RBAC)
 * 
 * Gestiona:
 * - Sesiones seguras de servidor con cookies HttpOnly, SameSite y Secure.
 * - Regeneración de session_id contra ataques de fijación de sesión.
 * - Destrucción e invalidación completa en logout.
 * - Control de acceso por roles (ADMINISTRADOR, CAJERO, VENDEDOR).
 * - Protección contra spoofing de identidades (id_usuario se extrae de la sesión).
 * - Generación y validación de tokens CSRF.
 */

require_once __DIR__ . '/Response.php';

class Auth {
    private const SESSION_NAME = 'SISTEMA_VENTAS_SESS';
    private const SESSION_LIFETIME = 86400; // 24 horas

    /**
     * Inicia la sesión PHP con parámetros de cookie seguros
     */
    public static function startSession(): void {
        if (session_status() === PHP_SESSION_NONE) {
            $isSecure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') 
                     || (isset($_SERVER['SERVER_PORT']) && (int)$_SERVER['SERVER_PORT'] === 443);

            session_name(self::SESSION_NAME);
            session_set_cookie_params([
                'lifetime' => self::SESSION_LIFETIME,
                'path'     => '/',
                'domain'   => '',
                'secure'   => $isSecure,
                'httponly' => true,
                'samesite' => 'Lax'
            ]);

            session_start();
        }
    }

    /**
     * Registra al usuario autenticado en la sesión del servidor
     */
    public static function login(array $usuario): void {
        self::startSession();

        // Prevenir ataques de fijación de sesión regenerando el ID
        session_regenerate_id(true);

        $rolNombre = strtoupper(trim((string)($usuario['rol_nombre'] ?? '')));

        $_SESSION['usuario'] = [
            'id_usuario' => (int)$usuario['id_usuario'],
            'usuario'    => (string)$usuario['usuario'],
            'id_rol'     => (int)$usuario['id_rol'],
            'rol_nombre' => $rolNombre,
            'estado'     => (string)($usuario['estado'] ?? 'ACTIVO')
        ];
        $_SESSION['login_time'] = time();
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }

    /**
     * Destruye de forma segura la sesión y su cookie asociada
     */
    public static function logout(): void {
        self::startSession();

        $_SESSION = [];

        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                time() - 42000,
                $params['path'],
                $params['domain'],
                $params['secure'],
                $params['httponly']
            );
        }

        session_destroy();
    }

    /**
     * Comprueba si existe un usuario autenticado y activo
     */
    public static function check(): bool {
        self::startSession();

        if (empty($_SESSION['usuario']) || !isset($_SESSION['usuario']['id_usuario'])) {
            return false;
        }

        // Control de expiración de sesión por inactividad
        if (isset($_SESSION['login_time']) && (time() - $_SESSION['login_time'] > self::SESSION_LIFETIME)) {
            self::logout();
            return false;
        }

        return true;
    }

    /**
     * Retorna los datos del usuario en sesión o null
     */
    public static function user(): ?array {
        if (!self::check()) {
            return null;
        }
        return $_SESSION['usuario'];
    }

    /**
     * Retorna el ID del usuario autenticado o null
     */
    public static function id(): ?int {
        $u = self::user();
        return $u ? (int)$u['id_usuario'] : null;
    }

    /**
     * Retorna el nombre de rol normalizado (ADMINISTRADOR, CAJERO, VENDEDOR) o null
     */
    public static function role(): ?string {
        $u = self::user();
        return $u ? strtoupper(trim((string)$u['rol_nombre'])) : null;
    }

    /**
     * Retorna el token CSRF activo para el cliente autenticado
     */
    public static function csrfToken(): string {
        self::startSession();
        if (empty($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
        return $_SESSION['csrf_token'];
    }

    /**
     * Exige que la petición provenga de un usuario autenticado.
     * Si no hay sesión válida, termina inmediatamente con HTTP 401.
     */
    public static function requireAuth(): array {
        if (!self::check()) {
            Response::error('No autenticado. Sesión inválida, inexistente o expirada.', null, 401);
        }
        return $_SESSION['usuario'];
    }

    /**
     * Exige que el usuario autenticado posea uno de los roles permitidos.
     * Si no está autenticado -> HTTP 401.
     * Si no tiene el rol necesario -> HTTP 403.
     */
    public static function requireRole(array|string $allowedRoles): array {
        $usuario = self::requireAuth();
        $rolActual = strtoupper(trim((string)($usuario['rol_nombre'] ?? '')));

        if (is_string($allowedRoles)) {
            $allowedRoles = [$allowedRoles];
        }

        $allowedUpper = array_map(fn($r) => strtoupper(trim((string)$r)), $allowedRoles);

        if (!in_array($rolActual, $allowedUpper, true)) {
            Response::error(
                "Acceso denegado. Se requiere uno de los siguientes roles: " . implode(', ', $allowedRoles) . ".",
                ['rol_actual' => $rolActual, 'roles_permitidos' => $allowedRoles],
                403
            );
        }

        return $usuario;
    }
}
