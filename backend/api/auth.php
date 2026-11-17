<?php
require_once __DIR__ . '/../config/Response.php';
require_once __DIR__ . '/../controllers/AuthController.php';

Response::initCors();

$controller = new AuthController();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'login';

switch ($method) {
    case 'POST':
        if ($action === 'login') {
            $controller->login();
        } else {
            Response::error('Acción POST no reconocida', null, 400);
        }
        break;

    case 'GET':
        if ($action === 'usuarios') {
            $controller->usuarios();
        } else {
            Response::error('Acción GET no válida', null, 400);
        }
        break;

    default:
        Response::error('Método HTTP no permitido', null, 405);
        break;
}

