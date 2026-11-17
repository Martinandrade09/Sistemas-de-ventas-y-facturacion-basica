<?php
require_once __DIR__ . '/../config/Database.php';

try {
    $pdo = Database::getConnection();
    $sql = file_get_contents(__DIR__ . '/seeds.sql');
    $pdo->exec($sql);
    echo "Seeds executed successfully!\n";
} catch (Exception $e) {
    echo "Error executing seeds: " . $e->getMessage() . "\n";
}

