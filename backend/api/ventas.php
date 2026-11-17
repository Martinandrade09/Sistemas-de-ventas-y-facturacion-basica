<?php
require_once __DIR__ . '/../config/Response.php';
require_once __DIR__ . '/../controllers/VentaController.php';

Response::initCors();

$controller = new VentaController();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

switch ($method) {
    case 'GET':
        if ($id) {
            $controller->show($id);
        } else {
            $controller->index();
        }
        break;

    case 'POST':
        if ($action === 'crear' || !$action) {
            $controller->crear();
        } elseif ($action === 'pagar' && $id) {
            $controller->pagar($id);
        } elseif ($action === 'anular' && $id) {
            $controller->anular($id);
        } else {
            Response::error('Acción POST no reconocida o falta parámetro id', null, 400);
        }
        break;

    default:
        Response::error('Método HTTP no permitido', null, 405);
        break;
}

