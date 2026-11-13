import React, { useState, useMemo } from 'react';
import { Sale, Product, CashSession, CashMovement, User, KardexMovement } from '../types';
import { generateManagementPdfReport } from '../utils/pdfReportGenerator';

interface ReportsViewProps {
  sales: Sale[];
  products: Product[];
  kardexMovements: KardexMovement[];
  cashSession: CashSession;
  cashMovements: CashMovement[];
  currentUser: User;
  onOpenVoidModal: (sale: Sale) => void;
  onViewVoucher: (sale: Sale) => void;
  onOpenStockModal: (productId?: number) => void;
  onToast: (msg: string, isError?: boolean) => void;
}

const toIsoDate = (ddmmyyyy: string): string => {
  const parts = ddmmyyyy.trim().split('/');
  if (parts.length !== 3) return ddmmyyyy;
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const formatDisplayDate = (isoDate: string): string => {
  const parts = isoDate.trim().split('-');
  if (parts.length !== 3) return isoDate;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

export const ReportsView: React.FC<ReportsViewProps> = ({
  sales,
  products,
  kardexMovements,
  cashSession,
  cashMovements,
  currentUser,
  onOpenVoidModal,
  onViewVoucher,
  onOpenStockModal,
  onToast,
}) => {
  // Active Sub-tab state
  const [activeSubTab, setActiveSubTab] = useState<'ventas-diarias' | 'arqueo-caja' | 'stock-critico' | 'historial-ventas'>('stock-critico');

  // Filters for Historial General de Ventas
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'PAGADA' | 'PENDIENTE' | 'ANULADA'>('TODOS');
  const [vendorFilter, setVendorFilter] = useState('TODOS');
  const [dateFilter, setDateFilter] = useState('14/11/2024');

  // Collapsible Kardex Audit Panel state & filters
  const [isKardexPanelOpen, setIsKardexPanelOpen] = useState(true);
  const [kardexStartDate, setKardexStartDate] = useState('');
  const [kardexEndDate, setKardexEndDate] = useState('');
  const [kardexTypeFilter, setKardexTypeFilter] = useState<'TODOS' | KardexMovement['type']>('TODOS');
  const [kardexSearch, setKardexSearch] = useState('');

  const isInvalidKardexRange = Boolean(
    kardexStartDate && kardexEndDate && kardexStartDate > kardexEndDate
  );

  const filteredKardex = useMemo(() => {
    if (isInvalidKardexRange) return [];
    const query = kardexSearch.trim().toLowerCase();

    return kardexMovements.filter((mov) => {
      const movIsoDate = toIsoDate(mov.date);
      const matchesStart = !kardexStartDate || movIsoDate >= kardexStartDate;
      const matchesEnd = !kardexEndDate || movIsoDate <= kardexEndDate;
      const matchesType = kardexTypeFilter === 'TODOS' || mov.type === kardexTypeFilter;
      const matchesSearch =
        !query ||
        mov.productCode.toLowerCase().includes(query) ||
        mov.productName.toLowerCase().includes(query) ||
        mov.documentRef.toLowerCase().includes(query) ||
        mov.reason.toLowerCase().includes(query) ||
        mov.user.toLowerCase().includes(query) ||
        String(mov.id).includes(query);

      return matchesStart && matchesEnd && matchesType && matchesSearch;
    });
  }, [
    kardexMovements,
    kardexStartDate,
    kardexEndDate,
    kardexTypeFilter,
    kardexSearch,
    isInvalidKardexRange,
  ]);

  const kardexSummary = useMemo(() => {
    let entries = 0;
    let exits = 0;
    for (const mov of filteredKardex) {
      if (mov.type === 'SALIDA_VENTA') {
        exits += mov.quantity;
      } else {
        entries += mov.quantity;
      }
    }
    return {
      entries,
      exits,
      net: entries - exits,
    };
  }, [filteredKardex]);

  const criticalProducts = products.filter((p) => p.currentStock <= p.minStock);

  // Filtered sales in Historial
  const filteredSales = sales.filter((s) => {
    const matchesStatus = statusFilter === 'TODOS' || s.status === statusFilter;
    const matchesVendor = vendorFilter === 'TODOS' || s.vendorName.includes(vendorFilter);
    const matchesDate = !dateFilter.trim() || s.date.includes(dateFilter.trim());
    return matchesStatus && matchesVendor && matchesDate;
  });

  const escapeCsvCell = (value: string | number | undefined | null): string => {
    const str = value === undefined || value === null ? '' : String(value);
    if (/[",\n\r;]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const handleExportSalesCsv = () => {
    if (filteredSales.length === 0) {
      onToast('No hay ventas filtradas para exportar al archivo CSV.', true);
      return;
    }

    const headers = [
      'ID_Venta',
      'Factura_Correlativa',
      'Comprobante',
      'Fecha',
      'Hora',
      'Cliente',
      'Tipo_Documento',
      'Numero_Documento',
      'Vendedor',
      'Cajero',
      'Metodo_Pago',
      'Subtotal_Neto_COP',
      'IVA_19_COP',
      'Total_COP',
      'Estado',
      'Detalle_Articulos',
      'Motivo_Anulacion',
      'Fecha_Anulacion',
      'Hash_Verificacion_SHA256',
    ];

    const rows = filteredSales.map((sale) => [
      sale.id,
      sale.correlativeNumber,
      sale.voucherNumber,
      sale.date,
      sale.time,
      sale.customer.name,
      sale.customer.documentType,
      sale.customer.documentNumber,
      sale.vendorName,
      sale.cashierName || '',
      sale.paymentMethod || 'PENDIENTE',
      sale.subtotalNeto,
      sale.iva,
      sale.total,
      sale.status,
      sale.items.map((item) => `${item.quantity}x ${item.productCode} (${item.productName})`).join(' | '),
      sale.cancellationReason || '',
      sale.cancellationDate || '',
      sale.verificationHash || '',
    ]);

    const csvContent =
      '\uFEFF' +
      [headers, ...rows]
        .map((row) => row.map((cell) => escapeCsvCell(cell)).join(','))
        .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 10);
    const statusSuffix = statusFilter.toLowerCase();
    const filename = `auditoria_ventas_${statusSuffix}_${timestamp}.csv`;

    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onToast(
      `Archivo "${filename}" descargado con ${filteredSales.length} registro(s) para auditoría externa.`,
      false
    );
  };

  const handleExportKardexCsv = () => {
    if (filteredKardex.length === 0) {
      onToast('No hay movimientos de Kardex en el rango seleccionado para exportar.', true);
      return;
    }

    const headers = [
      'ID_Movimiento',
      'Fecha',
      'Hora',
      'Codigo_SKU',
      'Producto',
      'Tipo_Movimiento',
      'Cantidad_Variacion',
      'Documento_Soporte',
      'Motivo_Auditoria',
      'Usuario_Responsable',
      'Hash_TX',
    ];

    const rows = filteredKardex.map((mov) => [
      mov.id,
      mov.date,
      mov.time,
      mov.productCode,
      mov.productName,
      mov.type,
      mov.type === 'SALIDA_VENTA' ? -mov.quantity : mov.quantity,
      mov.documentRef,
      mov.reason,
      mov.user,
      mov.txHash || '',
    ]);

    const csvContent =
      '\uFEFF' +
      [headers, ...rows]
        .map((row) => row.map((cell) => escapeCsvCell(cell)).join(','))
        .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const rangeSuffix =
      kardexStartDate || kardexEndDate
        ? `${kardexStartDate || 'inicio'}_a_${kardexEndDate || 'fin'}`
        : 'completo';
    const filename = `auditoria_kardex_${rangeSuffix}.csv`;

    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onToast(
      `Kardex exportado ("${filename}") con ${filteredKardex.length} movimiento(s) auditados.`,
      false
    );
  };

  const handleResetKardexFilters = () => {
    setKardexStartDate('');
    setKardexEndDate('');
    setKardexTypeFilter('TODOS');
    setKardexSearch('');
  };

  const handleExportManagementPdf = () => {
    try {
      const filterParts: string[] = [];
      if (dateFilter.trim()) filterParts.push(`Fecha: ${dateFilter.trim()}`);
      if (statusFilter !== 'TODOS') filterParts.push(`Estado: ${statusFilter}`);
      if (vendorFilter !== 'TODOS') filterParts.push(`Vendedor: ${vendorFilter}`);

      const appliedFiltersLabel =
        filterParts.length > 0
          ? `${filteredSales.length} de ${sales.length} ventas (${filterParts.join(' · ')}) y ${cashMovements.length} movimientos de caja.`
          : `Todas las ventas (${sales.length}) y ${cashMovements.length} movimientos de caja.`;

      const filename = generateManagementPdfReport({
        sales: filteredSales,
        totalSalesCount: sales.length,
        cashSession,
        cashMovements,
        currentUser,
        appliedFiltersLabel,
      });

      onToast(
        `Reporte gerencial "${filename}" descargado en PDF (${filteredSales.length} ventas y ${cashMovements.length} mov. de caja).`,
        false
      );
    } catch (error) {
      console.error('Error al generar el PDF gerencial:', error);
      onToast('No se pudo generar el documento PDF. Verifica los datos e intenta nuevamente.', true);
    }
  };

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
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Centro de Reportes y Auditoría
          </h1>
          <p className="text-sm text-slate-500 max-w-3xl leading-relaxed">
            Gestión de inventario, control de umbrales mínimos, historial general de ventas, arqueos de caja y exportación de reportes para gerencia.
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
            onClick={handleExportSalesCsv}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Descargar tabla de ventas filtrada en formato CSV para auditoría externa"
          >
            <span className="material-symbols-outlined text-[18px]">table_view</span>
            <span>Exportar Ventas CSV ({filteredSales.length})</span>
          </button>
          <button
            onClick={handleExportManagementPdf}
            className="px-4 py-2 bg-slate-900 hover:bg-blue-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Generar y descargar informe gerencial de ventas y movimientos de caja en formato PDF"
          >
            <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
            <span>Reporte Gerencial (PDF)</span>
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
        </button>
      </nav>

      {/* Collapsible Kardex Date-Range Audit Panel */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setIsKardexPanelOpen((prev) => !prev)}
          aria-expanded={isKardexPanelOpen}
          className="w-full px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left bg-slate-50/70 hover:bg-slate-100/70 transition-colors cursor-pointer"
        >
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">fact_check</span>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-extrabold text-slate-900">
                  Auditoría Histórica de Movimientos Kardex
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-blue-100 text-blue-800">
                  {filteredKardex.length} de {kardexMovements.length} movimientos
                </span>
                {(kardexStartDate || kardexEndDate) && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                    Rango: {kardexStartDate ? formatDisplayDate(kardexStartDate) : 'Inicio'} →{' '}
                    {kardexEndDate ? formatDisplayDate(kardexEndDate) : 'Actual'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Panel desplegable para inspección detallada de entradas, salidas y anulaciones por rango de fechas específico.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-2xs">
              <span>{isKardexPanelOpen ? 'Ocultar Panel' : 'Desplegar Kardex'}</span>
              <span className="material-symbols-outlined text-[18px]">
                {isKardexPanelOpen ? 'expand_less' : 'expand_more'}
              </span>
            </span>
          </div>
        </button>

        {isKardexPanelOpen && (
          <div className="border-t border-slate-200 p-5 space-y-5 animate-in fade-in duration-150">
            {/* Date Range & Filter Controls */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-blue-600">date_range</span>
                  <span>Filtro por Rango de Fechas y Trazabilidad</span>
                </span>

                {/* Quick Range Presets */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setKardexStartDate('');
                      setKardexEndDate('');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                      !kardexStartDate && !kardexEndDate
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Todo el historial
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setKardexStartDate('2024-11-14');
                      setKardexEndDate('2024-11-14');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                      kardexStartDate === '2024-11-14' && kardexEndDate === '2024-11-14'
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Hoy (14 Nov)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setKardexStartDate('2024-11-12');
                      setKardexEndDate('2024-11-14');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                      kardexStartDate === '2024-11-12' && kardexEndDate === '2024-11-14'
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    12 – 14 Nov
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setKardexStartDate('2024-11-10');
                      setKardexEndDate('2024-11-12');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                      kardexStartDate === '2024-11-10' && kardexEndDate === '2024-11-12'
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    10 – 12 Nov
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end text-xs">
                <div className="lg:col-span-2">
                  <label htmlFor="kardex-start-date" className="block text-slate-600 font-bold mb-1">
                    Fecha Desde
                  </label>
                  <input
                    id="kardex-start-date"
                    type="date"
                    value={kardexStartDate}
                    onChange={(e) => setKardexStartDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="lg:col-span-2">
                  <label htmlFor="kardex-end-date" className="block text-slate-600 font-bold mb-1">
                    Fecha Hasta
                  </label>
                  <input
                    id="kardex-end-date"
                    type="date"
                    value={kardexEndDate}
                    onChange={(e) => setKardexEndDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="lg:col-span-3">
                  <label htmlFor="kardex-type-filter" className="block text-slate-600 font-bold mb-1">
                    Tipo de Movimiento
                  </label>
                  <select
                    id="kardex-type-filter"
                    value={kardexTypeFilter}
                    onChange={(e) => setKardexTypeFilter(e.target.value as 'TODOS' | KardexMovement['type'])}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="TODOS">Todos los Movimientos</option>
                    <option value="ENTRADA_AJUSTE">ENTRADA_AJUSTE (+)</option>
                    <option value="STOCK_INICIAL">STOCK_INICIAL (+)</option>
                    <option value="REPOSICION_ANULACION">REPOSICION_ANULACION (+)</option>
                    <option value="SALIDA_VENTA">SALIDA_VENTA (-)</option>
                  </select>
                </div>

                <div className="lg:col-span-3">
                  <label htmlFor="kardex-search" className="block text-slate-600 font-bold mb-1">
                    Buscar SKU, Producto o Documento
                  </label>
                  <input
                    id="kardex-search"
                    type="text"
                    value={kardexSearch}
                    onChange={(e) => setKardexSearch(e.target.value)}
                    placeholder="Ej: COD-SSD-101, FAC-2024..."
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="lg:col-span-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetKardexFilters}
                    className="flex-1 px-3 py-2 bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Limpiar
                  </button>
                  <button
                    type="button"
                    onClick={handleExportKardexCsv}
                    disabled={filteredKardex.length === 0}
                    title="Exportar movimientos Kardex filtrados a CSV"
                    className={`px-3 py-2 font-bold rounded-lg flex items-center justify-center gap-1 transition-colors ${
                      filteredKardex.length === 0
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">csv</span>
                    <span>CSV</span>
                  </button>
                </div>
              </div>

              {isInvalidKardexRange && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    <span>
                      La fecha inicial ({formatDisplayDate(kardexStartDate)}) no puede ser posterior a la fecha final ({formatDisplayDate(kardexEndDate)}).
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const prevStart = kardexStartDate;
                      setKardexStartDate(kardexEndDate);
                      setKardexEndDate(prevStart);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
                  >
                    Invertir Fechas
                  </button>
                </div>
              )}
            </div>

            {/* Summary Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold uppercase text-slate-500">Registros en Rango</span>
                <div className="text-xl font-extrabold font-mono text-slate-900 mt-0.5">
                  {filteredKardex.length}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <span className="text-[11px] font-bold uppercase text-emerald-700">Total Entradas</span>
                <div className="text-xl font-extrabold font-mono text-emerald-700 mt-0.5">
                  +{kardexSummary.entries} unid.
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200">
                <span className="text-[11px] font-bold uppercase text-rose-700">Total Salidas</span>
                <div className="text-xl font-extrabold font-mono text-rose-700 mt-0.5">
                  -{kardexSummary.exits} unid.
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200">
                <span className="text-[11px] font-bold uppercase text-blue-700">Variación Neta del Rango</span>
                <div className="text-xl font-extrabold font-mono text-blue-800 mt-0.5">
                  {kardexSummary.net >= 0 ? `+${kardexSummary.net}` : kardexSummary.net} unid.
                </div>
              </div>
            </div>

            {/* Kardex Table */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200">
                      <th className="py-3 px-4">ID / TX</th>
                      <th className="py-3 px-4">Fecha y Hora</th>
                      <th className="py-3 px-4">SKU / Producto</th>
                      <th className="py-3 px-4">Tipo</th>
                      <th className="py-3 px-4 text-right">Cantidad</th>
                      <th className="py-3 px-4">Documento</th>
                      <th className="py-3 px-4">Concepto / Motivo</th>
                      <th className="py-3 px-4">Auditor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredKardex.length > 0 ? (
                      filteredKardex.map((mov) => {
                        const isOut = mov.type === 'SALIDA_VENTA';
                        const badgeStyles =
                          mov.type === 'SALIDA_VENTA'
                            ? 'bg-rose-100 text-rose-800'
                            : mov.type === 'REPOSICION_ANULACION'
                            ? 'bg-indigo-100 text-indigo-800'
                            : mov.type === 'STOCK_INICIAL'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800';

                        return (
                          <tr key={mov.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 font-mono whitespace-nowrap">
                              <span className="font-bold text-slate-900">#{mov.id}</span>
                              {mov.txHash && (
                                <div className="text-[10px] text-slate-400">{mov.txHash}</div>
                              )}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="font-semibold text-slate-900">{mov.date}</div>
                              <div className="text-[10px] text-slate-400">{mov.time}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-mono font-bold text-blue-600">{mov.productCode}</div>
                              <div className="text-slate-800 font-medium">{mov.productName}</div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeStyles}`}>
                                {mov.type}
                              </span>
                            </td>
                            <td
                              className={`py-3 px-4 text-right font-mono font-extrabold whitespace-nowrap ${
                                isOut ? 'text-rose-600' : 'text-emerald-600'
                              }`}
                            >
                              {isOut ? `-${mov.quantity}` : `+${mov.quantity}`} unid.
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                              {mov.documentRef}
                            </td>
                            <td className="py-3 px-4 text-slate-600 max-w-xs">{mov.reason}</td>
                            <td className="py-3 px-4 whitespace-nowrap text-slate-700 font-medium">
                              {mov.user}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-10 px-4 text-center text-slate-500">
                          <div className="flex flex-col items-center gap-2">
                            <span className="material-symbols-outlined text-[28px] text-slate-300">
                              event_busy
                            </span>
                            <p className="font-semibold text-slate-700">
                              No se encontraron movimientos del Kardex para los criterios seleccionados.
                            </p>
                            <button
                              type="button"
                              onClick={handleResetKardexFilters}
                              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold transition-colors cursor-pointer"
                            >
                              Mostrar todo el historial
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>

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
                  <span>Control Preventivo de Inventario</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800">
                  <span className="text-blue-700 font-bold">Criterio de Alerta:</span> Stock Actual ≤ Stock Mínimo{' '}
                  <span className="text-slate-300">|</span>{' '}
                  <span className="text-rose-600 font-bold">Condición Crítica:</span> Stock Actual ≤ (Stock Mínimo * 0.5) ó Stock Actual ≤ 1
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong className="text-slate-900 font-semibold">Regla de Inventario:</strong> El stock no se altera manualmente en la ficha de producto; cualquier incremento se registra mediante orden de entrada y factura de proveedor para mantener la trazabilidad en el Kardex.
                </p>
                <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                  <span className="flex items-center gap-1 font-semibold text-emerald-700">
                    <span className="material-symbols-outlined text-[16px]">lock</span>
                    Control de Existencias Activo
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-blue-700">
                    <span className="material-symbols-outlined text-[16px]">sync_alt</span>
                    Descuento Automático en Ventas
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
                Inventario Sin Negativos
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
                Auditoría Detallada de Existencias en Umbral Preventivo
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

      {/* SUB-TAB 4: Historial General de Ventas */}
      {activeSubTab === 'historial-ventas' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Operational Policy Banner */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-8 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[22px]">policy</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      Política Operativa de Anulación de Ventas
                    </h3>
                    <span className="text-xs text-slate-500">
                      Control de devoluciones, reposición de stock e invalidación de comprobantes
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
                      Exige confirmación de devolución del dinero en efectivo o transferencia. Restituye automáticamente las unidades al catálogo mediante movimiento de reposición en el Kardex, registra el egreso en caja e invalida el comprobante correlativo.
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

            <div className="self-end pt-2 flex items-center gap-2">
              <button
                onClick={() => {
                  setStatusFilter('TODOS');
                  setVendorFilter('TODOS');
                  setDateFilter('');
                }}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer transition-colors"
              >
                Restablecer Filtros
              </button>

              <button
                onClick={handleExportSalesCsv}
                disabled={filteredSales.length === 0}
                className={`px-3.5 py-2 font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs ${
                  filteredSales.length === 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                }`}
                title="Descargar registros filtrados en formato CSV UTF-8 con BOM"
              >
                <span className="material-symbols-outlined text-[16px]">csv</span>
                <span>Exportar CSV ({filteredSales.length})</span>
              </button>
            </div>
          </div>

          {/* Sales Ledger Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">Libro Auxiliar de Ventas Auditadas</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-mono text-[11px] font-bold">
                  {filteredSales.length} de {sales.length} registros
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                Auditor activo: <strong>{currentUser.name}</strong> · Formato CSV UTF-8 (compatible con Excel)
              </span>
            </div>
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
                            title="Anular venta y revertir inventario"
                          >
                            Anular
                          </button>
                        ) : (
                          <span className="text-[11px] text-rose-600 italic">Anulada</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Mostrando {filteredSales.length} transacciones registradas</span>
              <span className="text-[11px] text-slate-400">Registro contable verificado</span>
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
                <span className="text-xs text-rose-600">{voidSales.length} anulaciones registradas</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: Arqueo y Caja por Turno */}
      {activeSubTab === 'arqueo-caja' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Historial de Arqueos y Movimientos de Caja</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Registro inmutable de aperturas, cobros, egresos autorizados y devoluciones de gaveta fiscal.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportManagementPdf}
                className="px-3.5 py-2 bg-slate-900 hover:bg-blue-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
              >
                <span className="material-symbols-outlined text-[17px]">picture_as_pdf</span>
                <span>Descargar Resumen Gerencial PDF</span>
              </button>
            </div>

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
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-200 text-[11px] font-mono">
                <div>Apertura: ${cashSession.openingBalance.toLocaleString('es-CO')}</div>
                <div>Ingresos Efectivo: +${cashSession.totalSalesCash.toLocaleString('es-CO')}</div>
                <div>Transferencias: +${cashSession.totalSalesBank.toLocaleString('es-CO')}</div>
                <div>Egresos/Devol.: -${(cashSession.totalOutflows + cashSession.totalRefunds).toLocaleString('es-CO')}</div>
                <div className="font-bold text-slate-900">
                  Saldo Físico: ${(cashSession.openingBalance + cashSession.totalSalesCash - cashSession.totalOutflows - cashSession.totalRefunds).toLocaleString('es-CO')}
                </div>
              </div>
            </div>

            {/* Live Cash Movements Table */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">Detalle de Movimientos de Caja ({cashMovements.length})</span>
                <span className="text-[11px] text-slate-500">Incluido en el reporte PDF gerencial</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200">
                      <th className="py-2.5 px-4">ID</th>
                      <th className="py-2.5 px-4">Fecha / Hora</th>
                      <th className="py-2.5 px-4">Tipo</th>
                      <th className="py-2.5 px-4">Método</th>
                      <th className="py-2.5 px-4">Concepto</th>
                      <th className="py-2.5 px-4 text-right">Importe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {cashMovements.map((mov) => (
                      <tr key={mov.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-900">#{mov.id}</td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className="font-semibold text-slate-900">{mov.date}</span>{' '}
                          <span className="text-[10px] text-slate-400">{mov.time}</span>
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {mov.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px]">{mov.method}</td>
                        <td className="py-2.5 px-4 text-slate-600">{mov.concept}</td>
                        <td
                          className={`py-2.5 px-4 text-right font-mono font-bold whitespace-nowrap ${
                            mov.amount < 0 ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          {mov.amount < 0
                            ? `-$${Math.abs(mov.amount).toLocaleString('es-CO')}`
                            : `+$${mov.amount.toLocaleString('es-CO')}`}{' '}
                          COP
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
