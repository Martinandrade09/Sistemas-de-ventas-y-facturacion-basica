import { Role } from '../types';

/**
 * ============================================================
 *  PERMISOS CENTRALIZADOS POR ROL — Single Source of Truth
 * ============================================================
 *
 * Este módulo define qué pestañas y qué acciones puede ejecutar
 * cada rol en el sistema. Aplica únicamente control de acceso
 * VISUAL (modo demostración). No reemplaza autenticación real
 * del servidor.
 *
 * Para agregar un permiso: editar ROLE_TABS o ROLE_ACTIONS aquí.
 * No distribuir lógica de acceso en los componentes.
 */

// IDs exactos de las pestañas definidas en App.tsx
export const ROLE_TABS: Record<Role, string[]> = {
  admin: [
    'panel-general',
    'punto-de-venta',
    'control-de-caja',
    'catalogo-inventario',
    'reportes-gestion',
  ],
  cajero: [
    'panel-general',
    'punto-de-venta',
    'control-de-caja',
  ],
  vendedor: [
    'punto-de-venta',
  ],
};

// Acciones discretas verificadas individualmente en componentes
export const ROLE_ACTIONS: Record<Role, string[]> = {
  admin: [
    'adjust_stock',         // Ajuste / entrada de stock (InventoryView)
    'void_sale',            // Anular ventas (ReportsView)
    'view_admin_notifs',    // Panel de notificaciones administrativas (DashboardView)
    'cash_closing',         // Arqueo y cierre de caja (CashRegisterView / DashboardView)
  ],
  cajero: [
    'cash_closing',         // El cajero puede ejecutar el arqueo de su turno
  ],
  vendedor: [],
};

/** Verifica si un rol puede ver una pestaña */
export const canAccessTab = (role: Role, tabId: string): boolean =>
  ROLE_TABS[role].includes(tabId);

/** Verifica si un rol puede ejecutar una acción discreta */
export const can = (role: Role, action: string): boolean =>
  ROLE_ACTIONS[role].includes(action);

/** Retorna el primer tab permitido para un rol (tab de entrada tras login) */
export const getDefaultTab = (role: Role): string =>
  ROLE_TABS[role][0] ?? 'punto-de-venta';

/** Etiqueta legible del rol para mostrar en UI */
export const ROLE_LABELS: Record<Role, string> = {
  admin:    'Administrador',
  cajero:   'Cajero Operativo',
  vendedor: 'Vendedor de Mostrador',
};
