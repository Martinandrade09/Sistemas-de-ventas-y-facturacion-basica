import React, { useState } from 'react';
import { Sale, CashSession, User, Product } from '../types';

interface CashRegisterViewProps {
  sales: Sale[];
  products: Product[];
  cashSession: CashSession;
  currentUser: User;
  onConfirmPayment: (saleId: number, method: 'EFECTIVO' | 'TRANSFERENCIA', amountReceived?: number) => void;
  onOpenBlindCountModal: () => void;
  onOpenSqlModal: () => void;
  onViewVoucher: (sale: Sale) => void;
  onToast: (msg: string, isError?: boolean) => void;
}

export const CashRegisterView: React.FC<CashRegisterViewProps> = ({
  sales,
  products,
  cashSession,
  currentUser,
  onConfirmPayment,
  onOpenBlindCountModal,
  onOpenSqlModal,
  onViewVoucher,
  onToast,
}) => {
  const pendingSales = sales.filter((s) => s.status === 'PENDIENTE');

  // Currently selected pending sale to process in checkout gateway
  const [selectedSaleId, setSelectedSaleId] = useState<number>(pendingSales[0]?.id || 1042);
  const [paymentMethod, setPaymentMethod] = useState<'EFECTIVO' | 'TRANSFERENCIA'>('EFECTIVO');
  const [receivedAmount, setReceivedAmount] = useState<number>(600000);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastPaidSale, setLastPaidSale] = useState<Sale | null>(null);

  const activeSale = pendingSales.find((s) => s.id === selectedSaleId) || pendingSales[0] || sales[0];

  const changeAmount = paymentMethod === 'EFECTIVO' && activeSale
    ? Math.max(0, receivedAmount - activeSale.total)
    : 0;

  const handlePay = () => {
    if (!activeSale) {
      onToast('No hay ninguna venta seleccionada para cobrar.', true);
      return;
    }

    if (paymentMethod === 'EFECTIVO' && receivedAmount < activeSale.total) {
      onToast(`El monto recibido ($${receivedAmount.toLocaleString('es-CO')}) es menor al total facturado ($${activeSale.total.toLocaleString('es-CO')}).`, true);
      return;
    }

    // Check stock availability
    for (const item of activeSale.items) {
      const prod = products.find((p) => p.id === item.productId);
      if (prod && prod.currentStock < item.quantity) {
        onToast(`Error de concurrencia: Stock insuficiente para ${prod.name} (Stock: ${prod.currentStock}, Requerido: ${item.quantity}).`, true);
        return;
      }
    }

    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onConfirmPayment(activeSale.id, paymentMethod, paymentMethod === 'EFECTIVO' ? receivedAmount : activeSale.total);
      setLastPaidSale({
        ...activeSale,
        status: 'PAGADA',
        paymentMethod,
        amountReceived: paymentMethod === 'EFECTIVO' ? receivedAmount : activeSale.total,
        changeGiven: changeAmount,
        cashierName: `${currentUser.name} (ID: ${currentUser.id})`,
        verificationHash: 'e4d909c290d0f0b1ca068ffaddf22cbd0',
      });
      onToast(`Transacción #${activeSale.correlativeNumber} confirmada. Stock y Caja actualizados (COMMIT PDO).`, false);
    }, 800);
  };

  // Expected physical drawer cash
  const expectedPhysical = cashSession.openingBalance + cashSession.totalSalesCash - cashSession.totalOutflows - cashSession.totalRefunds;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6 animate-in fade-in duration-150">
      {/* 1. Meta Header Strip */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 font-bold px-3 py-1.5 rounded-xl border border-emerald-200/60">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{cashSession.registerNumber}</span>
          </div>

          <span className="text-slate-600">
            ESTADO: <strong className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{cashSession.status}</strong>
          </span>

          <span className="text-slate-300">|</span>

          <span className="text-slate-600">
            CAJERO: <strong>{cashSession.cashier} (ID: {cashSession.cashierId})</strong>
          </span>

          <span className="text-slate-300">|</span>

          <span className="text-slate-600">
            APERTURA: <strong>Hoy · {cashSession.openingTime}</strong>
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-blue-700 font-bold bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200/60">
          <span className="material-symbols-outlined text-[16px]">verified</span>
          <span>Módulo de Auditoría Fiscal Activo</span>
        </div>
      </div>

      {/* 2. Dynamic Cash Register Audit Strip (Arqueo Dinámico) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <span className="material-symbols-outlined text-blue-600 text-[20px]">account_balance_wallet</span>
            <h3>Auditoría en Tiempo Real de Caja Física (Arqueo Dinámico)</h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">Partidas Contables Conciliadas: 08 Registros</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Saldo Inicial */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <span className="text-[11px] text-slate-500 font-medium">Saldo Inicial Efectivo</span>
            <span className="text-lg font-bold text-slate-900 font-mono mt-1">
              ${cashSession.openingBalance.toLocaleString('es-CO')}
            </span>
            <span className="text-[10px] text-slate-400 mt-1">Base inicial de cajón</span>
          </div>

          {/* Ingresos Ventas */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <span className="text-[11px] text-emerald-700 font-semibold">(+) Ingresos Ventas</span>
            <span className="text-lg font-bold text-emerald-600 font-mono mt-1">
              +${cashSession.totalSalesCash.toLocaleString('es-CO')}
            </span>
            <span className="text-[10px] text-slate-400 mt-1">Cobranzas en efectivo</span>
          </div>

          {/* Egresos */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <span className="text-[11px] text-rose-700 font-semibold">(-) Egresos Efectivo</span>
            <span className="text-lg font-bold text-rose-600 font-mono mt-1">
              -${cashSession.totalOutflows.toLocaleString('es-CO')}
            </span>
            <span className="text-[10px] text-slate-400 mt-1">Suministros autorizados</span>
          </div>

          {/* Devoluciones */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <span className="text-[11px] text-slate-500 font-medium">(-) Devoluciones</span>
            <span className="text-lg font-bold text-slate-900 font-mono mt-1">
              -${cashSession.totalRefunds.toLocaleString('es-CO')}
            </span>
            <span className="text-[10px] text-slate-400 mt-1">Sin anulaciones hoy</span>
          </div>

          {/* Saldo Esperado Físico */}
          <div className="p-3.5 rounded-xl bg-slate-900 text-white flex flex-col justify-between shadow-sm">
            <span className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider">
              (=) SALDO ESPERADO
            </span>
            <span className="text-xl font-extrabold text-emerald-400 font-mono mt-1">
              ${expectedPhysical.toLocaleString('es-CO')}
            </span>
            <span className="text-[10px] text-slate-400 mt-1">Cajón físico a cuadrar</span>
          </div>

          {/* Transferencias Bancarias */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 flex flex-col justify-between">
            <span className="text-[11px] text-blue-800 font-semibold flex items-center justify-between">
              <span>Transferencias Bancarias</span>
              <span className="material-symbols-outlined text-[15px]">account_balance</span>
            </span>
            <span className="text-lg font-bold text-blue-700 font-mono mt-1">
              ${cashSession.totalSalesBank.toLocaleString('es-CO')}
            </span>
            <span className="text-[10px] text-slate-500 mt-1">No afecta el cajón físico</span>
          </div>
        </div>
      </div>

      {/* 3. Concurrency Architecture Banner */}
      <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
          <span className="material-symbols-outlined text-[20px]">lock</span>
        </div>
        <div className="text-xs text-blue-900 space-y-0.5">
          <div className="flex items-center gap-2">
            <strong className="font-bold text-slate-900">
              Arquitectura Transaccional: Control de Concurrencia PESSIMISTIC_WRITE
            </strong>
            <code className="bg-blue-100 text-blue-800 font-bold px-2 py-0.2 rounded font-mono text-[11px]">
              SELECT ... FOR UPDATE
            </code>
          </div>
          <p className="text-slate-600">
            En el motor relacional (InnoDB / MySQL), la confirmación de pago activa una transacción atómica mediante PHP Data Objects (PDO). Los registros de inventario correspondientes a los artículos de la orden se bloquean temporalmente a nivel de fila durante la confirmación, garantizando que el stock auditado no sea vendido simultáneamente en otro terminal POS o canal virtual.
          </p>
        </div>
      </div>

      {/* 4. Main Two Column Section: Pending Queue vs Checkout Gateway */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Ventas Pendientes por Cobrar */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Ventas Pendientes por Cobrar</h3>
                <p className="text-xs text-slate-500">Pedidos despachados desde mostrador en espera de validación de pago</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 font-mono">
                {pendingSales.length} órdenes en cola
              </span>
            </div>

            {pendingSales.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-1">
                <span className="material-symbols-outlined text-[32px] text-slate-300">done_all</span>
                <p>No hay ventas pendientes por cobrar en este momento.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingSales.map((sale) => {
                  const isSelected = sale.id === activeSale?.id;
                  return (
                    <div
                      key={sale.id}
                      onClick={() => setSelectedSaleId(sale.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-mono font-bold text-xs flex items-center justify-center">
                              #{sale.id.toString().slice(-2)}
                            </span>
                            <span className="font-bold text-slate-900 text-sm">
                              Venta #{sale.id}
                            </span>
                            <span className="px-2 py-0.2 rounded font-bold text-[10px] bg-blue-100 text-blue-800 uppercase">
                              EN CAJA
                            </span>
                          </div>
                          <p className="text-xs text-slate-600">
                            Cliente: <strong className="text-slate-800">{sale.customer.name}</strong> · CC: {sale.customer.documentNumber}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="font-mono font-extrabold text-base text-slate-900 block">
                            ${sale.total.toLocaleString('es-CO')} COP
                          </span>
                          <span className="text-[10px] text-slate-400">Total Facturado</span>
                        </div>
                      </div>

                      {/* Items Preview */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1 text-xs">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                          Artículos Ordenados:
                        </span>
                        {sale.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-slate-600">
                            <span>{it.quantity}x {it.productName}</span>
                            <span className="font-mono">${it.subtotal.toLocaleString('es-CO')}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">badge</span>
                          Vendedor: {sale.vendorName}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          Hace {Math.max(1, Math.floor(Math.random() * 8))} minutos
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Database Row Lock State Scheme (Pedagogical) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-blue-600">table_rows</span>
                Esquema de Estado en Base de Datos (Tabla: <code className="font-mono text-slate-700">`ventas_transaccion`</code>)
              </span>
              <span className="text-[10px] font-mono text-slate-400">PDO Driver Session</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200">
                    <th className="py-2 px-3">ID_VENTA</th>
                    <th className="py-2 px-3">FK_CAJERO</th>
                    <th className="py-2 px-3">TOTAL_BRUTO</th>
                    <th className="py-2 px-3">ESTADO_PROCESO</th>
                    <th className="py-2 px-3">LOCK_STOCK</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {pendingSales.slice(0, 3).map((s, idx) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold text-blue-600">#{s.id}</td>
                      <td className="py-2 px-3">{idx === 0 ? '042 (Andrés Ruiz)' : 'Pendiente'}</td>
                      <td className="py-2 px-3 font-bold">${s.total.toLocaleString('es-CO')}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          idx === 0 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {idx === 0 ? 'PAGO_EN_CURSO' : 'EN_ESPERA'}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          idx === 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {idx === 0 ? 'ACTIVO (Row Locked)' : 'LIBRE'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Pasarela Transaccional de Cobro */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                  MÓDULO DE COBRANZA
                </span>
                <h3 className="font-bold text-sm text-slate-900">
                  Pasarela Transaccional {activeSale ? `(Venta #${activeSale.id})` : ''}
                </h3>
              </div>
              <span className="material-symbols-outlined text-blue-600 text-[24px]">point_of_sale</span>
            </div>

            {activeSale ? (
              <div className="space-y-4 text-xs">
                {/* Breakdown */}
                <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal Neto:</span>
                    <span className="font-mono font-medium">${activeSale.subtotalNeto.toLocaleString('es-CO')} COP</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>IVA (19% Discriminado):</span>
                    <span className="font-mono font-medium">${activeSale.iva.toLocaleString('es-CO')} COP</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
                    <span className="font-bold text-slate-900">Total Liquidado a Cobrar:</span>
                    <span className="font-mono font-extrabold text-2xl text-blue-600">
                      ${activeSale.total.toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>

                {/* Método de Liquidación Tabs */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Método de Liquidación:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('EFECTIVO')}
                      className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all cursor-pointer ${
                        paymentMethod === 'EFECTIVO'
                          ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">payments</span>
                      <span>Efectivo (Cajón)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('TRANSFERENCIA')}
                      className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all cursor-pointer ${
                        paymentMethod === 'TRANSFERENCIA'
                          ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">account_balance</span>
                      <span>Transferencia Bancaria</span>
                    </button>
                  </div>
                </div>

                {/* Cash Payment Details */}
                {paymentMethod === 'EFECTIVO' ? (
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="font-bold text-slate-700">Monto Recibido en Efectivo:</label>
                        <span className="text-[10px] text-slate-400 font-mono">Moneda: COP</span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                          $
                        </span>
                        <input
                          type="number"
                          step={1000}
                          value={receivedAmount}
                          onChange={(e) => setReceivedAmount(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-right"
                        />
                      </div>
                    </div>

                    {/* Change / Vuelto */}
                    <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700">Cambio / Devuelto al Cliente:</span>
                        <span className="font-mono font-extrabold text-xl text-blue-700">
                          ${changeAmount.toLocaleString('es-CO')} COP
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Asistencia Operativa: El valor de cambio es un cálculo de ayuda al cajero. En la base de datos se almacena estrictamente el importe exacto de la venta (${activeSale.total.toLocaleString('es-CO')}).
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-800 block">Comprobante de Transferencia:</span>
                    <p className="text-[11px] text-slate-500">
                      Confirmación electrónica mediante QR Bancolombia / Nequi / Redeban. La transacción no incrementa el efectivo físico en gaveta.
                    </p>
                  </div>
                )}

                {/* Confirm Button */}
                <button
                  type="button"
                  onClick={handlePay}
                  disabled={isProcessing}
                  className="w-full py-3 bg-slate-900 hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  {isProcessing ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]">autorenew</span>
                      <span>Ejecutando COMMIT PDO...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">verified</span>
                      <span>Confirmar Cobro y Emitir Comprobante</span>
                    </>
                  )}
                </button>
                <p className="text-[10px] text-center text-slate-400 font-mono">
                  Ejecutar Transacción PDO (SELECT ... FOR UPDATE)
                </p>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                Seleccione una orden pendiente en el panel izquierdo para cobrar.
              </div>
            )}
          </div>

          {/* Correlative Receipt Box (Generated or Last Paid) */}
          {(lastPaidSale || activeSale) && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600 text-[18px]">receipt</span>
                  <span className="font-bold text-slate-900">Comprobante Correlativo Generado</span>
                </div>
                <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                  {lastPaidSale?.voucherNumber || activeSale?.voucherNumber}
                </span>
              </div>

              <div className="space-y-1 text-slate-600 text-[11px]">
                <div className="flex justify-between">
                  <span>Emisión:</span>
                  <span className="font-medium">14 Nov 2024 - 10:48:12</span>
                </div>
                <div className="flex justify-between">
                  <span>Caja & Cajero:</span>
                  <span className="font-medium">Caja #004 / {currentUser.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Condición de Pago:</span>
                  <span className="font-medium">Efectivo (Contado Inmediato)</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                  <span>Hash de Verificación:</span>
                  <span className="font-mono text-[10px] text-slate-500">e4d909c290d0f0b1ca068ffaddf22cbd0</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => onViewVoucher(lastPaidSale || activeSale)}
                  className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  <span>Imprimir Ticket</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenBlindCountModal}
                  className="py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">point_of_sale</span>
                  <span>Ver Registro de Caja</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Bottom Action & Pedagogical Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px]">school</span>
          </div>
          <div>
            <h4 className="font-bold text-slate-900">Trazabilidad Pedagógica (Requisitos RF-09 a RF-12)</h4>
            <span className="text-slate-500 text-[11px]">
              RF-09: Control de apertura | RF-10: Cierre y cuadre ciego | RF-11: Registro de recaudos | RF-12: Emisión y bloqueo
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSqlModal}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Documentación SQL
          </button>
          <button
            onClick={onOpenBlindCountModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            Cerrar Turno Actual (Arqueo Ciego)
          </button>
        </div>
      </div>
    </div>
  );
};
