import React from 'react';
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
  const criticalProducts = products.filter((p) => p.currentStock <= p.minStock);

  const totalPaidSales = sales
    .filter((s) => s.status === 'PAGADA')
    .reduce((sum, s) => sum + s.total, 0);

  const paidCount = sales.filter((s) => s.status === 'PAGADA').length;
  const pendingCount = sales.filter((s) => s.status === 'PENDIENTE').length;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6 animate-in fade-in duration-150">
      {/* 1. Academic Header Banner & Welcome */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              ENTORNO DIDÁCTICO V2.4 · Transaccionalidad ACID Activa
            </span>
            <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-semibold">
              PDO MySQL InnoDB
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Bienvenido al Sistema de Gestión Comercial
          </h1>
          <p className="text-sm text-slate-500 max-w-3xl leading-relaxed">
            Proyecto Académico Formativo · Arquitectura MVC Monolítica en PHP 8 & MySQL InnoDB con Control Transaccional Seguro y Separación de Responsabilidades.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Periodo Fiscal Activo
            </span>
            <span className="text-xs font-bold text-slate-700">Semestre II - 2024</span>
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
            <p className="text-xs text-slate-500 mt-1 font-mono">
              Restricción MySQL <strong className="text-slate-700">stock &gt;= 0</strong> activa.
            </p>
          </div>
          <div
            onClick={() => onNavigate('catalogo-inventario')}
            className="flex items-center gap-1.5 text-xs text-amber-700 font-bold bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200/60 mt-3 cursor-pointer hover:bg-amber-100 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px] text-amber-600">warning</span>
            <span>{criticalProducts.length} productos en umbral crítico</span>
          </div>
        </div>

        {/* Card 4: Sesión RBAC Activa */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Sesión RBAC Activa
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
              <span>Permisos Globales PDO Activos</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-100 font-mono">
            <span>Nivel: {currentUser.code}</span>
            <span>PHP 8.2</span>
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
                  onClick={() => onToast('Registros actualizados desde MySQL InnoDB.', false)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
                  title="Refrescar transacciones"
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
              <span className="flex items-center gap-1 font-mono text-[11px]">
                <span className="material-symbols-outlined text-[15px] text-blue-600">verified_user</span>
                Filas protegidas mediante Clave Foránea con <strong>ON DELETE RESTRICT</strong>
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
        </div>

        {/* Right Column (4 cols): Módulos por Rol & Stock Crítico */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Módulos Operativos por Rol */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">Módulos Operativos por Rol</h3>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                Simulación RBAC
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Acceso directo a las rutas controladas según la responsabilidad académica del usuario en la sesión:
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

          {/* Alerta de Stock Crítico */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-rose-600 font-bold text-sm">
                <span className="material-symbols-outlined text-[20px]">warning</span>
                <span>Alerta de Stock Crítico</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 font-mono">
                {criticalProducts.length} Ítems
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Productos que han alcanzado el umbral de seguridad y requieren reorden inmediata:
            </p>

            <div className="space-y-2.5">
              {criticalProducts.map((prod) => (
                <div
                  key={prod.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-rose-200">
                      0{prod.currentStock}
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{prod.name}</h4>
                      <span className="text-[11px] text-slate-500 block">
                        SKU: {prod.code} · Mínimo: {prod.minStock} unid.
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => onOpenStockModal(prod.id)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors shrink-0 shadow-sm cursor-pointer"
                  >
                    Abastecer
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Pedagogical Software Engineering Flow (ACID) */}
          <div className="bg-slate-950 text-slate-100 rounded-2xl p-5 shadow-sm space-y-3 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">code</span>
                Flujo Formativo Transaccional (ACID)
              </span>
              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono font-bold">
                InnoDB Engine
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              El sistema desacopla intencionalmente el registro comercial del cobro en metálico:
            </p>

            <ol className="space-y-2 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  <strong>Vendedor</strong> crea venta preliminar en estado <code className="text-amber-300">PENDIENTE</code>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  <strong>Cajero</strong> valida saldo y confirma el cobro solo si su Caja está Abierta.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  Transacción <code className="text-emerald-400 font-mono">PDO::beginTransaction()</code> descuenta el stock atómicamente.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  4
                </span>
                <span>Comprobante de factura inmutable generado para impresión fiscal.</span>
              </li>
            </ol>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Patrón: Separación de Responsabilidades</span>
              <span className="text-emerald-400">InnoDB WAL Log OK</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Console Bar */}
      <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-blue-600">terminal</span>
          <span>
            Consola Académica: Ejecutando consultas preparadas PDO en modo estricto{' '}
            <code className="font-mono font-bold text-slate-800">ATTR_ERRMODE_EXCEPTION</code>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-400">Última sincronización: Hace 2 min</span>
          <button
            onClick={() => onToast('Tablero de control sincronizado con éxito.', false)}
            className="text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
          >
            Refrescar Tablero
          </button>
        </div>
      </div>
    </div>
  );
};
