<?php
/**
 * Conexión Segura a Base de Datos MySQL / MariaDB mediante PDO
 * 
 * Implementa:
 * - Patrón Singleton para optimizar recursos.
 * - Carga de credenciales desde archivo .env (mantenido fuera del control de versiones).
 * - Sentencias preparadas nativas (emulación desactivada) para máxima seguridad contra inyecciones SQL.
 * - Modo de errores en Excepciones (ERRMODE_EXCEPTION).
 * - Manejo seguro de errores sin revelar contraseñas, puertos ni datos sensibles en mensajes públicos.
 */
class Database {
    private static ?PDO $instance = null;
    private static bool $envLoaded = false;

    /**
     * Carga variables desde el archivo .env si existe
     */
    private static function loadEnv(): void {
        if (self::$envLoaded) {
            return;
        }

        $envFile = __DIR__ . '/../.env';
        if (file_exists($envFile) && is_readable($envFile)) {
            $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                $line = trim($line);
                if ($line === '' || str_starts_with($line, '#')) {
                    continue;
                }
                if (str_contains($line, '=')) {
                    [$key, $value] = explode('=', $line, 2);
                    $key = trim($key);
                    $value = trim($value, " \t\n\r\0\x0B\"'");
                    if (!isset($_SERVER[$key]) && !isset($_ENV[$key])) {
                        putenv("$key=$value");
                        $_ENV[$key] = $value;
                        $_SERVER[$key] = $value;
                    }
                }
            }
        }
        self::$envLoaded = true;
    }

    /**
     * Retorna el valor de una variable de entorno o un valor por defecto
     */
    public static function getEnvVar(string $key, string $default = ''): string {
        self::loadEnv();
        $val = getenv($key);
        if ($val !== false && $val !== '') {
            return $val;
        }
        if (isset($_ENV[$key]) && $_ENV[$key] !== '') {
            return $_ENV[$key];
        }
        return $default;
    }

    /**
     * Obtiene la instancia única de conexión PDO
     *
     * @return PDO
     * @throws RuntimeException Mensaje amigable y seguro sin exponer credenciales
     */
    public static function getConnection(): PDO {
        if (self::$instance === null) {
            self::loadEnv();

            $host    = self::getEnvVar('DB_HOST', '127.0.0.1');
            $port    = self::getEnvVar('DB_PORT', '3308');
            $dbName  = self::getEnvVar('DB_NAME', 'sistema_ventas');
            $user    = self::getEnvVar('DB_USER', 'root');
            $pass    = self::getEnvVar('DB_PASS', '');
            $charset = self::getEnvVar('DB_CHARSET', 'utf8mb4');

            $dsn = "mysql:host={$host};port={$port};dbname={$dbName};charset={$charset}";

            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];

            try {
                self::$instance = new PDO($dsn, $user, $pass, $options);
            } catch (PDOException $e) {
                // Registro interno del error técnico para el administrador del sistema
                error_log("[Database Error] Fallo de conexión: " . $e->getMessage());

                // Manejo seguro: nunca exponer contraseñas, host ni trazas técnicas al cliente
                if (PHP_SAPI === 'cli') {
                    throw new RuntimeException("Error: No se pudo conectar a la base de datos. Verifique que el servicio esté activo.");
                } else {
                    http_response_code(500);
                    header('Content-Type: application/json; charset=UTF-8');
                    echo json_encode([
                        'success' => false,
                        'message' => 'Servicio de base de datos no disponible temporalmente. Por favor contacte al soporte técnico.'
                    ], JSON_UNESCAPED_UNICODE);
                    exit;
                }
            }
        }

        return self::$instance;
    }
}
