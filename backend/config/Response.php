<?php
/**
 * Helper estandarizado para respuestas JSON y configuración de encabezados CORS
 */
class Response {
    public static function initCors(): void {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

        // Permitir origen explícito con soporte de cookies de sesión (credentials: include)
        $allowedOrigins = [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost:5173',
            'http://127.0.0.1:5173'
        ];

        if (!empty($origin) && (in_array($origin, $allowedOrigins, true) || preg_match('#^https?://(localhost|127\.0\.0\.1)(:\d+)?$#', $origin))) {
            header("Access-Control-Allow-Origin: $origin");
            header("Access-Control-Allow-Credentials: true");
        } else {
            header("Access-Control-Allow-Origin: *");
        }

        header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token");
        header("Content-Type: application/json; charset=UTF-8");

        // Si es una petición de preflight OPTIONS, responder con 200 y terminar
        if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit;
        }
    }

    public static function json(bool $success, string $message, mixed $data = null, int $statusCode = 200): void {
        http_response_code($statusCode);
        $payload = [
            'success' => $success,
            'message' => $message,
            'data'    => $data
        ];
        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }

    public static function error(string $message, mixed $details = null, int $statusCode = 400): void {
        http_response_code($statusCode);
        $payload = [
            'success' => false,
            'message' => $message,
            'error'   => $details
        ];
        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }

    public static function getJsonInput(): array {
        $raw = file_get_contents('php://input');
        if (empty($raw)) {
            return [];
        }
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }
}
