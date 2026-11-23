<?php
require_once __DIR__ . '/../config/Response.php';
require_once __DIR__ . '/../controllers/AuthController.php';

Response::initCors();

$controller = new AuthController();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? ($method === 'POST' ? 'login' : 'me');

switch ($method) {
    case 'POST':
        if ($action === 'login') {
            $controller->login();
        } elseif ($action === 'logout') {
            $controller->logout();
        } else {
            Response::error('Acción POST no reconocida', null, 400);
        }
        break;

    case 'GET':
        if ($action === 'me' || $action === 'check' || $action === 'session') {
            $controller->me();
        } elseif ($action === 'usuarios') {
            $controller->usuarios();
        } else {
            Response::error('Acción GET no válida', null, 400);
        }
        break;

    default:
        Response::error('Método HTTP no permitido', null, 405);
        break;
}
