import React from 'react';

interface SqlTraceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SqlTraceModal: React.FC<SqlTraceModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-950 text-slate-100 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header Strip */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">terminal</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">
                  Consola de Trazabilidad Transaccional PDO MySQL InnoDB
                </h3>
                <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded">
                  ACID STRICT
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Driver: PDO_MYSQL (ATTR_ERRMODE =&gt; ERRMODE_EXCEPTION) · Driver Host: localhost
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

        {/* Console Log Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto font-mono text-xs">
          <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">sync</span>
                Transacción #TX-1042-PAY (Confirmación de Pago)
              </span>
              <span>Latencia: 0.042 ms · Filas afectadas: 4</span>
            </div>
            <pre className="text-sky-300 overflow-x-auto text-[11.5px] leading-relaxed pt-1">
-- Bloqueo pesimista de fila en motor InnoDB
SELECT * FROM ventas WHERE id_venta = 1042 FOR UPDATE;

-- Actualización atómica de existencias
UPDATE productos SET stock_actual = stock_actual - 2 WHERE id_producto = 1;

-- Inserción de asiento contable
INSERT INTO movimientos_caja (id_caja, tipo, metodo, monto, concepto)
VALUES (4, 'INGRESO_VENTA', 'EFECTIVO', 560000.00, 'Cobro Venta FAC-2024-0102');

-- Commit final persistido
COMMIT;
            </pre>
          </div>

          <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">policy</span>
                Transacción #TX-9843-REV (Protocolo de Anulación RF-13)
              </span>
              <span>Latencia: 0.038 ms · InnoDB WAL Write OK</span>
            </div>
            <pre className="text-slate-300 overflow-x-auto text-[11.5px] leading-relaxed pt-1">
START TRANSACTION;
UPDATE comprobantes SET estado_comprobante = 'ANULADO' WHERE id_venta = 1038;
UPDATE productos SET stock_actual = stock_actual + 2 WHERE id_producto = 3;
INSERT INTO movimientos_inventario (id_producto, cantidad, tipo, motivo)
VALUES (3, 2, 'REPOSICION_ANULACION', 'Anulación FAC-2024-0098');
INSERT INTO movimientos_caja (id_caja, tipo, metodo, monto, concepto)
VALUES (4, 'DEVOLUCION_ANULACION', 'EFECTIVO', -90000.00, 'Reembolso en mostrador');
UPDATE ventas SET estado = 'ANULADA', fecha_anulacion = NOW() WHERE id_venta = 1038;
COMMIT;
            </pre>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px]">
            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <span className="text-slate-500 block">Nivel Aislamiento</span>
              <strong className="text-emerald-400">READ COMMITTED</strong>
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <span className="text-slate-500 block">Motor de Almacenamiento</span>
              <strong className="text-sky-400">MySQL InnoDB</strong>
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <span className="text-slate-500 block">Integridad Referencial</span>
              <strong className="text-amber-400">ON DELETE RESTRICT</strong>
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <span className="text-slate-500 block">Check Constraints</span>
              <strong className="text-emerald-400">stock_actual &gt;= 0</strong>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Consultas parametrizadas mediante Sentencias Preparadas (Prepared Statements).</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
          >
            Cerrar Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
