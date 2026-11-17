<?php
require_once __DIR__ . '/../config/Response.php';
require_once __DIR__ . '/../controllers/ProductoController.php';

Response::initCors();

$controller = new ProductoController();
$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;
$action = $_GET['action'] ?? null;

switch ($method) {
    case 'GET':
        if ($action === 'kardex' && $id) {
            $controller->kardex($id);
        } elseif ($id) {
            $controller->show($id);
        } else {
            $controller->index();
        }
        break;

    case 'POST':
        if ($action === 'ajuste_stock') {
            $controller->ajustarStock();
        } else {
            $controller->store();
        }
        break;

    case 'PUT':
        if (!$id) {
            Response::error('Parámetro id requerido para actualizar', null, 400);
        }
        $controller->update($id);
        break;

    case 'DELETE':
        if (!$id) {
            Response::error('Parámetro id requerido para desactivar', null, 400);
        }
        $controller->destroy($id);
        break;

    default:
        Response::error('Método HTTP no permitido', null, 405);
        break;
}

