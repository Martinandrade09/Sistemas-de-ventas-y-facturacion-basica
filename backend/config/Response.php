<?php
/**
 * Helper estandarizado para respuestas JSON y configuración de encabezados CORS
 */
class Response {
    public static function initCors(): void {
        header("Access-Control-Allow-Origin: *");
        header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
        header("Content-Type: application/json; charset=UTF-8");

        // Si es una petición de preflight OPTIONS, responder con 200 y terminar
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
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

