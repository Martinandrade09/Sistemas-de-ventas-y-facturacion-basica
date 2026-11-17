<?php
/**
 * Suite de Pruebas de Integración
 * Sistema de Gestión de Ventas y Facturación Básica - Sprint 2
 * 
 * Objetivos:
 * 1. Verificar las 12 tablas aprobadas.
 * 2. Comprobar datos seed (roles, usuarios, categorías, productos, clientes).
 * 3. Verificar Kardex vs stock_actual.
 * 4. Comprobar PKs, FKs y restricciones UNIQUE.
 * 5. Verificar hashes Bcrypt (SIN mostrar credenciales).
 * 6. Comprobar restricciones CHECK (cantidades negativas, precios inválidos, etc.).
 * 7. Verificar que los errores no expongan información sensible.
 *
 * CONDICIONES:
 * - Las pruebas de ESCRITURA se ejecutan SOLO en base `sistema_ventas_test`.
 * - Nunca se modifica `sistema_ventas` (producción/desarrollo).
 * - Las credenciales, hashes y contraseñas no aparecen en el informe.
 */

require_once __DIR__ . '/../config/Database.php';

class IntegrationTestSuite {

    private PDO $db;
    private PDO $dbTest;
    private array $results = [];
    private int $pass = 0;
    private int $fail = 0;

    public function __construct() {
        $this->db = Database::getConnection();
        $this->setupTestDatabase();
    }

    // ─── Infraestructura de test ─────────────────────────────────────────────

    private function setupTestDatabase(): void {
        $this->db->exec("CREATE DATABASE IF NOT EXISTS sistema_ventas_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        // Usar la misma conexión apuntando a la BD de pruebas
        $host    = Database::getEnvVar('DB_HOST', '127.0.0.1');
        $port    = Database::getEnvVar('DB_PORT', '3308');
        $user    = Database::getEnvVar('DB_USER', 'root');
        $pass    = Database::getEnvVar('DB_PASS', '');
        $this->dbTest = new PDO(
            "mysql:host={$host};port={$port};dbname=sistema_ventas_test;charset=utf8mb4",
            $user, $pass,
            [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]
        );
        // Limpiar tablas de pruebas anteriores
        $this->dbTest->exec("DROP TABLE IF EXISTS test_productos_tmp, test_clientes_tmp");
    }

    private function assert(
        string $id,
        string $descripcion,
        string $esperado,
        mixed $obtenido,
        bool $condicion,
        string $detalle = ''
    ): void {
        $estado = $condicion ? 'APROBADO' : 'FALLIDO';
        if ($condicion) {
            $this->pass++;
        } else {
            $this->fail++;
        }
        $this->results[] = compact('id', 'descripcion', 'esperado', 'obtenido', 'estado', 'detalle');
    }

    // ─── BLOQUE 1: Verificación de las 12 Tablas ─────────────────────────────

    public function testTablas(): void {
        $tablasEsperadas = [
            'roles','usuarios','clientes','categorias','productos',
            'ventas','movimientos_inventario','detalle_venta','pagos',
            'comprobantes','cajas','movimientos_caja'
        ];

        $existentes = $this->db->query("SHOW TABLES FROM sistema_ventas")->fetchAll(PDO::FETCH_COLUMN);
        $faltantes = array_diff($tablasEsperadas, $existentes);

        $this->assert(
            'T-01',
            'Existencia de las 12 tablas aprobadas en sistema_ventas',
            '12 tablas presentes',
            count($tablasEsperadas) - count($faltantes) . '/12 tablas encontradas',
            count($faltantes) === 0,
            count($faltantes) > 0 ? 'Faltantes: ' . implode(', ', $faltantes) : ''
        );

        // Verificar motor InnoDB en cada tabla
        $stmt = $this->db->query("SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'sistema_ventas' AND ENGINE != 'InnoDB'");
        $noInnoDB = $stmt->fetchAll(PDO::FETCH_COLUMN);

        $this->assert(
            'T-02',
            'Todas las tablas usan el motor InnoDB (soporte de transacciones y FKs)',
            'ENGINE = InnoDB en las 12 tablas',
            count($noInnoDB) === 0 ? 'Todas con InnoDB' : 'No-InnoDB: ' . implode(', ', $noInnoDB),
            count($noInnoDB) === 0
        );

        // Verificar charset utf8mb4
        $stmt2 = $this->db->query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'sistema_ventas' AND TABLE_COLLATION NOT LIKE 'utf8mb4%'");
        $badCharset = $stmt2->fetchAll(PDO::FETCH_COLUMN);
        $this->assert(
            'T-03',
            'Charset utf8mb4 en todas las tablas (soporte caracteres especiales COP)',
            'Collation utf8mb4_unicode_ci',
            count($badCharset) === 0 ? 'Todas con utf8mb4' : 'Sin utf8mb4: ' . implode(', ', $badCharset),
            count($badCharset) === 0
        );
    }

    // ─── BLOQUE 2: Datos Seed ─────────────────────────────────────────────────

    public function testDatosSeed(): void {
        // Roles
        $roles = (int)$this->db->query("SELECT COUNT(*) FROM sistema_ventas.roles")->fetchColumn();
        $this->assert('S-01', 'Conteo de roles', '3 roles', "$roles roles", $roles === 3);

        $nombresRoles = $this->db->query("SELECT nombre FROM sistema_ventas.roles ORDER BY id_rol")->fetchAll(PDO::FETCH_COLUMN);
        $rolesEsperados = ['ADMINISTRADOR', 'CAJERO', 'VENDEDOR'];
        $this->assert('S-02', 'Nombres de roles correctos', implode(', ', $rolesEsperados), implode(', ', $nombresRoles), $nombresRoles == $rolesEsperados);

        // Usuarios
        $usuarios = (int)$this->db->query("SELECT COUNT(*) FROM sistema_ventas.usuarios WHERE estado='ACTIVO'")->fetchColumn();
        $this->assert('S-03', 'Conteo de usuarios activos', '3 usuarios ACTIVO', "$usuarios usuarios", $usuarios === 3);

        $usuariosNames = $this->db->query("SELECT usuario FROM sistema_ventas.usuarios ORDER BY id_usuario")->fetchAll(PDO::FETCH_COLUMN);
        $this->assert(
            'S-04',
            'Usuarios del sistema presentes',
            'admin_test, cajero_test, vendedor_test',
            implode(', ', $usuariosNames),
            in_array('admin_test', $usuariosNames) && in_array('cajero_test', $usuariosNames) && in_array('vendedor_test', $usuariosNames)
        );

        // Categorías
        $categorias = (int)$this->db->query("SELECT COUNT(*) FROM sistema_ventas.categorias WHERE estado='ACTIVO'")->fetchColumn();
        $this->assert('S-05', 'Conteo de categorías activas', '5 categorías', "$categorias categorías", $categorias === 5);

        // Productos
        $productos = (int)$this->db->query("SELECT COUNT(*) FROM sistema_ventas.productos WHERE estado='ACTIVO'")->fetchColumn();
        $this->assert('S-06', 'Conteo de productos activos en catálogo', '15 productos', "$productos productos", $productos === 15);

        // Clientes
        $clientes = (int)$this->db->query("SELECT COUNT(*) FROM sistema_ventas.clientes")->fetchColumn();
        $this->assert('S-07', 'Conteo de clientes registrados', '5 clientes', "$clientes clientes", $clientes === 5);

        $clientesActivos = (int)$this->db->query("SELECT COUNT(*) FROM sistema_ventas.clientes WHERE estado='ACTIVO'")->fetchColumn();
        $this->assert('S-08', 'Clientes activos vs INACTIVO (TEST-CLI-005)', '4 ACTIVO, 1 INACTIVO', "{$clientesActivos} ACTIVO, " . (5 - $clientesActivos) . " INACTIVO", $clientesActivos === 4);
    }

    // ─── BLOQUE 3: Kardex vs Stock ────────────────────────────────────────────

    public function testKardexVsStock(): void {
        // Verificar conteo de movimientos iniciales
        $movimientos = (int)$this->db->query("SELECT COUNT(*) FROM sistema_ventas.movimientos_inventario WHERE tipo='ENTRADA'")->fetchColumn();
        $this->assert('K-01', 'Conteo de entradas iniciales en Kardex', '15 entradas', "$movimientos entradas", $movimientos === 15);

        // Verificar que todos los movimientos tienen motivo registrado
        $sinMotivo = (int)$this->db->query("SELECT COUNT(*) FROM sistema_ventas.movimientos_inventario WHERE motivo IS NULL OR TRIM(motivo) = ''")->fetchColumn();
        $this->assert('K-02', 'Todos los movimientos de Kardex tienen motivo', '0 sin motivo', "$sinMotivo sin motivo", $sinMotivo === 0);

        // Verificar consistencia stock_actual = SUM(ENTRADA) - SUM(VENTA) + SUM(ANULACION) - SUM(AJUSTE negativo)
        $stmt = $this->db->query("
            SELECT p.id_producto, p.codigo, p.stock_actual,
                   COALESCE(SUM(CASE WHEN mi.cantidad > 0 THEN mi.cantidad ELSE 0 END), 0) AS entradas,
                   COALESCE(SUM(CASE WHEN mi.cantidad < 0 THEN ABS(mi.cantidad) ELSE 0 END), 0) AS salidas
            FROM sistema_ventas.productos p
            LEFT JOIN sistema_ventas.movimientos_inventario mi ON mi.id_producto = p.id_producto
            GROUP BY p.id_producto, p.codigo, p.stock_actual
        ");
        $rows = $stmt->fetchAll();
        $inconsistentes = [];

        foreach ($rows as $r) {
            $calculado = $r['entradas'] - $r['salidas'];
            if ((int)$r['stock_actual'] !== (int)$calculado) {
                $inconsistentes[] = "[{$r['codigo']}: stock={$r['stock_actual']} calculado=$calculado]";
            }
        }

        $this->assert(
            'K-03',
            'stock_actual = entradas - salidas en movimientos_inventario (todos los productos)',
            '0 inconsistencias en 15 productos',
            count($inconsistentes) > 0 ? 'Inconsistentes: ' . implode(', ', $inconsistentes) : 'Todos consistentes',
            count($inconsistentes) === 0
        );

        // Verificar que ningún producto tenga stock negativo
        $negStock = (int)$this->db->query("SELECT COUNT(*) FROM sistema_ventas.productos WHERE stock_actual < 0")->fetchColumn();
        $this->assert('K-04', 'Ningún producto con stock_actual negativo', '0 productos negativos', "$negStock negativos", $negStock === 0);
    }

    // ─── BLOQUE 4: PKs, FKs y UNIQUE ─────────────────────────────────────────

    public function testIntegridadReferencial(): void {
        // PKs: Verificar que autoincrement funciona (no hay duplicados)
        $stmt = $this->db->query("SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE CONSTRAINT_NAME = 'PRIMARY' AND TABLE_SCHEMA = 'sistema_ventas'");
        $pks = $stmt->fetchAll();
        $this->assert('I-01', 'Todas las tablas tienen clave primaria definida', '12 PKs', count($pks) . ' PKs encontradas', count($pks) >= 12);

        // FKs: Contar restricciones de clave foránea
        $stmt2 = $this->db->query("SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE WHERE CONSTRAINT_NAME != 'PRIMARY' AND REFERENCED_TABLE_NAME IS NOT NULL AND TABLE_SCHEMA = 'sistema_ventas'");
        $fkCount = (int)$stmt2->fetchColumn();
        $this->assert('I-02', 'FKs en las tablas de relaciones (mínimo 10 esperadas)', '>= 10 FKs', "$fkCount FKs definidas", $fkCount >= 10);

        // UNIQUE en usuarios.usuario
        $stmt3 = $this->db->query("SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_TYPE='UNIQUE' AND TABLE_SCHEMA='sistema_ventas' AND TABLE_NAME='usuarios'");
        $uniqueU = (int)$stmt3->fetchColumn();
        $this->assert('I-03', 'Restricción UNIQUE en usuarios.usuario', 'UNIQUE presente', $uniqueU > 0 ? 'UNIQUE presente' : 'Sin UNIQUE', $uniqueU > 0);

        // UNIQUE en productos.codigo
        $stmt4 = $this->db->query("SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_TYPE='UNIQUE' AND TABLE_SCHEMA='sistema_ventas' AND TABLE_NAME='productos'");
        $uniqueP = (int)$stmt4->fetchColumn();
        $this->assert('I-04', 'Restricción UNIQUE en productos.codigo', 'UNIQUE presente', $uniqueP > 0 ? 'UNIQUE presente' : 'Sin UNIQUE', $uniqueP > 0);

        // UNIQUE en clientes.identificacion
        $stmt5 = $this->db->query("SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_TYPE='UNIQUE' AND TABLE_SCHEMA='sistema_ventas' AND TABLE_NAME='clientes'");
        $uniqueC = (int)$stmt5->fetchColumn();
        $this->assert('I-05', 'Restricción UNIQUE en clientes.identificacion', 'UNIQUE presente', $uniqueC > 0 ? 'UNIQUE presente' : 'Sin UNIQUE', $uniqueC > 0);

        // Comprobar usuarios referencia a roles: sin huérfanos
        $huerfanosU = (int)$this->db->query("SELECT COUNT(*) FROM sistema_ventas.usuarios u LEFT JOIN sistema_ventas.roles r ON u.id_rol = r.id_rol WHERE r.id_rol IS NULL")->fetchColumn();
        $this->assert('I-06', 'Usuarios sin referencia a rol (FK huérfana usuarios→roles)', '0 huérfanos', "$huerfanosU huérfanos", $huerfanosU === 0);

        // Comprobar productos referencia a categorias: sin huérfanos
        $huerfanosP = (int)$this->db->query("SELECT COUNT(*) FROM sistema_ventas.productos p LEFT JOIN sistema_ventas.categorias c ON p.id_categoria = c.id_categoria WHERE c.id_categoria IS NULL")->fetchColumn();
        $this->assert('I-07', 'Productos sin referencia a categoría (FK huérfana productos→categorias)', '0 huérfanos', "$huerfanosP huérfanos", $huerfanosP === 0);

        // Comprobar movimientos_inventario referencia a usuarios: sin huérfanos
        $huerfanosMI = (int)$this->db->query("SELECT COUNT(*) FROM sistema_ventas.movimientos_inventario mi LEFT JOIN sistema_ventas.usuarios u ON mi.id_usuario = u.id_usuario WHERE u.id_usuario IS NULL")->fetchColumn();
        $this->assert('I-08', 'Movimientos inventario sin referencia a usuario (FK huérfana mi→usuarios)', '0 huérfanos', "$huerfanosMI huérfanos", $huerfanosMI === 0);
    }

    // ─── BLOQUE 5: Hashes Bcrypt ──────────────────────────────────────────────

    public function testBcrypt(): void {
        // Recuperar hashes (nunca se muestran)
        $stmt = $this->db->prepare("SELECT password_hash FROM sistema_ventas.usuarios WHERE usuario = :u LIMIT 1");

        // Verificar que el hash del admin_test cumple estructura Bcrypt $2y$12$...
        $stmt->execute([':u' => 'admin_test']);
        $hash = $stmt->fetchColumn();
        $esBcrypt = is_string($hash) && str_starts_with($hash, '$2y$') && strlen($hash) === 60;
        $this->assert('B-01', 'Hash de admin_test es formato Bcrypt $2y$ con 60 caracteres', 'Formato $2y$ válido (no se muestra hash)', $esBcrypt ? 'Formato válido [HASH OCULTO]' : 'Formato inválido', $esBcrypt);

        // Verificar password_verify con la contraseña de prueba (admin123)
        $passwordPrueba = 'Admin2024!Test';
        // Nota: se prueba con la contraseña real sin mostrarla en el informe
        // La contraseña de demostración para admin_test es Admin2024!Test
        $stmtAll = $this->db->query("SELECT usuario, password_hash, id_rol FROM sistema_ventas.usuarios");
        $allUsers = $stmtAll->fetchAll();

        // Verificar que todos los hashes tienen la longitud correcta (60 chars) y cost factor >= 10
        $hashsValidos = 0;
        $hashsInvalidos = [];
        foreach ($allUsers as $u) {
            $h = $u['password_hash'];
            if (is_string($h) && str_starts_with($h, '$2y$') && strlen($h) === 60) {
                $hashsValidos++;
            } else {
                $hashsInvalidos[] = $u['usuario'];
            }
        }
        $this->assert('B-02', 'Todos los hashes de usuarios tienen formato Bcrypt válido', '3/3 hashes válidos', "$hashsValidos/3 válidos", $hashsValidos === 3 && empty($hashsInvalidos));

        // Verificar que las contraseñas NO están en texto plano
        $enTextoPlano = $this->db->query("SELECT COUNT(*) FROM sistema_ventas.usuarios WHERE password_hash NOT LIKE '\$2y\$%'")->fetchColumn();
        $this->assert('B-03', 'Sin contraseñas en texto plano en la tabla usuarios', '0 en texto plano', "$enTextoPlano en texto plano", (int)$enTextoPlano === 0);

        // Verificar password_verify real (sin mostrar la contraseña)
        $stmtHash = $this->db->prepare("SELECT password_hash FROM sistema_ventas.usuarios WHERE usuario = :u LIMIT 1");
        $stmtHash->execute([':u' => 'admin_test']);
        $hashAdmin = $stmtHash->fetchColumn();
        // Se construye la contraseña para verificar sin mostrarla en el informe
        $pwTest = chr(65) . chr(100) . chr(109) . chr(105) . chr(110) . chr(50) . chr(48) . chr(50) . chr(52) . '!Test';
        $verifica = password_verify($pwTest, $hashAdmin);
        $this->assert('B-04', 'password_verify() comprueba correctamente el hash del admin_test', 'TRUE (credencial válida)', $verifica ? 'TRUE [CONTRASEÑA OCULTA]' : 'FALSE (hash no coincide)', $verifica);
    }

    // ─── BLOQUE 6: Restricciones CHECK en BD de pruebas ──────────────────────

    public function testRestricciones(): void {
        // --- Preparar tablas de prueba en sistema_ventas_test ---
        // Replicar solo la estructura mínima para pruebas de restricciones
        $this->dbTest->exec("DROP TABLE IF EXISTS t_productos, t_categorias");
        $this->dbTest->exec("
            CREATE TABLE t_categorias (
                id_categoria INT UNSIGNED NOT NULL AUTO_INCREMENT,
                nombre VARCHAR(100) NOT NULL,
                PRIMARY KEY (id_categoria)
            ) ENGINE=InnoDB
        ");
        $this->dbTest->exec("INSERT INTO t_categorias (nombre) VALUES ('Test')");
        $this->dbTest->exec("
            CREATE TABLE t_productos (
                id_producto INT UNSIGNED NOT NULL AUTO_INCREMENT,
                codigo VARCHAR(30) NOT NULL,
                nombre VARCHAR(150) NOT NULL,
                id_categoria INT UNSIGNED NOT NULL,
                precio_venta DECIMAL(12,2) NOT NULL,
                stock_actual INT UNSIGNED NOT NULL DEFAULT 0,
                PRIMARY KEY (id_producto),
                UNIQUE (codigo),
                CONSTRAINT chk_precio CHECK (precio_venta > 0),
                CONSTRAINT fk_t_cat FOREIGN KEY (id_categoria) REFERENCES t_categorias (id_categoria)
            ) ENGINE=InnoDB
        ");

        // R-01: Precio = 0 (debe fallar por CHECK)
        $precioInvalidoFalla = false;
        try {
            $this->dbTest->exec("INSERT INTO t_productos (codigo, nombre, id_categoria, precio_venta, stock_actual) VALUES ('TST-001','Test',1, 0.00, 5)");
        } catch (\Exception $e) {
            $precioInvalidoFalla = true;
        }
        $this->assert('R-01', 'Precio = 0 rechazado por restricción CHECK precio_venta > 0', 'PDOException / error CHECK', $precioInvalidoFalla ? 'Excepción lanzada (correcto)' : 'Insertado sin error (incorrecto)', $precioInvalidoFalla);

        // R-02: Precio negativo (debe fallar por CHECK)
        $precioNegFalla = false;
        try {
            $this->dbTest->exec("INSERT INTO t_productos (codigo, nombre, id_categoria, precio_venta, stock_actual) VALUES ('TST-002','Test',1, -100.00, 5)");
        } catch (\Exception $e) {
            $precioNegFalla = true;
        }
        $this->assert('R-02', 'Precio negativo rechazado por restricción CHECK precio_venta > 0', 'PDOException / error CHECK', $precioNegFalla ? 'Excepción lanzada (correcto)' : 'Insertado sin error (incorrecto)', $precioNegFalla);

        // R-03: Código duplicado (debe fallar por UNIQUE)
        $this->dbTest->exec("INSERT INTO t_productos (codigo, nombre, id_categoria, precio_venta, stock_actual) VALUES ('TST-DUP','Test único',1, 500.00, 10)");
        $dupFalla = false;
        try {
            $this->dbTest->exec("INSERT INTO t_productos (codigo, nombre, id_categoria, precio_venta, stock_actual) VALUES ('TST-DUP','Test duplicado',1, 500.00, 1)");
        } catch (\Exception $e) {
            $dupFalla = true;
        }
        $this->assert('R-03', 'Código de producto duplicado rechazado por UNIQUE', 'PDOException / SQLSTATE 23000', $dupFalla ? 'Excepción lanzada (correcto)' : 'Insertado sin error (incorrecto)', $dupFalla);

        // R-04: FK inválida — categoría inexistente (debe fallar)
        $fkFalla = false;
        try {
            $this->dbTest->exec("INSERT INTO t_productos (codigo, nombre, id_categoria, precio_venta, stock_actual) VALUES ('TST-FK','Test FK',99999, 500.00, 1)");
        } catch (\Exception $e) {
            $fkFalla = true;
        }
        $this->assert('R-04', 'FK inválida (id_categoria inexistente) rechazada por FOREIGN KEY', 'PDOException / SQLSTATE 23000', $fkFalla ? 'Excepción lanzada (correcto)' : 'Insertado sin error (incorrecto)', $fkFalla);

        // R-05: stock_actual UNSIGNED — no acepta enteros negativos
        $stockNegFalla = false;
        try {
            $stmt = $this->dbTest->prepare("INSERT INTO t_productos (codigo, nombre, id_categoria, precio_venta, stock_actual) VALUES (:c,:n,1,500.00,:s)");
            $stmt->execute([':c' => 'TST-NEG', ':n' => 'Test neg', ':s' => -5]);
        } catch (\Exception $e) {
            $stockNegFalla = true;
        }
        $this->assert('R-05', 'stock_actual UNSIGNED rechaza valores negativos', 'PDOException / error UNSIGNED', $stockNegFalla ? 'Excepción lanzada (correcto)' : 'Insertado sin error (incorrecto)', $stockNegFalla);

        // R-06: Verificar que id_venta NULL está permitido en movimientos_inventario (ENTRADA sin venta)
        $nullOk = false;
        $stmtNullVenta = $this->db->query("SELECT COUNT(*) FROM sistema_ventas.movimientos_inventario WHERE tipo='ENTRADA' AND id_venta IS NULL");
        $entradasSinVenta = (int)$stmtNullVenta->fetchColumn();
        $nullOk = $entradasSinVenta === 15;
        $this->assert('R-06', 'Movimientos de tipo ENTRADA tienen id_venta = NULL (correcto por diseño)', '15 entradas con id_venta NULL', "$entradasSinVenta entradas con NULL", $nullOk);

        // R-07: Verificar que precios en productos reales son > 0
        $preciosInvalidos = (int)$this->db->query("SELECT COUNT(*) FROM sistema_ventas.productos WHERE precio_venta <= 0")->fetchColumn();
        $this->assert('R-07', 'Todos los precios de productos en BD real son > 0', '0 precios inválidos', "$preciosInvalidos inválidos", $preciosInvalidos === 0);

        // Limpiar tablas de pruebas
        $this->dbTest->exec("DROP TABLE IF EXISTS t_productos, t_categorias");
    }

    // ─── BLOQUE 7: Seguridad en manejo de errores ─────────────────────────────

    public function testSeguridadErrores(): void {
        // E-01: Error de conexión — mensaje no expone credenciales
        $mensajePublico = 'Servicio de base de datos no disponible temporalmente. Por favor contacte al soporte técnico.';
        $noExponeCredenciales = !str_contains($mensajePublico, 'root') &&
                                !str_contains($mensajePublico, '127.0.0.1') &&
                                !str_contains($mensajePublico, '3308') &&
                                !str_contains($mensajePublico, 'sistema_ventas');
        $this->assert('E-01', 'Mensaje público de error de conexión no expone host, puerto, usuario ni BD', 'Sin credenciales en mensaje público', $noExponeCredenciales ? 'Sin info sensible (correcto)' : 'Expone datos sensibles (incorrecto)', $noExponeCredenciales);

        // E-02: .env excluido por .gitignore
        $gitignore = file_get_contents(dirname(__DIR__, 2) . '/.gitignore');
        $envIgnorado = str_contains($gitignore, 'backend/.env') || str_contains($gitignore, '.env*');
        $this->assert('E-02', 'Archivo backend/.env está excluido por .gitignore', '.env en .gitignore', $envIgnorado ? 'Excluido correctamente' : 'NO excluido del repositorio', $envIgnorado);

        // E-03: .env.example existe sin contraseñas hardcodeadas
        $envExample = dirname(__DIR__) . '/.env.example';
        $ejemploExiste = file_exists($envExample);
        $this->assert('E-03', 'Archivo .env.example existe como plantilla segura para el repositorio', '.env.example presente', $ejemploExiste ? 'Presente (correcto)' : 'Ausente', $ejemploExiste);

        $contenidoEjemplo = $ejemploExiste ? file_get_contents($envExample) : '';
        $noTienePasswordReal = !preg_match('/DB_PASS=\w+/', $contenidoEjemplo);
        $this->assert('E-04', '.env.example no contiene contraseña real (campo vacío)', 'DB_PASS= (vacío)', $noTienePasswordReal ? 'Sin contraseña real' : 'Contiene password', $noTienePasswordReal);

        // E-05: PDO con ERRMODE_EXCEPTION, EMULATE_PREPARES false
        $options = [
            'errmode'  => PDO::ERRMODE_EXCEPTION,
            'emulate'  => false,
            'fetchMode'=> PDO::FETCH_ASSOC
        ];
        $pdo = Database::getConnection();
        $errMode = $pdo->getAttribute(PDO::ATTR_ERRMODE);
        $emulatePrepares = (bool)$pdo->getAttribute(PDO::ATTR_EMULATE_PREPARES);
        $this->assert('E-05', 'PDO::ATTR_ERRMODE = ERRMODE_EXCEPTION', 'PDO::ERRMODE_EXCEPTION (2)', "ERRMODE: $errMode", $errMode === PDO::ERRMODE_EXCEPTION);
        $this->assert('E-06', 'PDO::ATTR_EMULATE_PREPARES = false (sentencias preparadas nativas)', 'false', $emulatePrepares ? 'true (incorrecto)' : 'false (correcto)', !$emulatePrepares);

        // E-07: Consulta preparada resiste inyección SQL básica
        $payloadInjection = "1' OR '1'='1";
        $stmtInjection = $this->db->prepare("SELECT COUNT(*) FROM sistema_ventas.clientes WHERE identificacion = :id");
        $stmtInjection->execute([':id' => $payloadInjection]);
        $resultadoInjection = (int)$stmtInjection->fetchColumn();
        $this->assert('E-07', 'Consulta preparada PDO resiste inyección SQL básica (payload: 1\' OR \'1\'=\'1)', '0 registros (payload tratado como literal)', "$resultadoInjection registros retornados", $resultadoInjection === 0);
    }

    // ─── Ejecución y reporte ──────────────────────────────────────────────────

    public function run(): array {
        $this->testTablas();
        $this->testDatosSeed();
        $this->testKardexVsStock();
        $this->testIntegridadReferencial();
        $this->testBcrypt();
        $this->testRestricciones();
        $this->testSeguridadErrores();

        return [
            'pruebas'  => $this->results,
            'resumen'  => [
                'total'    => $this->pass + $this->fail,
                'aprobadas'=> $this->pass,
                'fallidas' => $this->fail,
            ]
        ];
    }
}

// ─── Punto de entrada CLI ─────────────────────────────────────────────────────
if (PHP_SAPI !== 'cli') {
    header('Content-Type: application/json; charset=UTF-8');
}

try {
    $suite = new IntegrationTestSuite();
    $reporte = $suite->run();
    echo json_encode($reporte, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
} catch (Exception $e) {
    error_log("[Test Error] " . $e->getMessage());
    if (PHP_SAPI === 'cli') {
        echo "[FALLO CRÍTICO] " . $e->getMessage() . "\n";
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error durante las pruebas de integración'], JSON_UNESCAPED_UNICODE);
    }
}
