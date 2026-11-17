<?php
/**
 * Genera hashes Bcrypt para los 3 usuarios de prueba del sprint.
 * Las contraseñas de prueba están definidas aquí SOLO para uso local.
 * Este script NO se sube al repositorio (ver .gitignore).
 *
 * Uso: php backend/scripts/regenerar_hashes_seed.php
 */

// ── Contraseñas de prueba para el entorno de desarrollo ──────────────────────
// IMPORTANTE: Cambiar TODAS en el primer despliegue a producción.
// Requisitos: mínimo 10 chars, mayúscula, minúscula, dígito y símbolo.
$credenciales = [
    'admin_test'    => 'SvAdmin2024!',
    'cajero_test'   => 'SvCajero2024!',
    'vendedor_test' => 'SvVendedor2024!',
];

echo "=== Generación de hashes Bcrypt para seed.sql ===" . PHP_EOL;
echo "    cost factor: 12 | algoritmo: PASSWORD_BCRYPT" . PHP_EOL;
echo PHP_EOL;

$salida = [];
foreach ($credenciales as $usuario => $password) {
    $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    $ok   = password_verify($password, $hash);
    $salida[$usuario] = $hash;

    echo "Usuario : {$usuario}" . PHP_EOL;
    echo "Hash    : {$hash}" . PHP_EOL;
    echo "Verifica: " . ($ok ? "TRUE ✓" : "FALSE ✗") . PHP_EOL;
    echo PHP_EOL;
}

// Guarda las contraseñas en un archivo local NO versionado
$archivoLocal = __DIR__ . '/../../.test_credentials.local';
$contenido  = "# Credenciales de prueba — Solo entorno local — NO subir a Git\n";
$contenido .= "# Generado: " . date('Y-m-d H:i:s') . "\n";
foreach ($credenciales as $usuario => $password) {
    $contenido .= "{$usuario}=CREDENCIAL_LOCAL\n"; // No escribir la clave en texto plano
}
file_put_contents($archivoLocal, $contenido);
echo "Archivo local de credenciales: .test_credentials.local (gitignored)" . PHP_EOL;

// Guarda los hashes para actualizar seed.sql
$archivoHashes = __DIR__ . '/hashes_nuevos.local.json';
file_put_contents($archivoHashes, json_encode($salida, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
echo "Hashes guardados en: backend/scripts/hashes_nuevos.local.json (gitignored)" . PHP_EOL;
echo PHP_EOL . "=== Listo ===" . PHP_EOL;
