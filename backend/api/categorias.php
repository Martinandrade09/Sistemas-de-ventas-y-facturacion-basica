<?php
require_once __DIR__ . '/../config/Response.php';
require_once __DIR__ . '/../controllers/ProductoController.php';

Response::initCors();

$controller = new ProductoController();
$controller->categorias();

