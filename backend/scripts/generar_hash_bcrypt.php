<?php
// Ejecutar en terminal: php generar_hash_bcrypt.php
// No subas contrasenas ni hashes de demostracion a un repositorio publico.
if (PHP_SAPI !== 'cli') { exit("Solo terminal.\n"); }
$usuario = readline("Usuario a actualizar: ");
$contrasena = readline("Nueva contrasena (sera visible al escribir): ");
if (strlen($contrasena) < 12) { exit("Usa al menos 12 caracteres.\n"); }
$hash = password_hash($contrasena, PASSWORD_BCRYPT);
echo "Hash Bcrypt:\n" . $hash . "\n";
echo "En MySQL ejecuta una consulta preparada: UPDATE usuarios SET password_hash = ? WHERE usuario = ?;\n";
// Nunca guardar la contrasena en texto plano.

