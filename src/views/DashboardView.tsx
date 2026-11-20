import React, { useMemo, useEffect, useRef, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';
import { Sale, Product, CashSession, User, AdminNotification } from '../types';
import { can } from '../auth/permissions';

interface DashboardViewProps {
  sales: Sale[];
  products: Product[];
  cashSession: CashSession;
  currentUser: User;
  notifications: AdminNotification[];
  onNavigate: (tab: string) => void;
  onViewVoucher: (sale: Sale) => void;
  onPaySale: (sale: Sale) => void;
  onOpenStockModal: (productId?: number) => void;
  onOpenCashClosingModal: () => void;
  onMarkNotificationRead: (id: string) => void;
  onMarkAllNotificationsRead: () => void;
  onDismissNotification: (id: string) => void;
  onToast: (msg: string, isError?: boolean) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  sales,
  products,
  cashSession,
  currentUser,
  notifications,
  onNavigate,
  onViewVoucher,
  onPaySale,
  onOpenStockModal,
  onOpenCashClosingModal,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onDismissNotification,
  onToast,
}) => {
  const CRITICAL_THRESHOLD = 5;

  const criticalProducts = useMemo(
    () =>
      products
        .filter((p) => p.currentStock < CRITICAL_THRESHOLD)
        .sort((a, b) => a.currentStock - b.currentStock),
    [products]
  );

  const [alertDismissed, setAlertDismissed] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'ALL' | 'CAJA' | 'VENTAS'>('ALL');
  const [isNotifPanelCollapsed, setIsNotifPanelCollapsed] = useState(false);
  const notifSectionRef = useRef<HTMLDivElement | null>(null);
  const hasMountedToastRef = useRef(false);
  const prevStockMapRef = useRef<Record<number, number>>({});
  const prevNotifIdsRef = useRef<Set<string>>(new Set(notifications.map((n) => n.id)));

  // Notificación automática mediante Toast al detectar productos por debajo de 5 unidades
  useEffect(() => {
    const currentMap: Record<number, number> = {};
    products.forEach((p) => {
      currentMap[p.id] = p.currentStock;
    });

    if (!hasMountedToastRef.current) {
      hasMountedToastRef.current = true;
      prevStockMapRef.current = currentMap;

      if (criticalProducts.length === 1) {
        const p = criticalProducts[0];
        onToast(
          `Alerta crítica de inventario: ${p.name} (${p.code}) tiene solo ${p.currentStock} unidad(es) (< 5).`,
          true
        );
      } else if (criticalProducts.length > 1) {
        const preview = criticalProducts
          .slice(0, 3)
          .map((p) => `${p.code}: ${p.currentStock} unid.`)
          .join(' · ');
        onToast(
          `Alerta crítica (< 5 unid.): ${criticalProducts.length} productos en nivel crítico (${preview}).`,
          true
        );
      }
      return;
    }

    const newlyCritical = products.filter((p) => {
      const prev = prevStockMapRef.current[p.id];
      return (
        p.currentStock < CRITICAL_THRESHOLD &&
        prev !== undefined &&
        (prev >= CRITICAL_THRESHOLD || p.currentStock < prev)
      );
    });

    prevStockMapRef.current = currentMap;

    if (newlyCritical.length > 0) {
      setAlertDismissed(false);
      const first = newlyCritical[0];
      onToast(
        `¡Stock crítico alcanzado! ${first.name} (${first.code}) bajó a ${first.currentStock} unidad(es) (< 5).`,
        true
      );
    }
  }, [products, criticalProducts, onToast]);

  // Servicio de notificación en vivo ante cierres de caja o cambios de estado de ventas
  useEffect(() => {
    const newArrivals = notifications.filter((n) => !prevNotifIdsRef.current.has(n.id));
    prevNotifIdsRef.current = new Set(notifications.map((n) => n.id));

    if (newArrivals.length > 0) {
      const latest = newArrivals[0];
      const isUrgent = latest.severity === 'critical' || latest.severity === 'warning';
      onToast(`${latest.title}: ${latest.message}`, isUrgent);
    }
  }, [notifications, onToast]);

  const unreadNotifCount = notifications.filter((n) => !n.read).length;
  const cashPendingNotifCount = notifications.filter(
    (n) => n.category === 'CAJA_CIERRE' && !n.read
  ).length;
  const saleChangeNotifCount = notifications.filter(
    (n) => n.category !== 'CAJA_CIERRE' && !n.read
  ).length;

  const filteredNotifications = useMemo(() => {
    if (notifFilter === 'CAJA') {
      return notifications.filter((n) => n.category === 'CAJA_CIERRE');
    }
    if (notifFilter === 'VENTAS') {
      return notifications.filter((n) => n.category !== 'CAJA_CIERRE');
    }
    return notifications;
  }, [notifications, notifFilter]);

  const handleNotificationAction = (notif: AdminNotification) => {
    onMarkNotificationRead(notif.id);
    if (notif.actionType === 'OPEN_ARQUEO') {
      onOpenCashClosingModal();
      return;
    }
    if (notif.actionType === 'VIEW_VOUCHER' && notif.saleId) {
      const foundSale = sales.find((s) => s.id === notif.saleId);
      if (foundSale) {
        onViewVoucher(foundSale);
        return;
      }
    }
    if (notif.actionTab) {
      onNavigate(notif.actionTab);
    }
  };

  const handleNotifyAdminSummaryToast = () => {
    const cashText =
      cashSession.status === 'ABIERTA'
        ? `Cierre pendiente en ${cashSession.registerNumber}`
        : `${cashSession.registerNumber} cerrada`;
    onToast(
      `Control Administrativo: ${cashText} · ${unreadNotifCount} notificación(es) sin leer (${saleChangeNotifCount} de ventas).`,
      cashSession.status === 'ABIERTA'
    );
  };

  const handleNotifyProductToast = (prod: Product) => {
    onToast(
      `Alerta de inventario crítico: ${prod.name} (${prod.code}) dispone únicamente de ${prod.currentStock} unidad(es) en bodega (< 5).`,
      true
    );
  };

  const totalPaidSales = sales
    .filter((s) => s.status === 'PAGADA')
    .reduce((sum, s) => sum + s.total, 0);

  const paidCount = sales.filter((s) => s.status === 'PAGADA').length;
  const pendingCount = sales.filter((s) => s.status === 'PENDIENTE').length;

  // Datos de ventas por cada día de la semana actual (Lunes a Domingo)
  // El día actual ("Jue · Hoy") se sincroniza en tiempo real con las ventas PAGADAS.
  const currentWeekDays = useMemo(() => {
    const historicalBaseline: Record<string, { total: number; transactions: number }> = {
      '11/11/2024': { total: 1120000, transactions: 9 },
      '12/11/2024': { total: 980000, transactions: 8 },
      '13/11/2024': { total: 1450000, transactions: 13 },
    };

    const weekSchema = [
      { day: 'Lun', fullDay: 'Lunes', dateKey: '11/11/2024', dateLabel: '11 Nov', isToday: false, isFuture: false },
      { day: 'Mar', fullDay: 'Martes', dateKey: '12/11/2024', dateLabel: '12 Nov', isToday: false, isFuture: false },
      { day: 'Mié', fullDay: 'Miércoles', dateKey: '13/11/2024', dateLabel: '13 Nov', isToday: false, isFuture: false },
      { day: 'Jue (Hoy)', fullDay: 'Jueves', dateKey: '14/11/2024', dateLabel: '14 Nov', isToday: true, isFuture: false },
      { day: 'Vie', fullDay: 'Viernes', dateKey: '15/11/2024', dateLabel: '15 Nov', isToday: false, isFuture: true },
      { day: 'Sáb', fullDay: 'Sábado', dateKey: '16/11/2024', dateLabel: '16 Nov', isToday: false, isFuture: true },
      { day: 'Dom', fullDay: 'Domingo', dateKey: '17/11/2024', dateLabel: '17 Nov', isToday: false, isFuture: true },
    ];

    const paidSales = sales.filter((s) => s.status === 'PAGADA');

    return weekSchema.map((slot) => {
      const matchingPaid = paidSales.filter((s) => s.date === slot.dateKey);
      const liveTotal = matchingPaid.reduce((sum, s) => sum + s.total, 0);
      const base = historicalBaseline[slot.dateKey];

      const total = slot.isToday
        ? liveTotal
        : (base?.total ?? 0) + liveTotal;

      const transactions = slot.isToday
        ? matchingPaid.length
        : (base?.transactions ?? 0) + matchingPaid.length;

      return {
        ...slot,
        total,
        transactions,
      };
    });
  }, [sales]);

  const weeklyTotal = currentWeekDays.reduce((acc, item) => acc + item.total, 0);
  const elapsedDays = currentWeekDays.filter((d) => !d.isFuture);
  const dailyAverage = elapsedDays.length > 0 ? Math.round(weeklyTotal / elapsedDays.length) : 0;
  const peakDay = currentWeekDays.reduce(
    (best, item) => (item.total > best.total ? item : best),
    currentWeekDays[0]
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6 animate-in fade-in duration-150">
      {/* 1. Welcome Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              Operación Comercial Activa
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Bienvenido al Sistema de Gestión Comercial
          </h1>
          <p className="text-sm text-slate-500 max-w-3xl leading-relaxed">
            Control integral de facturación, flujo de caja, existencias en inventario y reportes de gestión comercial.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {can(currentUser.role, 'view_admin_notifs') && (
            <button
              type="button"
              onClick={() => {
                setIsNotifPanelCollapsed(false);
                notifSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className={`px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 border transition-all cursor-pointer ${
                unreadNotifCount > 0
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
              title="Ver centro de notificaciones administrativas"
            >
              <span className="material-symbols-outlined text-[18px]">notifications_active</span>
              <span>Alertas Admin</span>
              <span
                className={`px-1.5 py-0.2 rounded-full font-mono text-[11px] font-extrabold ${
                  unreadNotifCount > 0 ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {unreadNotifCount}
              </span>
            </button>
          )}

          <div className="hidden sm:flex flex-col text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Periodo Fiscal Activo
            </span>
            <span className="text-xs font-bold text-slate-700">Periodo 2024 - II</span>
          </div>
          <button
            onClick={() => onNavigate('punto-de-venta')}
            className="px-5 py-2.5 bg-slate-900 hover:bg-blue-600 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">point_of_sale</span>
            <span>Terminal POS</span>
          </button>
        </div>
      </div>

      {/* 1.5 Sistema de Alerta Visual Crítica (< 5 unidades) */}
      {criticalProducts.length > 0 && !alertDismissed && (
        <div
          role="alert"
          className="bg-rose-50 border border-rose-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 animate-in fade-in duration-200"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-[22px] animate-pulse">
                notification_important
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-rose-800">
                  Alerta Visual de Inventario Crítico
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-600 text-white font-mono">
                  Stock &lt; 5 unidades ({criticalProducts.length})
                </span>
              </div>
              <p className="text-xs text-rose-900/90 leading-relaxed">
                Los siguientes productos se encuentran por debajo del umbral operativo de <strong>5 unidades</strong> y requieren reposición inmediata en inventario:
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {criticalProducts.map((prod) => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => {
                      if (can(currentUser.role, 'adjust_stock')) {
                        onOpenStockModal(prod.id);
                      }
                    }}
                    disabled={!can(currentUser.role, 'adjust_stock')}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold shadow-2xs transition-colors ${
                      can(currentUser.role, 'adjust_stock')
                        ? 'bg-white hover:bg-rose-100 border-rose-200 text-rose-900 cursor-pointer'
                        : 'bg-white/80 border-rose-200 text-rose-900 cursor-default'
                    }`}
                    title={can(currentUser.role, 'adjust_stock') ? `Click para reabastecer ${prod.name}` : `${prod.name} (Stock crítico)`}
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
                    <span className="font-mono font-bold text-rose-700">{prod.code}</span>
                    <span className="text-slate-700 truncate max-w-[160px]">{prod.name}</span>
                    <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-mono font-bold text-[11px]">
                      {prod.currentStock} unid.
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
            <button
              type="button"
              onClick={() =>
                onToast(
                  `Alerta crítica (< 5 unid.): ${criticalProducts
                    .map((p) => `${p.code} (${p.currentStock} unid.)`)
                    .join(', ')}.`,
                  true
                )
              }
              className="px-3 py-2 rounded-xl bg-white hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">notifications_active</span>
              <span>Notificar Toast</span>
            </button>
            {can(currentUser.role, 'adjust_stock') && (
              <button
                type="button"
                onClick={() => onOpenStockModal(criticalProducts[0].id)}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">add_box</span>
                <span>Abastecer Urgente</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setAlertDismissed(true)}
              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
              title="Ocultar banner temporalmente"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>
      )}

      {/* 1.6 Servicio de Notificaciones Administrativas (Cierres de Caja & Estados de Venta) */}
      {can(currentUser.role, 'view_admin_notifs') && (
        <section
          ref={notifSectionRef}
          aria-label="Centro de Notificaciones Administrativas"
          className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
      >
        <div className="p-4 sm:p-5 bg-slate-50/80 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                cashSession.status === 'ABIERTA' || unreadNotifCount > 0
                  ? 'bg-slate-900 text-amber-400'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[21px]">admin_panel_settings</span>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-extrabold text-slate-900">
                  Centro de Notificaciones Administrativas
                </h2>
                {unreadNotifCount > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold font-mono bg-amber-100 text-amber-900 border border-amber-300">
                    {unreadNotifCount} sin leer
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                    Al día
                  </span>
                )}
                {cashSession.status === 'ABIERTA' && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-white flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                    Cierre pendiente ({cashSession.registerNumber})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Supervisión de cierres de caja pendientes, cobros confirmados, órdenes en espera y anulaciones de venta.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setNotifFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  notifFilter === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Todas ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setNotifFilter('CAJA')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  notifFilter === 'CAJA' ? 'bg-amber-500 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Cierres de Caja ({cashPendingNotifCount})
              </button>
              <button
                type="button"
                onClick={() => setNotifFilter('VENTAS')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  notifFilter === 'VENTAS' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Estados de Venta ({saleChangeNotifCount})
              </button>
            </div>

            <button
              type="button"
              onClick={handleNotifyAdminSummaryToast}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
              title="Enviar notificación resumen en pantalla"
            >
              <span className="material-symbols-outlined text-[16px] text-amber-600">campaign</span>
              <span>Notificar Resumen</span>
            </button>

            {unreadNotifCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllNotificationsRead}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-blue-50 border border-slate-200 text-blue-700 font-bold text-xs cursor-pointer transition-colors"
              >
                Marcar leídas
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsNotifPanelCollapsed((prev) => !prev)}
              className="p-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 cursor-pointer transition-colors"
              title={isNotifPanelCollapsed ? 'Expandir notificaciones' : 'Contraer panel'}
            >
              <span className="material-symbols-outlined text-[18px]">
                {isNotifPanelCollapsed ? 'expand_more' : 'expand_less'}
              </span>
            </button>
          </div>
        </div>

        {!isNotifPanelCollapsed && (
          <div className="p-4 sm:p-5 space-y-2.5 max-h-80 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 flex flex-col items-center gap-1.5">
                <span className="material-symbols-outlined text-[28px] text-emerald-500">
                  notifications_paused
                </span>
                <span className="font-semibold text-slate-700">
                  No hay notificaciones administrativas en esta categoría.
                </span>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const styleMap = {
                  critical: {
                    container: notif.read
                      ? 'bg-white border-slate-200'
                      : 'bg-rose-50/75 border-rose-200',
                    iconBg: 'bg-rose-600 text-white',
                    icon: 'report',
                    badge: 'bg-rose-100 text-rose-800',
                    label: 'CRÍTICO',
                  },
                  warning: {
                    container: notif.read
                      ? 'bg-white border-slate-200'
                      : 'bg-amber-50/80 border-amber-300',
                    iconBg: 'bg-amber-500 text-white',
                    icon: 'point_of_sale',
                    badge: 'bg-amber-100 text-amber-900',
                    label: 'PENDIENTE',
                  },
                  success: {
                    container: notif.read
                      ? 'bg-white border-slate-200'
                      : 'bg-emerald-50/70 border-emerald-200',
                    iconBg: 'bg-emerald-600 text-white',
                    icon: 'check_circle',
                    badge: 'bg-emerald-100 text-emerald-800',
                    label: 'CONFIRMADA',
                  },
                  info: {
                    container: notif.read
                      ? 'bg-white border-slate-200'
                      : 'bg-blue-50/70 border-blue-200',
                    iconBg: 'bg-blue-600 text-white',
                    icon: 'sync_alt',
                    badge: 'bg-blue-100 text-blue-800',
                    label: 'ESTADO VENTA',
                  },
                }[notif.severity];

                return (
                  <div
                    key={notif.id}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${styleMap.container}`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${styleMap.iconBg}`}
                      >
                        <span className="material-symbols-outlined text-[18px]">{styleMap.icon}</span>
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {!notif.read && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" title="Sin leer"></span>
                          )}
                          <span className="text-xs font-extrabold text-slate-900">{notif.title}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${styleMap.badge}`}>
                            {styleMap.label}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">{notif.timestamp}</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>
                        {notif.meta && (
                          <span className="inline-block text-[11px] font-semibold text-slate-500">
                            {notif.meta}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      {notif.actionLabel && (
                        <button
                          type="button"
                          onClick={() => handleNotificationAction(notif)}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
                        >
                          {notif.actionLabel}
                        </button>
                      )}
                      {!notif.read && (
                        <button
                          type="button"
                          onClick={() => onMarkNotificationRead(notif.id)}
                          className="p-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-emerald-700 transition-colors cursor-pointer"
                          title="Marcar como leída"
                        >
                          <span className="material-symbols-outlined text-[16px]">done</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDismissNotification(notif.id)}
                        className="p-1.5 rounded-lg bg-white hover:bg-rose-50 border border-slate-200 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Descartar notificación"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </section>
      )}

      {/* 2. Top Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Ventas del Día */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Ventas del Día
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">payments</span>
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 font-mono">
              ${totalPaidSales.toLocaleString('es-CO')}{' '}
              <span className="text-xs font-medium text-slate-400">COP</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
              <span className="text-emerald-600 font-bold flex items-center">
                ↑ {paidCount} procesadas
              </span>
              <span>·</span>
              <span className="text-amber-600 font-semibold">{pendingCount} pendientes</span>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
            <div className="bg-blue-600 h-full w-[80%] rounded-full"></div>
          </div>
        </div>

        {/* Card 2: Estado de Caja */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Estado de Caja
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">point_of_sale</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-emerald-700 uppercase">
                {cashSession.status} · {cashSession.turnName.split('·')[0]}
              </span>
            </div>
            <div className="mt-2 text-xs space-y-0.5 text-slate-600">
              <div className="flex justify-between">
                <span>Saldo apertura:</span>
                <span className="font-mono font-semibold">${cashSession.openingBalance.toLocaleString('es-CO')}</span>
              </div>
              <div className="flex justify-between">
                <span>Efectivo en gaveta:</span>
                <span className="font-mono font-bold text-slate-900">
                  ${(cashSession.openingBalance + cashSession.totalSalesCash - cashSession.totalOutflows).toLocaleString('es-CO')}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-100">
            <span>Arqueo programado: 18:00</span>
            <span className="font-mono font-semibold text-blue-600">{cashSession.registerNumber}</span>
          </div>
        </div>

        {/* Card 3: Integridad de Stock */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Integridad de Stock
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">inventory_2</span>
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-slate-900">100%</span>
              <span className="text-xs font-bold text-emerald-600">Sin Negativos</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Control automático de existencias positivas.
            </p>
          </div>
          <div
            onClick={() => {
              if (criticalProducts.length > 0) {
                onToast(
                  `${criticalProducts.length} producto(s) por debajo de 5 unidades: ${criticalProducts
                    .map((p) => `${p.code} (${p.currentStock})`)
                    .join(', ')}.`,
                  true
                );
              }
              onNavigate('catalogo-inventario');
            }}
            className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg border mt-3 cursor-pointer transition-colors ${
              criticalProducts.length > 0
                ? 'text-rose-700 bg-rose-50 border-rose-200/80 hover:bg-rose-100'
                : 'text-emerald-700 bg-emerald-50 border-emerald-200/80 hover:bg-emerald-100'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[16px] ${
                criticalProducts.length > 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              {criticalProducts.length > 0 ? 'warning' : 'verified'}
            </span>
            <span>
              {criticalProducts.length > 0
                ? `${criticalProducts.length} productos < 5 unid. (Crítico)`
                : 'Stock saludable (>= 5 unid.)'}
            </span>
          </div>
        </div>

        {/* Card 4: Usuario Activo */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Usuario Activo
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
            </div>
          </div>
          <div>
            <span className="text-sm font-bold text-slate-900 block truncate">
              {currentUser.roleLabel.split('·')[0]}
            </span>
            <p className="text-xs text-slate-500">
              {currentUser.name} · ID: <strong className="font-mono">{currentUser.id}</strong>
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-blue-600 font-semibold mt-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>Sesión operativa autorizada</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-100 font-mono">
            <span>Código: {currentUser.code}</span>
            <span>Turno Activo</span>
          </div>
        </div>
      </div>

      {/* 3. Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Últimas Ventas & Curva Horaria */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Table: Últimas Ventas Registradas */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Últimas Ventas Registradas</h3>
                <p className="text-xs text-slate-500">Trazabilidad transaccional inmutable en tiempo real</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-lg">
                  Filtrando: Hoy
                </span>
                <button
                  onClick={() => onToast('Listado de ventas actualizado.', false)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
                  title="Actualizar listado de ventas"
                >
                  <span className="material-symbols-outlined text-[18px]">sync</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200">
                    <th className="py-3 px-4">ID Venta</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Vendedor</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {sales.slice(0, 6).map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {sale.correlativeNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{sale.customer.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {sale.customer.documentType}: {sale.customer.documentNumber}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {sale.vendorName.split('(')[0]}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        ${sale.total.toLocaleString('es-CO')}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            sale.status === 'PAGADA'
                              ? 'bg-emerald-100 text-emerald-800'
                              : sale.status === 'PENDIENTE'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800 line-through'
                          }`}
                        >
                          {sale.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {sale.status === 'PAGADA' ? (
                          <button
                            onClick={() => onViewVoucher(sale)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg transition-colors cursor-pointer"
                          >
                            <span>Comprobante</span>
                            <span className="material-symbols-outlined text-[15px]">receipt</span>
                          </button>
                        ) : sale.status === 'PENDIENTE' ? (
                          <button
                            onClick={() => onPaySale(sale)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-sm cursor-pointer"
                          >
                            <span>Cobrar</span>
                            <span className="material-symbols-outlined text-[15px]">payments</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic flex items-center justify-end gap-1">
                            <span>Stock retornado</span>
                            <span className="material-symbols-outlined text-[14px] text-slate-400">history</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5 text-[11px]">
                <span className="material-symbols-outlined text-[15px] text-blue-600">verified_user</span>
                Historial de facturación actualizado en tiempo real
              </span>
              <button
                onClick={() => onNavigate('reportes-gestion')}
                className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5 cursor-pointer"
              >
                <span>Ver todas las transacciones</span>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          </div>

          {/* Curva Horaria de Facturación (Turno Actual) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">Curva Horaria de Facturación</h3>
                <span className="text-xs text-slate-500">Turno Actual · Intervalo 08:00 - 14:00 hrs</span>
              </div>
              <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                Pico: $480,000 COP (10:30)
              </span>
            </div>

            {/* SVG Visual Graph Curve */}
            <div className="relative w-full h-44 bg-slate-50/70 rounded-xl p-4 border border-slate-100 flex flex-col justify-between">
              <svg viewBox="0 0 500 120" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Horizontal grid lines */}
                <line x1="0" y1="30" x2="500" y2="30" stroke="#e2e8f0" strokeDasharray="3,3" />
                <line x1="0" y1="70" x2="500" y2="70" stroke="#e2e8f0" strokeDasharray="3,3" />
                <line x1="0" y1="110" x2="500" y2="110" stroke="#e2e8f0" />

                {/* Shaded Area */}
                <path
                  d="M 20 100 Q 100 85, 170 35 T 320 80 T 480 40 L 480 110 L 20 110 Z"
                  fill="url(#curveGradient)"
                />

                {/* Line Path */}
                <path
                  d="M 20 100 Q 100 85, 170 35 T 320 80 T 480 40"
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                {/* Key Points */}
                <circle cx="20" cy="100" r="4.5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                <circle cx="170" cy="35" r="5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                <circle cx="320" cy="80" r="4.5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                <circle cx="480" cy="40" r="5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
              </svg>

              {/* Bottom Hour Labels */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-2">
                <span>08:00 (Apertura)</span>
                <span>10:30 (Pico: $480k)</span>
                <span>12:00 (Almuerzo)</span>
                <span>14:00 (Hora Actual)</span>
              </div>
            </div>
          </div>

          {/* Gráfico de Barras Recharts: Ventas Totales por Día de la Semana Actual */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-slate-900">
                    Ventas Totales por Día · Semana Actual
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    Lun 11 - Dom 17 Nov
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  Monitoreo diario del rendimiento comercial (facturación pagada en COP)
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="px-2.5 py-1 rounded-lg bg-slate-100 text-xs">
                  <span className="text-slate-500 mr-1">Acumulado:</span>
                  <span className="font-mono font-bold text-slate-900">
                    ${weeklyTotal.toLocaleString('es-CO')}
                  </span>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-blue-50 text-xs border border-blue-100">
                  <span className="text-blue-600 mr-1">Prom. diario:</span>
                  <span className="font-mono font-bold text-blue-800">
                    ${dailyAverage.toLocaleString('es-CO')}
                  </span>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-emerald-50 text-xs border border-emerald-100">
                  <span className="text-emerald-700 mr-1">Pico:</span>
                  <span className="font-mono font-bold text-emerald-900">
                    {peakDay.fullDay} (${(peakDay.total / 1000).toFixed(0)}k)
                  </span>
                </div>
              </div>
            </div>

            <div className="w-full h-68 bg-slate-50/50 rounded-xl p-3 sm:p-4 border border-slate-100">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={currentWeekDays}
                  margin={{ top: 14, right: 16, left: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                    dy={6}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickFormatter={(value: number) =>
                      value === 0
                        ? '$0'
                        : value >= 1000000
                        ? `$${(value / 1000000).toFixed(1)}M`
                        : `$${Math.round(value / 1000)}k`
                    }
                    width={56}
                  />
                  {dailyAverage > 0 && (
                    <ReferenceLine
                      y={dailyAverage}
                      stroke="#94a3b8"
                      strokeDasharray="4 4"
                      label={{
                        value: `Prom: $${Math.round(dailyAverage / 1000)}k`,
                        position: 'insideTopRight',
                        fill: '#64748b',
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    />
                  )}
                  <Tooltip
                    cursor={{ fill: '#eff6ff', radius: 6 }}
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0].payload as {
                        day: string;
                        fullDay: string;
                        dateLabel: string;
                        total: number;
                        transactions: number;
                        isToday: boolean;
                        isFuture: boolean;
                      };
                      const diffPct =
                        dailyAverage > 0 && !data.isFuture
                          ? Math.round(((data.total - dailyAverage) / dailyAverage) * 100)
                          : null;

                      return (
                        <div className="bg-slate-900 text-white px-3.5 py-2.5 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1">
                          <div className="flex items-center justify-between gap-4">
                            <span className="font-bold text-slate-100">
                              {data.fullDay} · {data.dateLabel}
                            </span>
                            {data.isToday ? (
                              <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
                                Hoy · En vivo
                              </span>
                            ) : data.isFuture ? (
                              <span className="text-[10px] font-bold bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">
                                Sin cierre
                              </span>
                            ) : null}
                          </div>
                          <div className="font-mono font-extrabold text-sm text-blue-400">
                            ${data.total.toLocaleString('es-CO')} COP
                          </div>
                          <div className="flex items-center justify-between gap-3 text-[11px] text-slate-400">
                            <span>{data.transactions} ventas pagadas</span>
                            {diffPct !== null && (
                              <span
                                className={`font-bold ${
                                  diffPct >= 0 ? 'text-emerald-400' : 'text-amber-400'
                                }`}
                              >
                                {diffPct >= 0 ? `+${diffPct}%` : `${diffPct}%`} vs prom.
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="total" radius={[8, 8, 0, 0]} maxBarSize={44}>
                    {currentWeekDays.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.isToday
                            ? '#0f172a'
                            : entry.isFuture
                            ? '#e2e8f0'
                            : entry.total >= dailyAverage
                            ? '#2563eb'
                            : '#60a5fa'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-1">
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block"></span>
                  Sobre el promedio diario
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-400 inline-block"></span>
                  Bajo el promedio
                </span>
                <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-sm bg-slate-900 inline-block"></span>
                  Hoy (en vivo)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-slate-200 inline-block border border-slate-300"></span>
                  Días por transcurrir
                </span>
              </div>
              <span className="text-slate-400">
                Línea punteada: promedio diario de la semana actual
              </span>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Módulos por Rol & Stock Crítico */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Módulos Operativos por Rol */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">Accesos Directos</h3>
            </div>
            <p className="text-xs text-slate-500">
              Acceso rápido a los módulos operativos principales del sistema:
            </p>

            <div className="space-y-2.5">
              {/* Nueva Venta POS */}
              <div
                onClick={() => onNavigate('punto-de-venta')}
                className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-between cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                    <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors">
                      Nueva Venta POS
                    </h4>
                    <span className="text-[11px] text-slate-500">Rol Asignado: Vendedor</span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-slate-400 group-hover:text-slate-900 transition-colors text-[20px]">
                  arrow_forward
                </span>
              </div>

              {/* Cobro / Arqueo de Caja */}
              <div
                onClick={() => onNavigate('control-de-caja')}
                className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-between cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">point_of_sale</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors">
                      Cobro / Arqueo de Caja
                    </h4>
                    <span className="text-[11px] text-slate-500">Rol Asignado: Cajero</span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-slate-400 group-hover:text-slate-900 transition-colors text-[20px]">
                  arrow_forward
                </span>
              </div>

              {/* Ajuste de Stock e Inventario (Solo Administrador) */}
              {can(currentUser.role, 'adjust_stock') && (
                <div
                  onClick={() => onOpenStockModal()}
                  className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-between cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                      <span className="material-symbols-outlined text-[20px]">tune</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors">
                        Ajuste de Stock e Inventario
                      </h4>
                      <span className="text-[11px] text-slate-500">Rol Asignado: Administrador</span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-slate-900 transition-colors text-[20px]">
                    arrow_forward
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Alerta de Stock Crítico (< 5 unidades) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-rose-600 font-bold text-sm">
                <span className="material-symbols-outlined text-[20px]">warning</span>
                <span>Alerta de Stock Crítico</span>
              </div>
              <div className="flex items-center gap-1.5">
                {criticalProducts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleNotifyProductToast(criticalProducts[0])}
                    className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                    title="Notificar alerta mediante Toast"
                  >
                    <span className="material-symbols-outlined text-[16px]">notifications_active</span>
                  </button>
                )}
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold font-mono ${
                    criticalProducts.length > 0
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {criticalProducts.length} Ítems &lt; 5
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Productos por debajo del nivel crítico (<strong>&lt; 5 unidades</strong>) que requieren reorden inmediata:
            </p>

            {criticalProducts.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 font-semibold">
                <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
                <span>Todos los productos superan el umbral mínimo de 5 unidades.</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {criticalProducts.map((prod) => {
                  const pct = Math.max(8, Math.min(100, Math.round((prod.currentStock / CRITICAL_THRESHOLD) * 100)));
                  return (
                    <div
                      key={prod.id}
                      className="p-3 rounded-xl bg-rose-50/40 border border-rose-200/80 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-8 h-8 rounded-lg bg-rose-100 text-rose-800 font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-rose-300">
                            0{prod.currentStock}
                          </span>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 truncate">{prod.name}</h4>
                            <span className="text-[11px] text-slate-500 block">
                              SKU: {prod.code} · Crítico (&lt; 5 unid.)
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleNotifyProductToast(prod)}
                            className="p-1.5 rounded-lg bg-white hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                            title={`Enviar alerta toast para ${prod.code}`}
                          >
                            <span className="material-symbols-outlined text-[15px]">campaign</span>
                          </button>
                          {can(currentUser.role, 'adjust_stock') && (
                            <button
                              type="button"
                              onClick={() => onOpenStockModal(prod.id)}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer"
                            >
                              Abastecer
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-rose-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-rose-600 rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
