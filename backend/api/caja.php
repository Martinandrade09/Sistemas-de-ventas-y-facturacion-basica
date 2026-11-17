<?php
require_once __DIR__ . '/../config/Response.php';
require_once __DIR__ . '/../controllers/CajaController.php';

Response::initCors();

$controller = new CajaController();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'activa';
$idCaja = isset($_GET['id']) ? (int)$_GET['id'] : null;
$idUsuario = isset($_GET['usuario']) ? (int)$_GET['usuario'] : 2; // Por defecto Cajero (id 2)

switch ($method) {
    case 'GET':
        if ($action === 'activa') {
            $controller->getCajaActiva($idUsuario);
        } elseif ($action === 'arqueo' && $idCaja) {
            $controller->arqueo($idCaja);
        } elseif ($action === 'movimientos' && $idCaja) {
            $controller->movimientos($idCaja);
        } else {
            Response::error('Acción GET no reconocida o falta parámetro id', null, 400);
        }
        break;

    case 'POST':
        if ($action === 'abrir') {
            $controller->abrir();
        } elseif ($action === 'cerrar' && $idCaja) {
            $controller->cerrar($idCaja);
        } elseif ($action === 'movimiento' && $idCaja) {
            $controller->nuevoMovimiento($idCaja);
        } else {
            Response::error('Acción POST no reconocida o falta parámetro id', null, 400);
        }
        break;

    default:
        Response::error('Método HTTP no permitido', null, 405);
        break;
}

