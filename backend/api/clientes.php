<?php
require_once __DIR__ . '/../config/Response.php';
require_once __DIR__ . '/../controllers/ClienteController.php';

Response::initCors();

$controller = new ClienteController();
$method = $_SERVER['REQUEST_METHOD'];
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
        $controller->store();
        break;

    case 'PUT':
        if (!$id) {
            Response::error('Parámetro id requerido para actualizar', null, 400);
        }
        $controller->update($id);
        break;

    case 'DELETE':
        if (!$id) {
            Response::error('Parámetro id requerido para eliminar/desactivar', null, 400);
        }
        $controller->destroy($id);
        break;

    default:
        Response::error('Método HTTP no permitido', null, 405);
        break;
}

