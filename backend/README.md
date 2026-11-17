# Backend API REST - Sistema de Ventas y Facturación Básica
**Sprint 2: Backend y Base de Datos (PHP 8.2+ / MySQL - MariaDB)**

Servidor local en XAMPP:
- **Apache:** `http://localhost:3008/sistema-ventas/`
- **MySQL / MariaDB:** Puerto `3308`
- **Base de datos:** `sistema_ventas`

---

## 🚀 Endpoints Principales

### 1. Autenticación (`/api/auth.php`)
- `POST /api/auth.php?action=login`
  - Body: `{"usuario": "carlos.admin", "password": "admin123"}`
  - Usuarios disponibles: `carlos.admin` (Admin), `andres.cajero` (Cajero), `laura.vendedora` (Vendedora). Password: `admin123`
- `GET /api/auth.php?action=usuarios`

### 2. Clientes (`/api/clientes.php`)
- `GET /api/clientes.php` (Listar clientes, soporta `?buscar=termino&estado=ACTIVO`)
- `GET /api/clientes.php?id={id}` (Detalle del cliente)
- `POST /api/clientes.php` (Crear cliente)
  - Body: `{"identificacion": "12345678", "nombres": "Juan", "apellidos": "Pérez", "telefono": "3001234567", "correo": "juan@email.com", "direccion": "Calle 1"}`
- `PUT /api/clientes.php?id={id}` (Actualizar cliente)
- `DELETE /api/clientes.php?id={id}` (Desactivar cliente)

### 3. Productos e Inventario (`/api/productos.php` y `/api/categorias.php`)
- `GET /api/productos.php` (Listar catálogo, soporta `?buscar=&categoria=&estado=&critico=true`)
- `GET /api/productos.php?id={id}` (Detalle de un producto)
- `POST /api/productos.php` (Crear producto con precio > 0)
- `PUT /api/productos.php?id={id}` (Actualizar producto)
- `DELETE /api/productos.php?id={id}` (Desactivar producto)
- `POST /api/productos.php?action=ajuste_stock` (Ajuste o Entrada manual)
  - Body: `{"id_producto": 1, "id_usuario": 1, "cantidad": 5, "tipo": "ENTRADA", "motivo": "Compra mayorista"}`
- `GET /api/productos.php?action=kardex&id={id}` (Historial de movimientos de inventario)
- `GET /api/categorias.php` (Listar categorías activas)

### 4. Caja y Arqueo Ciego (`/api/caja.php`)
- `GET /api/caja.php?action=activa&usuario={id_usuario}` (Obtener caja abierta y arqueo en vivo)
- `POST /api/caja.php?action=abrir` (Apertura de caja)
  - Body: `{"id_usuario": 2, "saldo_inicial": 200000}`
- `POST /api/caja.php?action=cerrar&id={id_caja}` (Cierre con Arqueo Ciego)
  - Body: `{"monto_fisico_contado": 550000}`
- `GET /api/caja.php?action=arqueo&id={id_caja}` (Cálculo detallado de efectivo y transferencias)
- `GET /api/caja.php?action=movimientos&id={id_caja}` (Historial de movimientos de la sesión)
- `POST /api/caja.php?action=movimiento&id={id_caja}` (Registro manual de INGRESO o EGRESO)

### 5. Ventas y Facturación Atómica (`/api/ventas.php`)
- `GET /api/ventas.php` (Listar ventas con filtros `?estado=&fecha=&vendedor=`)
- `GET /api/ventas.php?id={id}` (Detalle completo con items, pago y comprobante)
- `POST /api/ventas.php?action=crear` (Crea venta PENDIENTE con >= 1 item, cálculo de totales en servidor)
  - Body: `{"id_cliente": 1, "id_vendedor": 3, "items": [{"id_producto": 1, "cantidad": 1}]}`
- `POST /api/ventas.php?action=pagar&id={id_venta}` (Cobro atómico ACID)
  - Body Efectivo: `{"id_cajero": 2, "metodo": "EFECTIVO"}`
  - Body Transferencia: `{"id_cajero": 2, "metodo": "TRANSFERENCIA", "referencia": "TRANSF-NEQUI-9821"}`
  - Acciones atómicas: descuenta stock, inserta movimiento de inventario, registra pago, asienta ingreso en caja, emite comprobante único correlativo `COMP-XXXXXX` y cambia estado a `PAGADA`.
- `POST /api/ventas.php?action=anular&id={id_venta}` (Anulación y reversión atómica)
  - Body: `{"id_usuario": 1, "motivo_anulacion": "Devolución por garantía del cliente"}`
  - Acciones atómicas: revierte el stock al inventario, genera movimiento de reposición en Kardex, registra egreso/devolución en caja vinculada al pago, anula el comprobante y cambia venta a `ANULADA`.

