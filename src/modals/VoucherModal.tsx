import React from 'react';
import { Sale } from '../types';

interface VoucherModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenSqlLog?: () => void;
}

export const VoucherModal: React.FC<VoucherModalProps> = ({
  sale,
  isOpen,
  onClose,
  onOpenSqlLog,
}) => {
  if (!isOpen || !sale) return null;

  const isAnulada = sale.status === 'ANULADA';
  const isPaid = sale.status === 'PAGADA';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Top Control Bar (Hidden on print) */}
        <div className="no-print p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-400 text-[22px]">receipt_long</span>
            <div className="flex flex-col">
              <span className="font-bold text-sm">Comprobante Fiscal Electrónico</span>
              <span className="text-xs text-slate-400 font-mono">
                {sale.voucherNumber} · Ref: {sale.correlativeNumber}
              </span>
            </div>
            {isAnulada && (
              <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                REVOCADO (RF-13)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onOpenSqlLog && (
              <button
                onClick={onOpenSqlLog}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">terminal</span>
                <span>Log Transaccional PDO</span>
              </button>
            )}
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              <span>Imprimir Ficha Oficial</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Printable Voucher Paper */}
        <div className="p-6 sm:p-10 max-h-[80vh] overflow-y-auto bg-slate-50/50">
          <div
            id="printable-voucher"
            className="relative bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-10 max-w-2xl mx-auto overflow-hidden text-slate-900"
          >
            {/* GIANT WATERMARK OVERLAY IF ANULADA */}
            {isAnulada && (
              <div className="pointer-events-none select-none absolute inset-0 z-20 flex items-center justify-center overflow-hidden opacity-[0.16]">
                <div className="transform -rotate-[28deg] flex flex-col items-center justify-center border-8 border-dashed border-rose-600 p-8 rounded-2xl w-[90%] text-center">
                  <span className="font-extrabold text-[72px] sm:text-[100px] leading-none text-rose-600 tracking-widest uppercase">
                    ANULADO
                  </span>
                  <span className="text-sm sm:text-base font-bold text-rose-600 tracking-normal uppercase mt-2">
                    REVERSIÓN TRANSACCIONAL ACID · ART. RF-13
                  </span>
                  <span className="text-xs font-semibold text-rose-600 tracking-wider uppercase mt-1">
                    HASH INMUTABLE: {sale.verificationHash?.slice(0, 20)}... · REEMBOLSADO
                  </span>
                </div>
              </div>
            )}

            {/* Invalidation Alert Box if Anulada */}
            {isAnulada && (
              <div className="relative z-10 mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3">
                <span className="material-symbols-outlined text-rose-600 text-[24px] shrink-0 mt-0.5">
                  warning
                </span>
                <div className="text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <strong className="text-sm font-bold text-rose-900">
                      AVISO DE INVALIDEZ FISCAL (RF-13 & TRD §3.7)
                    </strong>
                    <span className="bg-rose-600 text-white text-[10px] px-2 py-0.2 rounded font-bold uppercase">
                      Revocado
                    </span>
                  </div>
                  <p className="text-rose-800">
                    Este comprobante fue formalmente revocado en base de datos. Causal:{' '}
                    <strong>{sale.cancellationReason || 'Reversión autorizada en mostrador.'}</strong>
                  </p>
                  <p className="text-[11px] text-rose-700 font-mono">
                    Autorizado por: {sale.cancellationUser || 'Administrador General'} · Fecha:{' '}
                    {sale.cancellationDate || sale.date}
                  </p>
                </div>
              </div>
            )}

            {/* Document Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-base">
                    SV
                  </span>
                  <div>
                    <h2 className="font-bold text-base text-slate-900 leading-tight">
                      SISTEMA DE GESTIÓN COMERCIAL & FACTURACIÓN
                    </h2>
                    <p className="text-xs text-slate-500">Entorno Académico - PHP 8 MVC Monolítico</p>
                  </div>
                </div>
                <div className="text-xs text-slate-500 pt-1 space-y-0.5">
                  <p>NIT: 901.884.221-9 · Régimen General de Tributación</p>
                  <p>Resolución DIAN No. 1876400293482 de 2024 (Rango 1 a 10000)</p>
                  <p>Sede Principal: Cra. 27 # 45 - 12 · Bucaramanga, Colombia</p>
                </div>
              </div>

              <div className="text-left sm:text-right bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-lg w-full sm:w-auto">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Comprobante Correlativo
                </span>
                <span className="font-mono font-bold text-lg text-slate-900 block">
                  {sale.voucherNumber}
                </span>
                <span className="text-xs text-blue-600 font-semibold block">
                  Ref: {sale.correlativeNumber}
                </span>
                <span
                  className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    isPaid
                      ? 'bg-emerald-100 text-emerald-800'
                      : isAnulada
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {sale.status}
                </span>
              </div>
            </div>

            {/* Client & Transaction Meta Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 border-b border-slate-200 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                  Información del Cliente
                </span>
                <p className="font-bold text-slate-900 text-sm">{sale.customer.name}</p>
                <p className="text-slate-600 font-mono">
                  {sale.customer.documentType}: {sale.customer.documentNumber}
                </p>
                <p className="text-slate-600">{sale.customer.phone} · {sale.customer.email}</p>
                {sale.customer.address && (
                  <p className="text-slate-500">{sale.customer.address}</p>
                )}
              </div>

              <div className="space-y-1 sm:text-right">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                  Datos de Emisión Fiscal
                </span>
                <p className="text-slate-700">
                  Fecha y Hora: <strong>{sale.date} · {sale.time}</strong>
                </p>
                <p className="text-slate-700">
                  Caja: <strong>Caja #{sale.cashRegisterId || 4} (Terminal 01)</strong>
                </p>
                <p className="text-slate-700">
                  Cajero / Vendedor: <strong>{sale.cashierName || sale.vendorName}</strong>
                </p>
                <p className="text-slate-700">
                  Medio de Pago:{' '}
                  <strong className="text-blue-600 font-mono">
                    {sale.paymentMethod || 'PENDIENTE DE PAGO'}
                  </strong>
                </p>
              </div>
            </div>

            {/* Items Table */}
            <div className="py-5">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold text-left">
                    <th className="pb-2">SKU</th>
                    <th className="pb-2">Descripción del Producto</th>
                    <th className="pb-2 text-center">Cant.</th>
                    <th className="pb-2 text-right">Precio Unit.</th>
                    <th className="pb-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sale.items.map((item, idx) => (
                    <tr key={idx} className="py-2.5">
                      <td className="py-2 font-mono text-slate-500">{item.productCode}</td>
                      <td className="py-2 font-medium text-slate-900">{item.productName}</td>
                      <td className="py-2 text-center font-bold text-slate-800">{item.quantity}</td>
                      <td className="py-2 text-right font-mono text-slate-600">
                        ${item.unitPrice.toLocaleString('es-CO')}
                      </td>
                      <td className="py-2 text-right font-mono font-bold text-slate-900">
                        ${item.subtotal.toLocaleString('es-CO')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations Breakdown */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
              <div className="text-slate-500 space-y-1">
                <p className="font-semibold text-slate-700">Normativa & Régimen:</p>
                <p>IVA incluido conforme a las disposiciones tributarias vigentes.</p>
                <p className="font-mono text-[11px] text-slate-400">
                  Driver: PDO_MYSQL · Engine: InnoDB · ACID Isolation Level: READ_COMMITTED
                </p>
              </div>

              <div className="w-full sm:w-64 space-y-1.5 self-end">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal Facturable:</span>
                  <span className="font-mono font-semibold">
                    ${sale.subtotalNeto.toLocaleString('es-CO')} COP
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>IVA Discriminado (19%):</span>
                  <span className="font-mono font-semibold">
                    ${sale.iva.toLocaleString('es-CO')} COP
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-300">
                  <span>TOTAL LIQUIDADO:</span>
                  <span className="font-mono text-blue-600">
                    ${sale.total.toLocaleString('es-CO')} COP
                  </span>
                </div>
                {sale.amountReceived && sale.amountReceived > 0 && (
                  <>
                    <div className="flex justify-between text-slate-500 text-[11px] pt-1">
                      <span>Efectivo Recibido:</span>
                      <span className="font-mono">${sale.amountReceived.toLocaleString('es-CO')}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>Cambio / Vuelto:</span>
                      <span className="font-mono">${(sale.changeGiven || 0).toLocaleString('es-CO')}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Cryptographic SHA-256 Hash & QR Footer */}
            <div className="mt-8 pt-4 border-t border-dashed border-slate-300 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* Visual QR Representation */}
                <div className="w-14 h-14 bg-slate-900 text-white p-1 rounded flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[36px]">qr_code_2</span>
                </div>
                <div className="text-[10px] text-slate-500 space-y-0.5">
                  <span className="uppercase font-bold tracking-wider text-slate-700 block">
                    Trazabilidad Criptográfica SHA-256
                  </span>
                  <span className="font-mono text-slate-600 block break-all max-w-xs">
                    {sale.verificationHash || 'e4d909c290d0f0b1ca068ffaddf22cbd0a1f9401b874'}
                  </span>
                  <span>Firma digital inmutable del commit transaccional.</span>
                </div>
              </div>

              <div className="text-right text-[11px] text-slate-400">
                <p>Original para el Cliente</p>
                <p className="font-semibold text-slate-600">¡Gracias por su compra!</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer (No Print) */}
        <div className="no-print p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Vista preliminar de impresión compatible con impresoras de tirilla y formato carta.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold cursor-pointer"
          >
            Cerrar Vista
          </button>
        </div>
      </div>
    </div>
  );
};
