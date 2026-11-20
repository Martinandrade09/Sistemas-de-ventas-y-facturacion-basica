import { AdminNotification, CashSession, Sale } from '../types';

const formatCurrentTime = (): string => {
  return new Date().toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const buildInitialNotifications = (
  sales: Sale[],
  cashSession: CashSession
): AdminNotification[] => {
  const notifications: AdminNotification[] = [];

  if (cashSession.status === 'ABIERTA') {
    const expectedCash =
      cashSession.openingBalance +
      cashSession.totalSalesCash -
      cashSession.totalOutflows -
      cashSession.totalRefunds;

    notifications.push({
      id: `notif-caja-pendiente-${cashSession.id}`,
      category: 'CAJA_CIERRE',
      severity: 'warning',
      title: `Cierre de caja pendiente · ${cashSession.registerNumber}`,
      message: `${cashSession.turnName} a cargo de ${cashSession.cashier} sigue abierto desde las ${cashSession.openingTime}. Saldo físico esperado en gaveta: $${expectedCash.toLocaleString('es-CO')} COP.`,
      timestamp: 'Hoy · 18:00 prog.',
      read: false,
      actionType: 'OPEN_ARQUEO',
      actionLabel: 'Ejecutar Arqueo y Cierre',
      meta: `Cajero ${cashSession.cashier}`,
    });
  }

  const voidedSales = sales.filter((s) => s.status === 'ANULADA');
  voidedSales.forEach((sale) => {
    notifications.push({
      id: `notif-void-init-${sale.id}`,
      category: 'VENTA_ANULADA',
      severity: 'critical',
      title: `Venta anulada · ${sale.correlativeNumber}`,
      message: `Se registró anulación por $${sale.total.toLocaleString('es-CO')} COP (${sale.customer.name}). Motivo: ${sale.cancellationReason || 'Reversión registrada en caja.'}`,
      timestamp: sale.cancellationDate || `${sale.date} ${sale.time}`,
      read: false,
      actionType: 'VIEW_VOUCHER',
      actionLabel: 'Ver Comprobante',
      saleId: sale.id,
      meta: sale.cancellationUser || 'Administración',
    });
  });

  const pendingSales = sales.filter((s) => s.status === 'PENDIENTE');
  if (pendingSales.length > 0) {
    const pendingTotal = pendingSales.reduce((sum, s) => sum + s.total, 0);
    notifications.push({
      id: 'notif-pending-sales-init',
      category: 'COBRO_PENDIENTE',
      severity: 'info',
      title: `${pendingSales.length} venta(s) pendiente(s) de cobro en caja`,
      message: `Órdenes emitidas desde mostrador por un total de $${pendingTotal.toLocaleString('es-CO')} COP esperan validación de pago para descontar inventario.`,
      timestamp: 'En cola de caja',
      read: false,
      actionType: 'NAVIGATE',
      actionTab: 'control-de-caja',
      actionLabel: 'Ir a Control de Caja',
      meta: `${pendingSales.length} órdenes activas`,
    });
  }

  return notifications;
};

export const createSaleCreatedNotification = (sale: Sale): AdminNotification => ({
  id: `notif-sale-created-${sale.id}-${Date.now()}`,
  category: 'COBRO_PENDIENTE',
  severity: 'info',
  title: `Nueva orden pendiente · ${sale.correlativeNumber}`,
  message: `Venta por $${sale.total.toLocaleString('es-CO')} COP para ${sale.customer.name} enviada a cola de cobranza en estado PENDIENTE.`,
  timestamp: `Hoy · ${formatCurrentTime()}`,
  read: false,
  actionType: 'NAVIGATE',
  actionTab: 'control-de-caja',
  actionLabel: 'Cobrar en Caja',
  saleId: sale.id,
  meta: sale.vendorName,
});

export const createSalePaidNotification = (
  sale: Sale,
  method: 'EFECTIVO' | 'TRANSFERENCIA',
  cashierName: string
): AdminNotification => ({
  id: `notif-sale-paid-${sale.id}-${Date.now()}`,
  category: 'VENTA_ESTADO',
  severity: 'success',
  title: `Cambio de estado: PENDIENTE → PAGADA (${sale.correlativeNumber})`,
  message: `Cobro confirmado por $${sale.total.toLocaleString('es-CO')} COP vía ${method} (${sale.customer.name}). Inventario descontado y comprobante ${sale.voucherNumber} emitido.`,
  timestamp: `Hoy · ${formatCurrentTime()}`,
  read: false,
  actionType: 'VIEW_VOUCHER',
  actionLabel: 'Ver Comprobante',
  saleId: sale.id,
  meta: `Cajero: ${cashierName}`,
});

export const createSaleVoidedNotification = (
  sale: Sale,
  reason: string,
  userName: string,
  wasPaid: boolean
): AdminNotification => ({
  id: `notif-sale-void-${sale.id}-${Date.now()}`,
  category: 'VENTA_ANULADA',
  severity: 'critical',
  title: `Cambio de estado crítico: ANULADA (${sale.correlativeNumber})`,
  message: `${sale.correlativeNumber} por $${sale.total.toLocaleString('es-CO')} COP fue anulada (${wasPaid ? 'stock y reembolso en caja revertidos' : 'orden pendiente cancelada'}). Motivo: "${reason}".`,
  timestamp: `Hoy · ${formatCurrentTime()}`,
  read: false,
  actionType: 'VIEW_VOUCHER',
  actionLabel: 'Ver Comprobante Anulado',
  saleId: sale.id,
  meta: `Autorizado por: ${userName}`,
});

export const createCashClosingNotification = (
  session: CashSession,
  difference: number,
  countedTotal: number,
  userName: string
): AdminNotification => {
  const isBalanced = difference === 0;
  const isSurplus = difference > 0;

  return {
    id: `notif-cash-close-${session.id}-${Date.now()}`,
    category: 'CAJA_CIERRE',
    severity: isBalanced ? 'success' : isSurplus ? 'warning' : 'critical',
    title: isBalanced
      ? `Cierre de caja completado · ${session.registerNumber}`
      : isSurplus
      ? `Cierre de caja con sobrante · ${session.registerNumber}`
      : `Alerta de cierre: Faltante en ${session.registerNumber}`,
    message: isBalanced
      ? `Arqueo ciego conciliado sin diferencias ($${countedTotal.toLocaleString('es-CO')} COP). Turno cerrado correctamente.`
      : isSurplus
      ? `Arqueo cerrado con sobrante de +$${difference.toLocaleString('es-CO')} COP sobre el saldo teórico (contado: $${countedTotal.toLocaleString('es-CO')} COP).`
      : `Arqueo cerrado con faltante de -$${Math.abs(difference).toLocaleString('es-CO')} COP respecto al saldo teórico (contado: $${countedTotal.toLocaleString('es-CO')} COP). Requiere revisión.`,
    timestamp: `Hoy · ${formatCurrentTime()}`,
    read: false,
    actionType: 'NAVIGATE',
    actionTab: 'reportes-gestion',
    actionLabel: 'Ver Arqueos en Reportes',
    meta: `Responsable: ${userName}`,
  };
};
