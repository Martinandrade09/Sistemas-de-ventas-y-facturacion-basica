import React, { useState } from 'react';
import { Product, KardexMovement, User } from '../types';

interface InventoryViewProps {
  products: Product[];
  kardexMovements: KardexMovement[];
  currentUser: User;
  onOpenStockModal: (productId?: number) => void;
  onAddStockQuick: (productId: number, quantity: number, docRef: string, reason: string) => void;
  onToast: (msg: string, isError?: boolean) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  kardexMovements,
  currentUser,
  onOpenStockModal,
  onAddStockQuick,
  onToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Quick entry form state
  const [quickProductId, setQuickProductId] = useState<number>(3); // Mouse M170 (low stock)
  const [quickQuantity, setQuickQuantity] = useState<number>(10);
  const [quickDocRef, setQuickDocRef] = useState<string>('FAC-PROV-2024-8821');
  const [quickReason, setQuickReason] = useState<string>(
    'Compra a proveedor mayorista Factura #F-4910'
  );
  const [isSubmittingQuick, setIsSubmittingQuick] = useState(false);

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCat = categoryFilter === 'all' || p.category.toLowerCase() === categoryFilter.toLowerCase();
    const matchesStatus = statusFilter === 'all' || p.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesCat && matchesStatus;
  });

  const totalPhysicalUnits = products.reduce((sum, p) => sum + p.currentStock, 0);
  const lowStockCount = products.filter((p) => p.currentStock <= p.minStock).length;
  const inventoryValuation = products.reduce((sum, p) => sum + p.currentStock * p.costPrice, 0);

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickQuantity <= 0) {
      onToast('Ingrese una cantidad válida mayor a 0.', true);
      return;
    }

    setIsSubmittingQuick(true);
    setTimeout(() => {
      setIsSubmittingQuick(false);
      onAddStockQuick(quickProductId, quickQuantity, quickDocRef, quickReason);
      const prod = products.find((p) => p.id === quickProductId);
      onToast(`+${quickQuantity} unidades registradas en Kardex para ${prod?.code || 'producto'}.`, false);
    }, 600);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6 animate-in fade-in duration-150">
      {/* 1. Header & Context */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full">
              GESTIÓN LOGÍSTICA · RF-05 / RF-06 / RF-16
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Catálogo de Productos y Control de Inventario
          </h1>
          <p className="text-sm text-slate-500 max-w-3xl leading-relaxed">
            Administración de referencias comerciales, parametrización de mínimos y auditoría de existencias físicas mediante el motor transaccional PDO InnoDB.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={() => onOpenStockModal()}
            className="px-4 py-2.5 bg-slate-900 hover:bg-blue-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add_box</span>
            <span>+ Registrar Entrada / Ajuste de Stock (RF-06)</span>
          </button>
        </div>
      </div>

      {/* 2. Rule RF-06 Banner */}
      <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
          <span className="material-symbols-outlined text-[20px]">shield</span>
        </div>
        <div className="text-xs text-blue-900 space-y-0.5">
          <strong className="font-bold text-slate-900">
            Regla de Integridad Contable (RF-06)
          </strong>
          <p className="text-slate-600">
            El stock inicial y los incrementos <strong>no se editan directamente</strong> en la ficha del producto; se registran obligatoriamente mediante <strong>Movimientos de Inventario</strong> con trazabilidad del 100% y referencia documental. <span className="font-mono text-blue-700 font-semibold">Inmutable · Trigger BD</span>.
          </p>
        </div>
      </div>

      {/* 3. Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Total Ítems
          </span>
          <div className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
            {products.length}
          </div>
          <span className="text-xs text-emerald-600 font-bold mt-1">✓ 100% catalogados</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Unidades Físicas
          </span>
          <div className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
            {totalPhysicalUnits}
          </div>
          <span className="text-xs text-slate-500 mt-1">En bodega central</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Alerta Mínimo
          </span>
          <div className="text-2xl font-extrabold text-rose-600 font-mono mt-1">
            {lowStockCount}
          </div>
          <span className="text-xs text-rose-600 font-bold mt-1">⚠ Requieren compra</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Valor Inventario
          </span>
          <div className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
            ${(inventoryValuation / 1000000).toFixed(1)}M
          </div>
          <span className="text-xs text-slate-500 mt-1">Costo de reposición</span>
        </div>
      </div>

      {/* 4. Main Two Column Layout: Table vs Fast Entry Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Table */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            {/* Search and Filters */}
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por código o nombre (ej: COD-SSD, Logitech)..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-700 font-medium focus:outline-none"
                >
                  <option value="all">Todas las categorías</option>
                  <option value="almacenamiento">Almacenamiento</option>
                  <option value="perifericos">Periféricos</option>
                  <option value="componentes">Componentes</option>
                  <option value="accesorios">Accesorios</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-700 font-medium focus:outline-none"
                >
                  <option value="all">Estado: Todos</option>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
            </div>

            {/* Products Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200">
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Producto / Descripción</th>
                    <th className="py-3 px-4">Categoría</th>
                    <th className="py-3 px-4">Precio Venta</th>
                    <th className="py-3 px-4 text-center">Stock Actual</th>
                    <th className="py-3 px-4 text-center">Stock Mínimo</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredProducts.map((p) => {
                    const isCritical = p.currentStock <= Math.floor(p.minStock * 0.5) || p.currentStock <= 1;
                    const isLow = !isCritical && p.currentStock <= p.minStock;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {p.code}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{p.name}</div>
                          <div className="text-[11px] text-slate-400 line-clamp-1">{p.description}</div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                            {p.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                          ${p.salePrice.toLocaleString('es-CO')}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex flex-col items-center px-2.5 py-1 rounded-xl text-xs font-bold ${
                              isCritical
                                ? 'bg-rose-100 text-rose-800'
                                : isLow
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            <span className="text-sm">{p.currentStock} unid.</span>
                            <span className="text-[9px] uppercase font-bold tracking-tight">
                              {isCritical ? 'CRÍTICO' : isLow ? 'STOCK BAJO' : 'ÓPTIMO'}
                            </span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-600 whitespace-nowrap">
                          Mín: {p.minStock} unid.
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => onOpenStockModal(p.id)}
                            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                          >
                            Ajustar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Mostrando {filteredProducts.length} de {products.length} registros activos</span>
              <div className="flex items-center gap-1 font-semibold text-slate-700">
                <span className="px-2 py-0.5 rounded bg-slate-200">1</span>
              </div>
            </div>
          </div>

          {/* Academic Architecture MVC Note */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center gap-2 shadow-xs">
            <span className="material-symbols-outlined text-[18px] text-blue-600">terminal</span>
            <span>
              <strong>Arquitectura MVC:</strong> Controlador <code className="font-mono text-slate-800">InventarioController::registrarEntrada()</code> ejecuta transacción atómica en tabla <code className="font-mono text-slate-800">kardex_movimientos</code> con actualización automática de <code className="font-mono text-slate-800">productos.stock_actual</code>.
            </span>
          </div>
        </div>

        {/* Right Column (4 cols): Registro Rápido de Entrada (RF-06) Form */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 text-[20px]">
                  inventory
                </span>
                <h3 className="font-bold text-xs text-slate-900">Registro Rápido de Entrada</h3>
              </div>
              <span className="px-2 py-0.2 rounded font-mono text-[10px] font-bold bg-blue-100 text-blue-800">
                RF-06
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Entrada de stock inicial o compras a proveedores. Afecta directamente el Kardex general.
            </p>

            <form onSubmit={handleQuickSubmit} className="space-y-3.5 text-xs text-slate-800">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Producto Seleccionado *</label>
                <select
                  value={quickProductId}
                  onChange={(e) => setQuickProductId(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} · {p.name} ({p.currentStock} unid.)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Cantidad a Ingresar *</label>
                  <div className="flex items-center gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setQuickQuantity((q) => q + 5)}
                      className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded font-bold cursor-pointer"
                    >
                      +5
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickQuantity((q) => q + 10)}
                      className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded font-bold cursor-pointer"
                    >
                      +10
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickQuantity((q) => q + 25)}
                      className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded font-bold cursor-pointer"
                    >
                      +25
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  min={1}
                  value={quickQuantity}
                  onChange={(e) => setQuickQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Motivo / Concepto Documental *
                </label>
                <input
                  type="text"
                  value={quickReason}
                  onChange={(e) => setQuickReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Obligatorio para auditorías tributarias y docentes.
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Responsable Auditor</label>
                <div className="p-2 rounded-lg bg-slate-100 text-slate-800 font-semibold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-blue-600">verified_user</span>
                  <span>{currentUser.name} ({currentUser.roleLabel.split('·')[0]})</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingQuick}
                className="w-full py-2.5 bg-slate-900 hover:bg-blue-600 text-white font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSubmittingQuick ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[16px]">autorenew</span>
                    <span>Registrando...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    <span>Guardar Movimiento de Inventario</span>
                  </>
                )}
              </button>
            </form>

            {/* Últimos Movimientos Log */}
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>ÚLTIMOS MOVIMIENTOS</span>
                <span className="font-mono text-[10px] text-blue-600">PDO : TRANSACTION</span>
              </div>
              <div className="space-y-1.5 font-mono text-[11px]">
                {kardexMovements.slice(0, 3).map((km) => (
                  <div key={km.id} className="flex justify-between items-center text-slate-600">
                    <span>
                      {km.productCode} (+{km.quantity} unid)
                    </span>
                    <span className="text-emerald-700 font-bold">OK #{km.id}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Taxonomic breakdown footer */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-blue-600">category</span>
            RF-16: Parámetros del Catálogo & Categorización Taxonómica
          </span>
          <span className="font-mono text-[11px] text-slate-400">Entorno MySQL InnoDB 8.0 · 3 Categorías Activas</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <strong className="text-xs text-slate-900 block">Almacenamiento</strong>
              <span className="text-[11px] text-slate-500">Discos SSD, HDD, MicroSD</span>
            </div>
            <span className="font-mono font-bold text-xs bg-white px-2 py-1 rounded border border-slate-200 text-slate-700">
              1 SKU
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <strong className="text-xs text-slate-900 block">Periféricos</strong>
              <span className="text-[11px] text-slate-500">Teclados, Ratones, Audio</span>
            </div>
            <span className="font-mono font-bold text-xs bg-white px-2 py-1 rounded border border-slate-200 text-slate-700">
              3 SKUs
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <strong className="text-xs text-slate-900 block">Componentes</strong>
              <span className="text-[11px] text-slate-500">RAM, Procesadores, Placas</span>
            </div>
            <span className="font-mono font-bold text-xs bg-white px-2 py-1 rounded border border-slate-200 text-slate-700">
              1 SKU
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
