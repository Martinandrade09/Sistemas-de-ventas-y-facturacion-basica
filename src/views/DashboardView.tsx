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
} from 'recharts';
import { Sale, Product, CashSession, User } from '../types';

interface DashboardViewProps {
  sales: Sale[];
  products: Product[];
  cashSession: CashSession;
  currentUser: User;
  onNavigate: (tab: string) => void;
  onViewVoucher: (sale: Sale) => void;
  onPaySale: (sale: Sale) => void;
  onOpenStockModal: (productId?: number) => void;
  onToast: (msg: string, isError?: boolean) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  sales,
  products,
  cashSession,
  currentUser,
  onNavigate,
  onViewVoucher,
  onPaySale,
  onOpenStockModal,
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
  const hasMountedToastRef = useRef(false);
  const prevStockMapRef = useRef<Record<number, number>>({});

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

  // Datos de ventas de los últimos 7 días (último día sincronizado en tiempo real con las ventas pagadas de hoy)
  const weeklySalesData = useMemo(
    () => [
      { day: 'Vie', dateLabel: '08 Nov', total: 890000, transactions: 8 },
      { day: 'Sáb', dateLabel: '09 Nov', total: 1340000, transactions: 12 },
      { day: 'Dom', dateLabel: '10 Nov', total: 620000, transactions: 5 },
      { day: 'Lun', dateLabel: '11 Nov', total: 1120000, transactions: 9 },
      { day: 'Mar', dateLabel: '12 Nov', total: 980000, transactions: 8 },
      { day: 'Mié', dateLabel: '13 Nov', total: 1450000, transactions: 13 },
      { day: 'Jue (Hoy)', dateLabel: '14 Nov', total: totalPaidSales, transactions: paidCount, isToday: true },
    ],
    [totalPaidSales, paidCount]
  );

  const weeklyTotal = weeklySalesData.reduce((acc, item) => acc + item.total, 0);

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

        <div className="flex items-center gap-3 shrink-0">
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
                    onClick={() => onOpenStockModal(prod.id)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-rose-100 border border-rose-200 text-xs font-semibold text-rose-900 transition-colors cursor-pointer shadow-2xs"
                    title={`Click para reabastecer ${prod.name}`}
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
            <button
              type="button"
              onClick={() => onOpenStockModal(criticalProducts[0].id)}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add_box</span>
              <span>Abastecer Urgente</span>
            </button>
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

          {/* Gráfico de Barras Recharts: Total de Ventas por Día (Última Semana) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Total de Ventas por Día (Última Semana)
                </h3>
                <span className="text-xs text-slate-500">
                  Consolidado diario de facturación pagada (COP) · Últimos 7 días
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                  Acumulado 7d: ${weeklyTotal.toLocaleString('es-CO')} COP
                </span>
              </div>
            </div>

            <div className="w-full h-64 bg-slate-50/50 rounded-xl p-3 sm:p-4 border border-slate-100">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={weeklySalesData}
                  margin={{ top: 10, right: 12, left: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                    dy={6}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickFormatter={(value: number) =>
                      value >= 1000000
                        ? `$${(value / 1000000).toFixed(1)}M`
                        : `$${Math.round(value / 1000)}k`
                    }
                    width={56}
                  />
                  <Tooltip
                    cursor={{ fill: '#eff6ff', radius: 6 }}
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0].payload as {
                        day: string;
                        dateLabel: string;
                        total: number;
                        transactions: number;
                        isToday?: boolean;
                      };
                      return (
                        <div className="bg-slate-900 text-white px-3.5 py-2.5 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1">
                          <div className="flex items-center justify-between gap-4">
                            <span className="font-bold text-slate-100">
                              {data.day} · {data.dateLabel}
                            </span>
                            {data.isToday && (
                              <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
                                En vivo
                              </span>
                            )}
                          </div>
                          <div className="font-mono font-extrabold text-sm text-blue-400">
                            ${data.total.toLocaleString('es-CO')} COP
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {data.transactions} ventas pagadas registradas
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="total" radius={[8, 8, 0, 0]} maxBarSize={44}>
                    {weeklySalesData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isToday ? '#0f172a' : '#2563eb'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-1">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block"></span>
                  Días anteriores (histórico cerrado)
                </span>
                <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-sm bg-slate-900 inline-block"></span>
                  Hoy (sincronizado con transacciones PAGADAS)
                </span>
              </div>
              <span className="text-slate-400">
                Consolidado de ventas pagadas de los últimos 7 días
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

              {/* Ajuste de Stock e Inventario */}
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
                          <button
                            type="button"
                            onClick={() => onOpenStockModal(prod.id)}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer"
                          >
                            Abastecer
                          </button>
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
