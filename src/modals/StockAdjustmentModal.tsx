import React, { useState, useEffect } from 'react';
import { Product, User } from '../types';

interface StockAdjustmentModalProps {
  products: Product[];
  selectedProductId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onAddStock: (productId: number, quantity: number, docRef: string, reason: string, type: 'ENTRADA_AJUSTE' | 'STOCK_INICIAL') => void;
  currentUser: User;
  onToast: (msg: string, isError?: boolean) => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  products,
  selectedProductId,
  isOpen,
  onClose,
  onAddStock,
  currentUser,
  onToast,
}) => {
  if (!isOpen) return null;

  const [productId, setProductId] = useState<number>(selectedProductId || (products[0]?.id ?? 1));
  const [movementType, setMovementType] = useState<'ENTRADA_AJUSTE' | 'STOCK_INICIAL'>('ENTRADA_AJUSTE');
  const [quantity, setQuantity] = useState<number>(10);
  const [docRef, setDocRef] = useState<string>('FAC-PROV-2024-8821');
  const [reason, setReason] = useState<string>('Compra a proveedor mayorista Factura #F-4910');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (selectedProductId) {
      setProductId(selectedProductId);
    }
  }, [selectedProductId]);

  const activeProduct = products.find((p) => p.id === productId) || products[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      onToast('La cantidad debe ser mayor a 0 unidades.', true);
      return;
    }
    if (!docRef.trim()) {
      onToast('Debe ingresar un documento o factura de referencia.', true);
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onAddStock(productId, quantity, docRef, reason, movementType);
      onToast(`+${quantity} unidades agregadas a ${activeProduct.code} mediante transacción ACID PDO.`, false);
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header Strip */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">inventory_2</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">
                  Registrar Entrada / Ajuste de Stock
                </h3>
                <span className="text-[11px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded">
                  RF-06
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Regla de Integridad Contable: Asiento obligatorio en Kardex con trazabilidad documental
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-slate-800">
          {/* RF-06 Rule Banner */}
          <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
            <span className="material-symbols-outlined text-blue-600 text-[20px] shrink-0 mt-0.5">
              shield
            </span>
            <p>
              <strong>Principio de Inmutabilidad Directa:</strong> El stock no puede sobreescribirse libremente. Todo ingreso afecta la tabla <code className="font-mono font-bold">movimientos_inventario</code> y actualiza atómicamente <code className="font-mono font-bold">productos.stock_actual</code> mediante PDO transaction.
            </p>
          </div>

          {/* Product Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Producto Seleccionado *
            </label>
            <select
              value={productId}
              onChange={(e) => setProductId(Number(e.target.value))}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name} (Stock Actual: {p.currentStock} unid. | Mín: {p.minStock})
                </option>
              ))}
            </select>
          </div>

          {/* Movement Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tipo de Movimiento Contable *
            </label>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <label
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  movementType === 'ENTRADA_AJUSTE'
                    ? 'border-blue-600 bg-blue-50/60 text-blue-950 font-bold'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <input
                  type="radio"
                  name="movType"
                  checked={movementType === 'ENTRADA_AJUSTE'}
                  onChange={() => setMovementType('ENTRADA_AJUSTE')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>ENTRADA_AJUSTE (Compras / Reposición)</span>
              </label>

              <label
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  movementType === 'STOCK_INICIAL'
                    ? 'border-blue-600 bg-blue-50/60 text-blue-950 font-bold'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <input
                  type="radio"
                  name="movType"
                  checked={movementType === 'STOCK_INICIAL'}
                  onChange={() => setMovementType('STOCK_INICIAL')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>STOCK_INICIAL (Apertura de Periodo)</span>
              </label>
            </div>
          </div>

          {/* Quantity Stepper with Quick Buttons */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Cantidad de Unidades a Ingresar *
              </label>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-400 text-[11px]">Accesos rápidos:</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 5)}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-bold text-[11px] cursor-pointer"
                >
                  +5
                </button>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 10)}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-bold text-[11px] cursor-pointer"
                >
                  +10
                </button>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 25)}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-bold text-[11px] cursor-pointer"
                >
                  +25
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-lg cursor-pointer"
              >
                -
              </button>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 text-center font-mono font-bold text-base p-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-lg cursor-pointer"
              >
                +
              </button>
            </div>
            {activeProduct && (
              <p className="text-[11px] text-slate-500 mt-1">
                Stock actual: <strong>{activeProduct.currentStock} unid.</strong> → Proyectado tras ingreso:{' '}
                <strong className="text-emerald-700">
                  {activeProduct.currentStock + quantity} unid.{' '}
                  {activeProduct.currentStock + quantity >= activeProduct.minStock ? '(ÓPTIMO)' : '(AÚN EN ALERTA)'}
                </strong>
              </p>
            )}
          </div>

          {/* Document Reference */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Referencia / Documento Soporte (Factura de Compra / Acta) *
            </label>
            <input
              type="text"
              value={docRef}
              onChange={(e) => setDocRef(e.target.value)}
              placeholder="Ej: FAC-PROV-2024-8821"
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-800"
            />
          </div>

          {/* Reason / Concept */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Motivo / Concepto Documental *
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Compra a proveedor mayorista Factura #F-4910"
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
            />
          </div>

          {/* Auditor RBAC info */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500">Auditor Responsable RBAC:</span>
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <span className="material-symbols-outlined text-[16px] text-blue-600">verified_user</span>
              <span>{currentUser.name} ({currentUser.roleLabel})</span>
            </div>
          </div>

          {/* SQL Preview Box */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-blue-600">terminal</span>
              Sentencia SQL Transaccional a Ejecutar (PDO InnoDB):
            </span>
            <pre className="bg-[#0b1329] text-sky-200 p-3 rounded-lg font-mono text-[11px] leading-relaxed overflow-x-auto">
START TRANSACTION;
INSERT INTO movimientos_inventario (id_producto, cantidad, tipo, documento_ref, motivo, id_usuario)
VALUES ({activeProduct?.id || 1}, {quantity}, '{movementType}', '{docRef}', '{reason}', 1);

UPDATE productos SET stock_actual = stock_actual + {quantity} WHERE id = {activeProduct?.id || 1};
COMMIT;
            </pre>
          </div>

          {/* Submit Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-slate-900 hover:bg-blue-600 text-white font-bold text-xs rounded-lg transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[16px]">autorenew</span>
                  <span>Ejecutando COMMIT PDO...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>Guardar Movimiento de Inventario</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
