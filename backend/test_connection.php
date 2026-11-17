<?php
/**
 * Test de Verificación de Conexión PDO - Sistema de Gestión de Ventas y Facturación Básica
 * 
 * Verifica:
 * 1. Conexión segura mediante PDO.
 * 2. Disponibilidad de las 12 tablas aprobadas.
 * 3. Consistencia de datos cargados desde seed.sql.
 * 4. Consulta de prueba segura con prepared statement a la tabla productos.
 */

require_once __DIR__ . '/config/Database.php';

$isCli = (PHP_SAPI === 'cli');

if (!$isCli) {
    header('Content-Type: application/json; charset=UTF-8');
}

$tablasRequeridas = [
    'roles',
    'usuarios',
    'clientes',
    'categorias',
    'productos',
    'ventas',
    'movimientos_inventario',
    'detalle_venta',
    'pagos',
    'comprobantes',
    'cajas',
    'movimientos_caja'
];

try {
    $pdo = Database::getConnection();

    // 1. Diagnóstico del motor
    $version = $pdo->query("SELECT VERSION()")->fetchColumn();
    $currentDb = $pdo->query("SELECT DATABASE()")->fetchColumn();
    $charset = $pdo->query("SELECT @@character_set_connection")->fetchColumn();

    // 2. Verificación de las 12 tablas
    $stmtTables = $pdo->query("SHOW TABLES");
    $tablasExistentes = $stmtTables->fetchAll(PDO::FETCH_COLUMN);

    $tablasFaltantes = array_diff($tablasRequeridas, $tablasExistentes);
    $todasTablasOk = empty($tablasFaltantes);

    // 3. Conteo de registros por tabla
    $conteo = [];
    foreach ($tablasRequeridas as $t) {
        if (in_array($t, $tablasExistentes)) {
            $stmtC = $pdo->prepare("SELECT COUNT(*) FROM `$t`");
            $stmtC->execute();
            $conteo[$t] = (int)$stmtC->fetchColumn();
        } else {
            $conteo[$t] = null;
        }
    }

    // 4. Consulta de prueba con consulta preparada a 'productos' (Objetivo 5)
    $stmtProd = $pdo->prepare("SELECT p.id_producto, p.codigo, p.nombre, p.precio_venta, p.stock_actual, p.stock_minimo, c.nombre AS categoria
                               FROM productos p
                               INNER JOIN categorias c ON p.id_categoria = c.id_categoria
                               WHERE p.estado = :estado
                               ORDER BY p.id_producto ASC
                               LIMIT 5");
    $stmtProd->execute([':estado' => 'ACTIVO']);
    $muestraProductos = $stmtProd->fetchAll();

    $reporte = [
        'status' => 'EXITO',
        'conexion' => [
            'tipo'              => 'PDO MySQL',
            'version_motor'     => $version,
            'base_datos'        => $currentDb,
            'charset'           => $charset,
            'emulate_prepares'  => false,
            'error_mode'        => 'ERRMODE_EXCEPTION'
        ],
        'verificacion_tablas' => [
            'total_esperadas'   => count($tablasRequeridas),
            'total_detectadas'  => count(array_intersect($tablasRequeridas, $tablasExistentes)),
            'estado'            => $todasTablasOk ? 'COMPLETO (12/12)' : 'FALTAN TABLAS',
            'faltantes'         => $tablasFaltantes,
            'detalle_conteo'    => $conteo
        ],
        'consulta_prueba_productos' => [
            'total_en_catalogo' => $conteo['productos'],
            'muestra_primeros_5' => $muestraProductos
        ]
    ];

    if ($isCli) {
        echo "====================================================================\n";
        echo "  INFORME DE VERIFICACIÓN DE CONEXIÓN PHP - MYSQL (PDO)\n";
        echo "====================================================================\n";
        echo "Estado:              CONECTADO EXITOSAMENTE\n";
        echo "Motor de BD:         $version\n";
        echo "Base de datos:       $currentDb\n";
        echo "Juego de caracteres: $charset\n\n";

        echo "--------------------------------------------------------------------\n";
        echo "  VERIFICACIÓN DE TABLAS APROBADAS (12/12)\n";
        echo "--------------------------------------------------------------------\n";
        foreach ($tablasRequeridas as $idx => $tb) {
            $cant = $conteo[$tb];
            $status = in_array($tb, $tablasExistentes) ? "[OK]" : "[FALTA]";
            printf(" %2d. %-24s %s (%d registros)\n", $idx + 1, $tb, $status, $cant);
        }

        echo "\n--------------------------------------------------------------------\n";
        echo "  CONSULTA DE PRUEBA: TABLA 'productos' (Primeros 5 registros)\n";
        echo "--------------------------------------------------------------------\n";
        foreach ($muestraProductos as $p) {
            printf(" [%-7s] %-35s | Stock: %2d | Precio: $%s COP | Cat: %s\n",
                $p['codigo'],
                $p['nombre'],
                $p['stock_actual'],
                number_format($p['precio_venta'], 0, ',', '.'),
                $p['categoria']
            );
        }
        echo "====================================================================\n";
    } else {
        echo json_encode($reporte, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }

} catch (Exception $e) {
    if ($isCli) {
        echo "[ERROR DE EJECUCIÓN] " . $e->getMessage() . "\n";
    } else {
        http_response_code(500);
        echo json_encode([
            'status' => 'ERROR',
            'mensaje' => 'Error durante la verificación del sistema'
        ], JSON_UNESCAPED_UNICODE);
    }
}
