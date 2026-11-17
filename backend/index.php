<?php
require_once __DIR__ . '/config/Response.php';
require_once __DIR__ . '/config/Database.php';

Response::initCors();

try {
    $pdo = Database::getConnection();
    Response::json(true, 'API de Sistema de Ventas y Facturación Básica funcionando correctamente', [
        'ambiente' => 'Desarrollo (Sprint 2)',
        'puerto_apache' => 3008,
        'puerto_mysql' => 3308,
        'base_datos' => 'sistema_ventas',
        'modulos' => ['clientes', 'productos', 'caja', 'ventas', 'auth']
    ]);
} catch (Exception $e) {
    Response::error('Error de inicialización del API', $e->getMessage(), 500);
}

