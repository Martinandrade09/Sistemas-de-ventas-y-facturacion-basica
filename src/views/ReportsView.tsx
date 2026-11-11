import React, { useState } from 'react';
import { Sale, Product, CashSession, User } from '../types';

interface ReportsViewProps {
  sales: Sale[];
  products: Product[];
  cashSession: CashSession;
  currentUser: User;
  onOpenVoidModal: (sale: Sale) => void;
  onViewVoucher: (sale: Sale) => void;
  onOpenStockModal: (productId?: number) => void;
  onOpenSqlModal: () => void;
  onToast: (msg: string, isError?: boolean) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  sales,
  products,
  cashSession,
  currentUser,
  onOpenVoidModal,
  onViewVoucher,
  onOpenStockModal,
  onOpenSqlModal,
  onToast,
}) => {
  // Active Sub-tab state
  const [activeSubTab, setActiveSubTab] = useState<'ventas-diarias' | 'arqueo-caja' | 'stock-critico' | 'historial-ventas'>('stock-critico');

  // Filters for Historial General de Ventas
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'PAGADA' | 'PENDIENTE' | 'ANULADA'>('TODOS');
  const [vendorFilter, setVendorFilter] = useState('TODOS');
  const [dateFilter, setDateFilter] = useState('14/11/2024');

  const criticalProducts = products.filter((p) => p.currentStock <= p.minStock);

  // Filtered sales in Historial
  const filteredSales = sales.filter((s) => {
    const matchesStatus = statusFilter === 'TODOS' || s.status === statusFilter;
    const matchesVendor = vendorFilter === 'TODOS' || s.vendorName.includes(vendorFilter);
    return matchesStatus && matchesVendor;
  });

  const totalSalesVolume = sales.reduce((sum, s) => sum + s.total, 0);
  const paidSales = sales.filter((s) => s.status === 'PAGADA');
  const pendingSales = sales.filter((s) => s.status === 'PENDIENTE');
  const voidSales = sales.filter((s) => s.status === 'ANULADA');

  const paidAmount = paidSales.reduce((sum, s) => sum + s.total, 0);
  const pendingAmount = pendingSales.reduce((sum, s) => sum + s.total, 0);
  const voidAmount = voidSales.reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6 animate-in fade-in duration-150">
      {/* 1. Header & Context */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              Turno Operativo #089 • Activo
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
              Alerta Activa: {criticalProducts.length} Referencias en Umbral Crítico
            </span>
            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full">
              RF-14.3 / RF-06
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Centro de Reportes y Auditoría del Administrador
          </h1>
          <p className="text-sm text-slate-500 max-w-3xl leading-relaxed">
            Módulo de Gestión de Inventario, Control de Umbrales Mínimos, Historial General de Ventas y Protocolo de Anulación Controlada (RF-14.3, RF-14.4 & RF-13). Monitoreo en tiempo real sincronizado con el motor transaccional PDO InnoDB.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            <span>Imprimir Ficha</span>
          </button>
          <button
            onClick={() => onToast('Reporte consolidado generado en PDF de alta fidelidad.', false)}
            className="px-4 py-2 bg-slate-900 hover:bg-blue-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Exportar Lista (PDF)</span>
          </button>
        </div>
      </div>

      {/* 2. Sub-Navigation Tabs */}
      <nav className="flex items-center gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl overflow-x-auto border border-slate-200/80">
        <button
          onClick={() => setActiveSubTab('ventas-diarias')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'ventas-diarias'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">calendar_today</span>
          <span>1. Ventas Diarias (Por Estado)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('arqueo-caja')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'arqueo-caja'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">point_of_sale</span>
          <span>2. Arqueo y Caja por Turno</span>
        </button>

        <button
          onClick={() => setActiveSubTab('stock-critico')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'stock-critico'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">warning</span>
          <span>3. Stock Bajo / Crítico</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-600 text-white">
            {criticalProducts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('historial-ventas')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'historial-ventas'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">history_edu</span>
          <span>4. Historial General de Ventas</span>
          <span className="px-1.5 py-0.2 rounded font-mono text-[10px] bg-blue-100 text-blue-800 font-bold">
            RF-14.4 / RF-13
          </span>
        </button>
      </nav>

      {/* 3. Sub-Tab Content */}

      {/* SUB-TAB 3: Stock Bajo / Crítico */}
      {activeSubTab === 'stock-critico' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Banner Fundamento Logístico RF-14.3 / RF-06 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row items-stretch justify-between gap-6">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <span>Fundamento Operativo · Control Preventivo de Inventario (RF-14.3)</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800">
                  <span className="text-blue-700 font-bold">Criterio de Alerta:</span> Stock Actual ≤ Stock Mínimo{' '}
                  <span className="text-slate-300">|</span>{' '}
                  <span className="text-rose-600 font-bold">Condición Crítica:</span> Stock Actual ≤ (Stock Mínimo * 0.5) ó Stock Actual ≤ 1
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong className="text-slate-900 font-semibold">Regla de Negocio Inmutable (RF-06):</strong> El stock nunca se altera manualmente en la ficha de producto; cualquier incremento debe registrarse obligatoriamente mediante Orden de Entrada / Kardex formal con trazabilidad de proveedor y factura para garantizar la auditoría fiscal.
                </p>
                <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                  <span className="flex items-center gap-1 font-semibold text-emerald-700">
                    <span className="material-symbols-outlined text-[16px]">lock</span>
                    Integridad Transaccional ACID
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-blue-700">
                    <span className="material-symbols-outlined text-[16px]">sync_alt</span>
                    Trigger de Actualización: PosVentaController
                  </span>
                </div>
              </div>

              {/* Integrated Side Metrics */}
              <div className="grid grid-cols-2 gap-3 lg:w-96 bg-slate-50 p-4 rounded-xl border border-slate-200 shrink-0">
                <div className="space-y-0.5">
                  <span className="text-[11px] text-slate-500">Referencias Auditadas</span>
                  <div className="text-xl font-extrabold text-slate-900">{products.length} SKUs</div>
                  <span className="text-[10px] text-slate-400">Catálogo principal activo</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] text-rose-600 font-bold">En Riesgo Inminente</span>
                  <div className="text-xl font-extrabold text-rose-600">{criticalProducts.length} SKUs (40%)</div>
                  <span className="text-[10px] text-rose-500">1 crítico / 1 reposición</span>
                </div>
                <div className="space-y-0.5 pt-2 border-t border-slate-200">
                  <span className="text-[11px] text-slate-500">Capital en Riesgo</span>
                  <div className="text-base font-bold text-slate-900">$235,000 COP</div>
                  <span className="text-[10px] text-slate-400">Margen de pérdida diaria</span>
                </div>
                <div className="space-y-0.5 pt-2 border-t border-slate-200">
                  <span className="text-[11px] text-slate-500">Nivel de Servicio (SLA)</span>
                  <div className="text-base font-bold text-emerald-600">88.5%</div>
                  <span className="text-[10px] text-slate-400">Meta institucional: &gt;95%</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Total Artículos en Alerta
              </span>
              <div className="text-2xl font-extrabold text-rose-600 font-mono mt-1">
                {criticalProducts.length} Referencias
              </div>
              <span className="text-xs text-rose-600 font-semibold mt-1">
                1 Crítico inmediato, 1 Stock bajo de reposición
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Unidades Faltantes
              </span>
              <div className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
                19 Unidades
              </div>
              <span className="text-xs text-slate-500 mt-1">
                Cálculo para alcanzar Stock Óptimo de seguridad
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Inversión en Reposición
              </span>
              <div className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
                $1,420,000 COP
              </div>
              <span className="text-xs text-slate-500 mt-1">
                Basado en costo estimado de reposición
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                KPI RF-01.4 (Inventario No Negativo)
              </span>
              <div className="text-2xl font-extrabold text-emerald-600 font-mono mt-1 flex items-baseline gap-2">
                100%
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  Cumplido
                </span>
              </div>
              <span className="text-xs text-emerald-700 font-semibold mt-1">
                0 existencias negativas registradas
              </span>
            </div>
          </div>

          {/* Detailed Audit Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <span className="font-bold text-xs text-slate-900">
                Auditoría Detallada de Existencias en Umbral Preventivo (RF-14.3)
              </span>
              <button
                onClick={() => onOpenStockModal()}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">add_box</span>
                <span>Generar Sugerido de Compra</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200">
                    <th className="py-3 px-4">Código / SKU</th>
                    <th className="py-3 px-4">Producto y Especificación</th>
                    <th className="py-3 px-4">Categoría</th>
                    <th className="py-3 px-4 w-60">Stock Actual vs Mínimo</th>
                    <th className="py-3 px-4">Estado / Severidad</th>
                    <th className="py-3 px-4">Cobertura Proyectada</th>
                    <th className="py-3 px-4 text-right">Acción Directa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {products.map((p) => {
                    const isCritical = p.currentStock <= Math.floor(p.minStock * 0.5) || p.currentStock <= 1;
                    const isLow = !isCritical && p.currentStock <= p.minStock;
                    const percent = Math.min(100, Math.round((p.currentStock / p.optimalStock) * 100));

                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isCritical ? 'bg-rose-50/30' : isLow ? 'bg-amber-50/20' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-blue-600 whitespace-nowrap">
                          {p.code}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{p.name}</div>
                          <div className="text-[11px] text-slate-400">{p.description}</div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                            {p.category}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span
                                className={`font-bold ${
                                  isCritical ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-emerald-700'
                                }`}
                              >
                                {p.currentStock} unid. actual
                              </span>
                              <span className="text-slate-400">Mín: {p.minStock} unid.</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isCritical ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${percent}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              isCritical
                                ? 'bg-rose-100 text-rose-800'
                                : isLow
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {isCritical ? 'warning' : isLow ? 'info' : 'check_circle'}
                            </span>
                            <span>{isCritical ? 'CRÍTICO / QUIEBRE' : isLow ? 'STOCK BAJO' : 'ÓPTIMO'}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-800">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px] text-slate-400">schedule</span>
                            {(p.currentStock * 1.8).toFixed(1)} días
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => onOpenStockModal(p.id)}
                            className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                              isCritical || isLow
                                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                            }`}
                          >
                            Abastecer
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: Historial General de Ventas & Protocolo RF-13 */}
      {activeSubTab === 'historial-ventas' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Pedagogical Banner: RF-13 & TRD Protocol */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-8 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[22px]">policy</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      Fundamento Operativo & Regla de Anulación (RF-13 & TRD)
                    </h3>
                    <span className="text-xs text-slate-500 font-mono">
                      Mecanismo Atómico de Reversión en Motor PDO MySQL InnoDB
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <span className="material-symbols-outlined text-[16px] text-emerald-600">
                        sync_saved_locally
                      </span>
                      <span>Si la Venta estaba PAGADA:</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      Exige confirmación de devolución del dinero en efectivo o transferencia. Restituye automáticamente las unidades al catálogo <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-900 font-mono">productos</code> mediante movimiento <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-900 font-mono">REPOSICION_ANULACION</code>, asienta egreso contable en <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-900 font-mono">movimientos_caja</code> e invalida el comprobante fiscal correlativo.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <span className="material-symbols-outlined text-[16px] text-rose-600">
                        cancel_presentation
                      </span>
                      <span>Si la Venta estaba PENDIENTE:</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      Transiciona de inmediato a <span className="font-bold text-rose-600">ANULADA</span> sin generar desajustes de stock ni movimientos en caja. Requiere motivo de anulación obligatorio (mínimo 10 caracteres) para garantizar trazabilidad e impedir órdenes huérfanas en el sistema.
                    </p>
                  </div>
                </div>
              </div>

              {/* Summary KPI Box Right */}
              <div className="lg:col-span-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="uppercase tracking-wider text-slate-500">Resumen del Libro Diario</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600 font-mono">
                    Hoy · 14 Nov
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-xs text-slate-500">Total Ventas Registradas</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-extrabold text-slate-900 font-mono">
                      ${totalSalesVolume.toLocaleString('es-CO')}{' '}
                      <span className="text-xs font-normal text-slate-500">COP</span>
                    </span>
                    <span className="text-xs font-bold text-slate-700">{sales.length} Transacciones</span>
                  </div>
                </div>

                <div className="space-y-1 pt-1 border-t border-slate-200 text-xs">
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Pagadas ({paidSales.length})
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      ${paidAmount.toLocaleString('es-CO')} COP
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span> Pendientes ({pendingSales.length})
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      ${pendingAmount.toLocaleString('es-CO')} COP
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1 text-rose-600">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span> Anuladas ({voidSales.length})
                    </span>
                    <span className="font-mono font-bold text-rose-600">
                      ${voidAmount.toLocaleString('es-CO')} COP
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Filter Bar (RF-14.4) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center gap-3 text-xs">
            <div className="flex-1 min-w-[140px]">
              <label className="block text-slate-500 font-bold mb-1">Fecha</label>
              <input
                type="text"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-slate-900 focus:outline-none"
              />
            </div>

            <div className="flex-1 min-w-[150px]">
              <label className="block text-slate-500 font-bold mb-1">Estado de Transacción</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 font-semibold focus:outline-none"
              >
                <option value="TODOS">Todos los Estados</option>
                <option value="PAGADA">PAGADA</option>
                <option value="PENDIENTE">PENDIENTE</option>
                <option value="ANULADA">ANULADA</option>
              </select>
            </div>

            <div className="flex-1 min-w-[160px]">
              <label className="block text-slate-500 font-bold mb-1">Vendedor / Responsable</label>
              <select
                value={vendorFilter}
                onChange={(e) => setVendorFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 font-semibold focus:outline-none"
              >
                <option value="TODOS">Todos los Vendedores</option>
                <option value="Valencia">J. Valencia (Vendedor)</option>
                <option value="Mendoza">C. Mendoza (Admin)</option>
                <option value="Torres">Ana Torres (Vendedora)</option>
                <option value="Quintero">A. Quintero (Vendedor)</option>
                <option value="Pérez">Juan Pérez (Vendedor)</option>
              </select>
            </div>

            <div className="self-end pt-2">
              <button
                onClick={() => {
                  setStatusFilter('TODOS');
                  setVendorFilter('TODOS');
                }}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
              >
                Restablecer Filtros
              </button>
            </div>
          </div>

          {/* Sales Ledger Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200">
                    <th className="py-3 px-4">ID Venta</th>
                    <th className="py-3 px-4">Fecha / Hora</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Vendedor</th>
                    <th className="py-3 px-4">Método</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4 text-right">Acciones de Auditoría</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {sale.correlativeNumber}
                        <div className="text-[10px] text-slate-400 font-normal">{sale.voucherNumber}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-semibold">{sale.date}</span>
                        <div className="text-[10px] text-slate-400">{sale.time}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{sale.customer.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {sale.customer.documentType}: {sale.customer.documentNumber}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {sale.vendorName.split('(')[0]}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]">
                        {sale.paymentMethod || 'PENDIENTE'}
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
                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                        <button
                          onClick={() => onViewVoucher(sale)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg transition-colors cursor-pointer"
                          title="Ver Comprobante Oficial Imprimible"
                        >
                          Comprobante
                        </button>

                        {sale.status !== 'ANULADA' ? (
                          <button
                            onClick={() => onOpenVoidModal(sale)}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg transition-colors cursor-pointer border border-rose-200"
                            title="Protocolo de Anulación Transaccional RF-13"
                          >
                            Anular (RF-13)
                          </button>
                        ) : (
                          <span className="text-[11px] text-rose-600 italic">Revocada</span>
                        )}

                        <button
                          onClick={onOpenSqlModal}
                          className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-mono text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                          title="Ver Sentencias SQL PDO"
                        >
                          SQL
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Mostrando {filteredSales.length} transacciones registradas</span>
              <span className="font-mono text-[11px] text-blue-600">InnoDB Isolation: READ COMMITTED</span>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 1: Ventas Diarias (Por Estado) */}
      {activeSubTab === 'ventas-diarias' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-bold text-sm text-slate-900 mb-2">Libro de Ventas Diarias por Estado</h3>
            <p className="text-xs text-slate-500 mb-4">
              Consolidación fiscal por jornada laboral para auditoría y declaración de impuestos IVA (19%).
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                <span className="text-xs font-bold text-emerald-800 uppercase">Ventas Pagadas</span>
                <div className="text-2xl font-extrabold text-emerald-700 font-mono">
                  ${paidAmount.toLocaleString('es-CO')} COP
                </div>
                <span className="text-xs text-emerald-600">{paidSales.length} transacciones confirmadas</span>
              </div>
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
                <span className="text-xs font-bold text-amber-800 uppercase">Ventas Pendientes</span>
                <div className="text-2xl font-extrabold text-amber-700 font-mono">
                  ${pendingAmount.toLocaleString('es-CO')} COP
                </div>
                <span className="text-xs text-amber-600">{pendingSales.length} órdenes por cobrar en caja</span>
              </div>
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-1">
                <span className="text-xs font-bold text-rose-800 uppercase">Ventas Anuladas</span>
                <div className="text-2xl font-extrabold text-rose-700 font-mono">
                  ${voidAmount.toLocaleString('es-CO')} COP
                </div>
                <span className="text-xs text-rose-600">{voidSales.length} anulaciones con rollback</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: Arqueo y Caja por Turno */}
      {activeSubTab === 'arqueo-caja' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900">Historial de Arqueos y Sesiones de Caja</h3>
            <p className="text-xs text-slate-500">
              Registro inmutable de aperturas, cortes intermedios y cierres de gaveta fiscal.
            </p>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between items-center font-bold text-slate-800">
                <span>{cashSession.registerNumber} · {cashSession.turnName}</span>
                <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded uppercase">
                  {cashSession.status}
                </span>
              </div>
              <p className="text-slate-600">
                Cajero Asignado: <strong>{cashSession.cashier} (ID: {cashSession.cashierId})</strong> · Hora Apertura: {cashSession.openingTime}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 text-[11px] font-mono">
                <div>Apertura: ${cashSession.openingBalance.toLocaleString('es-CO')}</div>
                <div>Ingresos Efectivo: +${cashSession.totalSalesCash.toLocaleString('es-CO')}</div>
                <div>Egresos: -${cashSession.totalOutflows.toLocaleString('es-CO')}</div>
                <div className="font-bold text-slate-900">Saldo Físico: ${(cashSession.openingBalance + cashSession.totalSalesCash - cashSession.totalOutflows).toLocaleString('es-CO')}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
