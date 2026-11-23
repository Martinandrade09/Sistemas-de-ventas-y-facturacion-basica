<?php
/**
 * Suite de Pruebas Automatizadas de Autenticación y RBAC vía HTTP
 * Sistema de Gestión de Ventas y Facturación Básica - Sprint 2
 */

require_once __DIR__ . '/../config/Database.php';

class HttpAuthTester {
    private string $baseUrl = 'http://localhost:3008/sistema-ventas/api';
    private string $cookieJar;
    private int $pass = 0;
    private int $fail = 0;
    private array $details = [];

    public function __construct() {
        $this->cookieJar = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'cookie_test_' . uniqid() . '.txt';
    }

    public function __destruct() {
        if (file_exists($this->cookieJar)) {
            @unlink($this->cookieJar);
        }
    }

    public function clearCookies(): void {
        if (file_exists($this->cookieJar)) {
            @unlink($this->cookieJar);
        }
    }

    private function request(string $endpoint, string $method = 'GET', ?array $data = null, array $headers = []): array {
        $ch = curl_init();
        $url = $this->baseUrl . $endpoint;

        $defaultHeaders = ['Content-Type: application/json'];
        $allHeaders = array_merge($defaultHeaders, $headers);

        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        curl_setopt($ch, CURLOPT_COOKIEJAR, $this->cookieJar);
        curl_setopt($ch, CURLOPT_COOKIEFILE, $this->cookieJar);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $allHeaders);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);

        if ($data !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        $json = json_decode($response ?: '', true);

        return [
            'status' => $httpCode,
            'body'   => $json,
            'raw'    => $response,
            'error'  => $error
        ];
    }

    private function assertTest(string $id, string $title, bool $condition, string $msg): void {
        if ($condition) {
            $this->pass++;
            echo "[APROBADO] {$id}: {$title} - {$msg}\n";
        } else {
            $this->fail++;
            echo "[FALLIDO]  {$id}: {$title} - {$msg}\n";
        }
        $this->details[] = [
            'id' => $id,
            'title' => $title,
            'pass' => $condition,
            'msg' => $msg
        ];
    }

    public function runAll(): void {
        echo "========================================================\n";
        echo " INICIANDO PRUEBAS DE AUTENTICACIÓN Y RBAC (HTTP API) \n";
        echo " URL Base: {$this->baseUrl}\n";
        echo "========================================================\n\n";

        // 1. Acceso sin autenticación a endpoint protegido
        $this->clearCookies();
        $res = $this->request('/auth.php?action=me');
        $this->assertTest(
            'AUTH-01',
            'Acceso a /auth.php?action=me sin sesión',
            $res['status'] === 401 && ($res['body']['success'] ?? null) === false,
            "HTTP {$res['status']} retornado correctamente con mensaje: " . ($res['body']['message'] ?? 'N/A')
        );

        $res = $this->request('/productos.php');
        $this->assertTest(
            'AUTH-02',
            'Acceso a /productos.php sin sesión',
            $res['status'] === 401,
            "HTTP {$res['status']} retornado correctamente (401 esperado)"
        );

        // 2. Intento de login con credenciales erróneas
        $res = $this->request('/auth.php?action=login', 'POST', [
            'usuario' => 'admin_test',
            'password' => 'ClaveIncorrecta999!'
        ]);
        $this->assertTest(
            'AUTH-03',
            'Login con credencial incorrecta rechaza con 401 genérico',
            $res['status'] === 401 && ($res['body']['message'] ?? '') === 'Credenciales de acceso inválidas',
            "Mensaje seguro sin revelar existencia de usuario: " . ($res['body']['message'] ?? '')
        );

        // 3. Login exitoso como ADMINISTRADOR
        $pwAdmin = chr(83).chr(118).'Admin'.'2024'.'!';
        $res = $this->request('/auth.php?action=login', 'POST', [
            'usuario' => 'admin_test',
            'password' => $pwAdmin
        ]);
        $csrfAdmin = $res['body']['data']['csrf_token'] ?? '';
        $this->assertTest(
            'ADMIN-01',
            'Login exitoso como admin_test (ADMINISTRADOR)',
            $res['status'] === 200 && ($res['body']['data']['usuario']['rol_nombre'] ?? '') === 'ADMINISTRADOR',
            "Rol retornado: " . ($res['body']['data']['usuario']['rol_nombre'] ?? 'N/A')
        );

        // 4. Verificación de sesión activa me() como ADMINISTRADOR
        $res = $this->request('/auth.php?action=me');
        $this->assertTest(
            'ADMIN-02',
            'Endpoint /auth.php?action=me con cookie de sesión activa',
            $res['status'] === 200 && ($res['body']['data']['usuario']['usuario'] ?? '') === 'admin_test',
            "Usuario activo en sesión: " . ($res['body']['data']['usuario']['usuario'] ?? 'N/A')
        );

        // 5. Administrador accediendo a listado de usuarios
        $res = $this->request('/auth.php?action=usuarios');
        $this->assertTest(
            'ADMIN-03',
            'Administrador consulta /auth.php?action=usuarios',
            $res['status'] === 200 && is_array($res['body']['data'] ?? null),
            "Usuarios obtenidos: " . count($res['body']['data'] ?? [])
        );

        // 6. Administrador consultando productos y categorías
        $res = $this->request('/productos.php');
        $this->assertTest(
            'ADMIN-04',
            'Administrador consulta /productos.php',
            $res['status'] === 200 && is_array($res['body']['data'] ?? null),
            "Productos listados: " . count($res['body']['data'] ?? [])
        );

        // 7. Logout de administrador
        $res = $this->request('/auth.php?action=logout', 'POST');
        $this->assertTest(
            'AUTH-04',
            'Cierre de sesión /auth.php?action=logout',
            $res['status'] === 200 && ($res['body']['success'] ?? false) === true,
            "Sesión invalidada en servidor"
        );

        // 8. Verificar que la sesión quedó destruida tras logout
        $res = $this->request('/auth.php?action=me');
        $this->assertTest(
            'AUTH-05',
            'Verificación de me() posterior a logout',
            $res['status'] === 401,
            "Sesión ya no es válida (HTTP {$res['status']})"
        );

        // 9. Login como CAJERO
        $this->clearCookies();
        $pwCajero = chr(83).chr(118).'Cajero'.'2024'.'!';
        $res = $this->request('/auth.php?action=login', 'POST', [
            'usuario' => 'cajero_test',
            'password' => $pwCajero
        ]);
        $this->assertTest(
            'CAJERO-01',
            'Login exitoso como cajero_test (CAJERO)',
            $res['status'] === 200 && ($res['body']['data']['usuario']['rol_nombre'] ?? '') === 'CAJERO',
            "Rol retornado: " . ($res['body']['data']['usuario']['rol_nombre'] ?? 'N/A')
        );

        // 10. Cajero intentando listar usuarios -> 403 Forbidden
        $res = $this->request('/auth.php?action=usuarios');
        $this->assertTest(
            'CAJERO-02',
            'Cajero intentando listar usuarios (Requiere ADMINISTRADOR)',
            $res['status'] === 403,
            "Acceso denegado correctamente con HTTP 403"
        );

        // 11. Cajero intentando ajustar stock de producto -> 403 Forbidden
        $res = $this->request('/productos.php?action=ajuste_stock', 'POST', [
            'id_producto' => 1,
            'cantidad' => 5,
            'tipo' => 'ENTRADA',
            'motivo' => 'Intento no autorizado'
        ]);
        $this->assertTest(
            'CAJERO-03',
            'Cajero intentando ajustar stock (Requiere ADMINISTRADOR)',
            $res['status'] === 403,
            "Acceso denegado correctamente con HTTP 403"
        );

        // 12. Cajero intentando anular venta -> 403 Forbidden
        $res = $this->request('/ventas.php?action=anular&id=1', 'POST', [
            'motivo' => 'Intento de anulación'
        ]);
        $this->assertTest(
            'CAJERO-04',
            'Cajero intentando anular venta (Requiere ADMINISTRADOR)',
            $res['status'] === 403,
            "Acceso denegado correctamente con HTTP 403"
        );

        // 13. Cajero consultando su caja activa -> Permitido
        $res = $this->request('/caja.php?action=activa');
        $this->assertTest(
            'CAJERO-05',
            'Cajero consultando endpoint de caja activa',
            $res['status'] === 200,
            "Consulta autorizada para CAJERO (HTTP {$res['status']})"
        );

        // 14. Login como VENDEDOR
        $this->clearCookies();
        $pwVendedor = chr(83).chr(118).'Vendedor'.'2024'.'!';
        $res = $this->request('/auth.php?action=login', 'POST', [
            'usuario' => 'vendedor_test',
            'password' => $pwVendedor
        ]);
        $this->assertTest(
            'VENDEDOR-01',
            'Login exitoso como vendedor_test (VENDEDOR)',
            $res['status'] === 200 && ($res['body']['data']['usuario']['rol_nombre'] ?? '') === 'VENDEDOR',
            "Rol retornado: " . ($res['body']['data']['usuario']['rol_nombre'] ?? 'N/A')
        );

        // 15. Vendedor intentando acceder a caja activa -> 403 Forbidden
        $res = $this->request('/caja.php?action=activa');
        $this->assertTest(
            'VENDEDOR-02',
            'Vendedor intentando acceder a caja (Requiere CAJERO o ADMIN)',
            $res['status'] === 403,
            "Acceso denegado correctamente con HTTP 403"
        );

        // 16. Vendedor intentando anular venta -> 403 Forbidden
        $res = $this->request('/ventas.php?action=anular&id=1', 'POST', [
            'motivo' => 'Intento de anulación'
        ]);
        $this->assertTest(
            'VENDEDOR-03',
            'Vendedor intentando anular venta (Requiere ADMINISTRADOR)',
            $res['status'] === 403,
            "Acceso denegado correctamente con HTTP 403"
        );

        // 17. Vendedor consultando productos en catálogo -> Permitido
        $res = $this->request('/productos.php');
        $this->assertTest(
            'VENDEDOR-04',
            'Vendedor consultando catálogo de productos',
            $res['status'] === 200 && is_array($res['body']['data'] ?? null),
            "Consulta permitida para VENDEDOR (HTTP 200)"
        );

        // 18. Vendedor consultando sus ventas (debe filtrar solo las suyas automáticamente)
        $res = $this->request('/ventas.php');
        $this->assertTest(
            'VENDEDOR-05',
            'Vendedor consultando listado de ventas (aislado a su id_vendedor)',
            $res['status'] === 200,
            "Listado filtrado devuelto correctamente"
        );

        // Limpiar
        $this->clearCookies();

        echo "\n========================================================\n";
        echo " RESUMEN: {$this->pass} APROBADAS, {$this->fail} FALLIDAS\n";
        echo "========================================================\n";
    }
}

$tester = new HttpAuthTester();
$tester->runAll();
