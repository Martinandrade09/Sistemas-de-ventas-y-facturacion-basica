import React, { useState } from 'react';
import { Sale, User } from '../types';

interface VoidSaleModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmVoid: (saleId: number, reason: string, refundMethod: 'EFECTIVO' | 'TRANSFERENCIA') => void;
  currentUser: User;
  onToast: (msg: string, isError?: boolean) => void;
}

export const VoidSaleModal: React.FC<VoidSaleModalProps> = ({
  sale,
  isOpen,
  onClose,
  onConfirmVoid,
  currentUser,
  onToast,
}) => {
  if (!isOpen || !sale) return null;

  const [preconditionAccepted, setPreconditionAccepted] = useState(false);
  const [refundMethod, setRefundMethod] = useState<'EFECTIVO' | 'TRANSFERENCIA'>('EFECTIVO');
  const [reason, setReason] = useState(
    'Producto entregado presenta incompatibilidad técnica de frecuencias en placa madre del cliente. Cliente solicita reembolso total inmediato en mostrador.'
  );
  const [isExecuting, setIsExecuting] = useState(false);

  const charCount = reason.length;
  const isReasonValid = charCount >= 10;
  const isPaid = sale.status === 'PAGADA';

  const handleCancelOperation = () => {
    onToast('Anulación cancelada. La venta y el inventario permanecen sin cambios.', false);
    onClose();
  };

  const handleExecute = () => {
    if (isPaid && !preconditionAccepted) {
      onToast('Precondición incumplida: Debe certificar la entrega del reembolso al cliente antes de anular.', true);
      return;
    }
    if (!isReasonValid) {
      onToast('El motivo de anulación debe contener al menos 10 caracteres obligatorios.', true);
      return;
    }

    setIsExecuting(true);
    setTimeout(() => {
      setIsExecuting(false);
      onConfirmVoid(sale.id, reason, refundMethod);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header Strip */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">gavel</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">
                  Anulación Controlada de Venta
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Reversión del comprobante, reposición automática de inventario y ajuste en caja
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-slate-800">
          {/* Sale Summary Banner */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-blue-600">
                  {sale.correlativeNumber} ({sale.voucherNumber})
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    sale.status === 'PAGADA'
                      ? 'bg-emerald-100 text-emerald-800'
                      : sale.status === 'PENDIENTE'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  ESTADO ACTUAL: {sale.status}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Cliente: <strong className="text-slate-900">{sale.customer.name}</strong> ({sale.customer.documentType}: {sale.customer.documentNumber})
              </p>
              <p className="text-xs text-slate-500">
                Vendedor: {sale.vendorName} · Fecha emisión: {sale.date} {sale.time}
              </p>
            </div>

            <div className="text-right sm:self-center shrink-0">
              <span className="text-xs text-slate-400 uppercase tracking-wider block">Total Transacción</span>
              <span className="text-2xl font-bold text-slate-900 font-mono">
                ${sale.total.toLocaleString('es-CO')} <span className="text-xs font-normal text-slate-500">COP</span>
              </span>
            </div>
          </div>

          {/* Items breakdown to be restocked */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center justify-between">
              <span>Artículos de la Orden a Restituir a Inventario</span>
              <span className="text-slate-500 font-normal">Kardex: REPOSICION_ANULACION</span>
            </div>
            <div className="divide-y divide-slate-100 p-2">
              {sale.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 px-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                      {item.productCode}
                    </span>
                    <span className="font-medium text-slate-800">{item.productName}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-emerald-700 font-bold">
                      +{item.quantity} unidades a almacén
                    </span>
                    <span className="font-mono text-slate-700 font-medium">
                      ${item.subtotal.toLocaleString('es-CO')} COP
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Conditional Cash Refund Section if Sale was PAGADA */}
          {isPaid && (
            <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <span className="material-symbols-outlined text-[20px] text-amber-600">payments</span>
                <span>Confirmación Obligatoria de Reembolso</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Dado que esta venta se encuentra en estado <strong>PAGADA</strong>, la ejecución de la anulación registrará un <strong>asiento de egreso por devolución</strong> en la caja activa y anulará el comprobante fiscal correlativo.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Método de Devolución
                  </label>
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value as any)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="EFECTIVO">Efectivo (Gaveta de Caja #004)</option>
                    <option value="TRANSFERENCIA">Transferencia / Reversión Bancaria</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Auditor Responsable
                  </label>
                  <div className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-800 flex items-center justify-between">
                    <span>{currentUser.name}</span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                      {currentUser.id}
                    </span>
                  </div>
                </div>
              </div>

              <label className="flex items-start gap-2.5 pt-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={preconditionAccepted}
                  onChange={(e) => setPreconditionAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Certifico bajo fe de auditoría que se ha restituido el importe de{' '}
                  <strong className="text-slate-900">${sale.total.toLocaleString('es-CO')} COP</strong> al cliente mediante {refundMethod.toLowerCase()}.
                </span>
              </label>
            </div>
          )}

          {/* Reason Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                Motivo y Causal de Anulación (obligatorio - mín. 10 caracteres)
              </label>
              <span
                className={`text-[11px] font-bold ${
                  isReasonValid ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {charCount} / 255 caracteres {isReasonValid ? '(Válido)' : '(Mín. 10 obligatorios)'}
              </span>
            </div>
            <textarea
              rows={3}
              maxLength={255}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Indique la justificación comercial o administrativa para la anulación de esta venta..."
              className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none text-slate-800"
            />
            <p className="text-[11px] text-slate-400">
              Este argumento quedará registrado de forma permanente en el historial de ventas anuladas.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Listo para procesar anulación</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleCancelOperation}
              disabled={isExecuting}
              className="px-4 py-2 bg-white text-slate-700 font-semibold text-xs rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar / Descartar
            </button>

            <button
              onClick={handleExecute}
              disabled={isExecuting || !isReasonValid || (isPaid && !preconditionAccepted)}
              className={`px-5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                isExecuting || !isReasonValid || (isPaid && !preconditionAccepted)
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20 active:scale-[0.98]'
              }`}
            >
              {isExecuting ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[16px]">autorenew</span>
                  <span>Procesando anulación...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">warning</span>
                  <span>Confirmar Anulación de Venta</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
