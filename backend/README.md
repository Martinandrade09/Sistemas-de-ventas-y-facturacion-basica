# Backend API REST - Sistema de Ventas y Facturación Básica
**Sprint 2: Backend y Base de Datos (PHP 8.2+ / MySQL - MariaDB)**

Servidor local en XAMPP:
- **Apache:** `http://localhost:3008/sistema-ventas/`
- **URL Base API:** `http://localhost:3008/sistema-ventas/api`
- **MySQL / MariaDB:** Puerto `3308`
- **Base de datos:** `sistema_ventas`

---

## 🔐 Arquitectura de Autenticación y Autorización (RBAC)

El backend implementa autenticación basada en **sesiones nativas de PHP del lado del servidor** y **control de acceso basado en roles (RBAC)** estricto en cada controlador:

1. **Gestión de Sesión:**
   - Cookie segura de sesión: `SISTEMA_VENTAS_SESS`.
   - Atributos de cookie: `HttpOnly = true` (inmune a robo de token vía XSS), `SameSite = 'Lax'`, `Secure = true` (activado dinámicamente si la conexión es HTTPS).
   - Regeneración de identificador de sesión (`session_regenerate_id(true)`) al autenticarse para prevenir ataques de fijación de sesión.
   - Invalidación y destrucción completa de cookies y datos de sesión en logout.
   - Eliminación total de tokens Base64 sin firma.

2. **Seguridad contra Spoofing de Identidad:**
   - Ningún controlador confía en identificadores de usuario (`id_usuario`, `id_vendedor`, `id_cajero`) enviados en el payload o query string por el cliente.
   - La identidad del usuario autenticado se extrae obligatoriamente de la sesión del servidor mediante `Auth::id()` y `Auth::role()`.

3. **Matriz de Permisos RBAC en Backend:**

| Módulo / Acción | Endpoint | Roles Permitidos | Código si Rol no Autorizado |
|---|---|---|---|
| **Iniciar Sesión** | `POST /api/auth.php?action=login` | Público | 401 si credencial inválida |
| **Cerrar Sesión** | `POST /api/auth.php?action=logout` | Autenticado | 200 OK |
| **Consultar Sesión** | `GET /api/auth.php?action=me` | Autenticado | 401 No autenticado |
| **Listar Usuarios** | `GET /api/auth.php?action=usuarios` | `ADMINISTRADOR` | 403 Forbidden |
| **Consultar Catálogo** | `GET /api/productos.php` | Autenticado | 401 No autenticado |
| **Detalle de Producto** | `GET /api/productos.php?id={id}` | Autenticado | 401 No autenticado |
| **Categorías** | `GET /api/categorias.php` | Autenticado | 401 No autenticado |
| **Crear/Editar/Eliminar Producto** | `POST/PUT/DELETE /api/productos.php` | `ADMINISTRADOR` | 403 Forbidden |
| **Ajuste de Stock / Kardex** | `POST /api/productos.php?action=ajuste_stock` / `kardex` | `ADMINISTRADOR` | 403 Forbidden |
| **Listar / Ver Clientes** | `GET /api/clientes.php` | Autenticado | 401 No autenticado |
| **Crear / Editar Clientes** | `POST/PUT /api/clientes.php` | `ADMINISTRADOR`, `VENDEDOR`, `CAJERO` | 403 Forbidden |
| **Desactivar Cliente** | `DELETE /api/clientes.php?id={id}` | `ADMINISTRADOR` | 403 Forbidden |
| **Caja (Apertura, Cierre, Arqueo, Mov.)** | `GET/POST /api/caja.php` | `ADMINISTRADOR`, `CAJERO` (aislado por usuario) | 403 Forbidden |
| **Listar Ventas** | `GET /api/ventas.php` | Autenticado (Vendedor filtrado a sus propias ventas) | 401 No autenticado |
| **Crear Venta (Borrador)** | `POST /api/ventas.php?action=crear` | `ADMINISTRADOR`, `VENDEDOR` (`id_vendedor` inyectado) | 403 Forbidden |
| **Pagar / Cobrar Venta** | `POST /api/ventas.php?action=pagar&id={id}` | `ADMINISTRADOR`, `CAJERO` (`id_cajero` inyectado) | 403 Forbidden |
| **Anular Venta** | `POST /api/ventas.php?action=anular&id={id}` | `ADMINISTRADOR` | 403 Forbidden |

---

## 🚀 Endpoints de la API

### 1. Autenticación (`/api/auth.php`)

- **Login:** `POST /api/auth.php?action=login`
  - Headers: `Content-Type: application/json`
  - Body: `{"usuario": "admin_test", "password": "..."}`
  - Respuesta exitosa (HTTP 200 + Cookie `SISTEMA_VENTAS_SESS`):
    ```json
    {
      "success": true,
      "message": "Inicio de sesión exitoso",
      "data": {
        "usuario": {
          "id_usuario": 1,
          "usuario": "admin_test",
          "id_rol": 1,
          "rol_nombre": "ADMINISTRADOR",
          "estado": "ACTIVO"
        },
        "csrf_token": "..."
      }
    }
    ```
  - Error por credenciales (HTTP 401):
    ```json
    {
      "success": false,
      "message": "Credenciales de acceso inválidas",
      "error": null
    }
    ```

- **Verificar Sesión:** `GET /api/auth.php?action=me`
  - Retorna los datos del usuario en sesión activa y token CSRF. Retorna HTTP 401 si la sesión no existe o expiró.

- **Logout:** `POST /api/auth.php?action=logout`
  - Destruye la sesión en el servidor e invalida la cookie del navegador.

- **Listar Usuarios (Solo Administrador):** `GET /api/auth.php?action=usuarios`
  - Retorna usuarios registrados con rol y estado (sin exponer hashes de contraseña).

---

### 2. Clientes (`/api/clientes.php`)
- `GET /api/clientes.php` (Listar clientes, soporta `?buscar=termino&estado=ACTIVO`)
- `GET /api/clientes.php?id={id}` (Detalle del cliente)
- `POST /api/clientes.php` (Crear cliente - Requiere Admin, Vendedor o Cajero)
  - Body: `{"identificacion": "12345678", "nombres": "Juan", "apellidos": "Pérez", "telefono": "3001234567", "correo": "juan@email.com", "direccion": "Calle 1"}`
- `PUT /api/clientes.php?id={id}` (Actualizar cliente)
- `DELETE /api/clientes.php?id={id}` (Desactivar cliente - Requiere Administrador)

---

### 3. Productos e Inventario (`/api/productos.php` y `/api/categorias.php`)
- `GET /api/productos.php` (Listar catálogo, soporta `?buscar=&categoria=&estado=&critico=true`)
- `GET /api/productos.php?id={id}` (Detalle de un producto)
- `POST /api/productos.php` (Crear producto con precio > 0 - Solo Administrador)
- `PUT /api/productos.php?id={id}` (Actualizar producto - Solo Administrador)
- `DELETE /api/productos.php?id={id}` (Desactivar producto - Solo Administrador)
- `POST /api/productos.php?action=ajuste_stock` (Ajuste o Entrada manual - Solo Administrador)
  - Body: `{"id_producto": 1, "cantidad": 5, "tipo": "ENTRADA", "motivo": "Reabastecimiento mayorista"}`
  - *Nota: `id_usuario` se toma automáticamente de la sesión.*
- `GET /api/productos.php?action=kardex&id={id}` (Historial de movimientos de inventario - Solo Administrador)
- `GET /api/categorias.php` (Listar categorías activas)

---

### 4. Caja y Arqueo Ciego (`/api/caja.php`)
- `GET /api/caja.php?action=activa` (Obtener caja abierta y arqueo en vivo del usuario en sesión)
- `POST /api/caja.php?action=abrir` (Apertura de caja)
  - Body: `{"saldo_inicial": 200000}`
  - *Nota: `id_usuario` se inyecta desde la sesión.*
- `POST /api/caja.php?action=cerrar&id={id_caja}` (Cierre con Arqueo Ciego)
  - Body: `{"monto_fisico_contado": 550000}`
- `GET /api/caja.php?action=arqueo&id={id_caja}` (Cálculo detallado de efectivo y transferencias)
- `GET /api/caja.php?action=movimientos&id={id_caja}` (Historial de movimientos de la sesión)
- `POST /api/caja.php?action=movimiento&id={id_caja}` (Registro manual de INGRESO o EGRESO)

---

### 5. Ventas y Facturación Atómica (`/api/ventas.php`)
- `GET /api/ventas.php` (Listar ventas: Vendedor solo ve las propias; Administrador y Cajero ven todas)
- `GET /api/ventas.php?id={id}` (Detalle completo con items, pago y comprobante)
- `POST /api/ventas.php?action=crear` (Crea venta PENDIENTE - Requiere Administrador o Vendedor)
  - Body: `{"id_cliente": 1, "items": [{"id_producto": 1, "cantidad": 1}]}`
  - *Nota: `id_vendedor` se inyecta desde la sesión del usuario autenticado.*
- `POST /api/ventas.php?action=pagar&id={id_venta}` (Cobro atómico ACID - Requiere Administrador o Cajero)
  - Body Efectivo: `{"metodo": "EFECTIVO"}`
  - Body Transferencia: `{"metodo": "TRANSFERENCIA", "referencia": "TRANSF-NEQUI-9821"}`
  - *Nota: `id_cajero` se toma directamente de la sesión del usuario autenticado.*
  - Acciones atómicas: descuenta stock, inserta movimiento de inventario, registra pago, asienta ingreso en caja, emite comprobante único correlativo `COMP-XXXXXX` y cambia estado a `PAGADA`.
- `POST /api/ventas.php?action=anular&id={id_venta}` (Anulación y reversión atómica - Solo Administrador)
  - Body: `{"motivo_anulacion": "Garantía cliente"}`
  - *Nota: `id_usuario` que anula se toma de la sesión.*
  - Acciones atómicas: revierte el stock al inventario, genera movimiento de reposición en Kardex, registra egreso/devolución en caja vinculada al pago, anula el comprobante y cambia venta a `ANULADA`.

---

## 🧪 Pruebas Automatizadas

1. **Suite de Integración de Base de Datos (41 pruebas):**
   ```bash
   php backend/tests/integration_test.php
   ```
2. **Suite de Autenticación y RBAC vía HTTP (19 pruebas):**
   ```bash
   php backend/tests/test_auth_rbac_http.php
   ```
