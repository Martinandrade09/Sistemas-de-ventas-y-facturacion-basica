import React, { useState } from 'react';
import { CashSession, User } from '../types';

interface BlindCashCountModalProps {
  session: CashSession;
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onToast: (msg: string, isError?: boolean) => void;
}

export const BlindCashCountModal: React.FC<BlindCashCountModalProps> = ({
  session,
  isOpen,
  onClose,
  currentUser,
  onToast,
}) => {
  if (!isOpen) return null;

  // Expected theoretical cash in drawer
  const expectedCash = session.openingBalance + session.totalSalesCash - session.totalOutflows - session.totalRefunds;

  // Bill and Coin Denominations counters state initialized to balance out to expected ($890,000)
  // 5x $100,000 = $500,000
  // 6x $50,000 = $300,000
  // 4x $20,000 = $80,000
  // 1x $10,000 = $10,000
  // Total = $890,000
  const [counts, setCounts] = useState<{ [key: string]: number }>({
    b100k: 5,
    b50k: 6,
    b20k: 4,
    b10k: 1,
    b5k: 0,
    b2k: 0,
    m1000: 0,
    m500: 0,
    m200: 0,
    m100: 0,
    m50: 0,
  });

  const [revealExpected, setRevealExpected] = useState(false);

  const denominationValues: { key: string; label: string; value: number; type: 'billete' | 'moneda' }[] = [
    { key: 'b100k', label: '$100,000', value: 100000, type: 'billete' },
    { key: 'b50k', label: '$50,000', value: 50000, type: 'billete' },
    { key: 'b20k', label: '$20,000', value: 20000, type: 'billete' },
    { key: 'b10k', label: '$10,000', value: 10000, type: 'billete' },
    { key: 'b5k', label: '$5,000', value: 5000, type: 'billete' },
    { key: 'b2k', label: '$2,000', value: 2000, type: 'billete' },
    { key: 'm1000', label: '$1,000', value: 1000, type: 'moneda' },
    { key: 'm500', label: '$500', value: 500, type: 'moneda' },
    { key: 'm200', label: '$200', value: 200, type: 'moneda' },
    { key: 'm100', label: '$100', value: 100, type: 'moneda' },
    { key: 'm50', label: '$50', value: 50, type: 'moneda' },
  ];

  const totalCalculated = denominationValues.reduce((sum, item) => {
    return sum + (counts[item.key] || 0) * item.value;
  }, 0);

  const difference = totalCalculated - expectedCash;

  const handleCountChange = (key: string, val: number) => {
    setCounts((prev) => ({
      ...prev,
      [key]: Math.max(0, val),
    }));
  };

  const handleFinishArqueo = () => {
    if (difference === 0) {
      onToast('Arqueo de Caja Exitoso: Cuadre perfecto sin faltantes ni sobrantes ($0 COP).', false);
    } else if (difference > 0) {
      onToast(`Arqueo registrado con SOBRANTE de +$${difference.toLocaleString('es-CO')} COP. Se registra en bitácora de auditoría.`, false);
    } else {
      onToast(`Arqueo registrado con FALTANTE de -$${Math.abs(difference).toLocaleString('es-CO')} COP. Alerta emitida a Administración.`, true);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header Strip */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">point_of_sale</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">
                  Arqueo Físico de Gaveta (Control de Cuadre Ciego)
                </h3>
                <span className="text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
                  RF-10 / RF-11
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {session.registerNumber} · {session.turnName} · Cajero: {session.cashier}
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

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-slate-800">
          {/* Principle explanation */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2.5">
            <span className="material-symbols-outlined text-blue-600 text-[20px] shrink-0 mt-0.5">
              visibility_off
            </span>
            <div>
              <strong className="text-slate-900">Principio de Arqueo Ciego (RF-10):</strong> Para prevenir sesgos y manipulación de efectivo, el cajero debe contar y declarar físicamente cada denominación de billetes y monedas sin conocer a priori el saldo teórico liquidado por el sistema.
            </div>
          </div>

          {/* Denominations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Billetes */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-emerald-600">payments</span>
                Billetes en Gaveta
              </span>
              <div className="space-y-2">
                {denominationValues
                  .filter((d) => d.type === 'billete')
                  .map((d) => (
                    <div key={d.key} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-200">
                      <span className="font-bold text-slate-800 w-20">{d.label}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCountChange(d.key, (counts[d.key] || 0) - 1)}
                          className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 font-bold flex items-center justify-center text-slate-700 cursor-pointer"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={0}
                          value={counts[d.key] || 0}
                          onChange={(e) => handleCountChange(d.key, parseInt(e.target.value) || 0)}
                          className="w-12 text-center font-mono font-bold border border-slate-300 rounded px-1 py-0.5 text-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() => handleCountChange(d.key, (counts[d.key] || 0) + 1)}
                          className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 font-bold flex items-center justify-center text-slate-700 cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                      <span className="font-mono text-slate-600 w-28 text-right font-medium">
                        ${((counts[d.key] || 0) * d.value).toLocaleString('es-CO')}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Monedas */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-amber-600">monetization_on</span>
                Monedas en Gaveta
              </span>
              <div className="space-y-2">
                {denominationValues
                  .filter((d) => d.type === 'moneda')
                  .map((d) => (
                    <div key={d.key} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-200">
                      <span className="font-bold text-slate-800 w-20">{d.label}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCountChange(d.key, (counts[d.key] || 0) - 1)}
                          className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 font-bold flex items-center justify-center text-slate-700 cursor-pointer"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={0}
                          value={counts[d.key] || 0}
                          onChange={(e) => handleCountChange(d.key, parseInt(e.target.value) || 0)}
                          className="w-12 text-center font-mono font-bold border border-slate-300 rounded px-1 py-0.5 text-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() => handleCountChange(d.key, (counts[d.key] || 0) + 1)}
                          className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 font-bold flex items-center justify-center text-slate-700 cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                      <span className="font-mono text-slate-600 w-28 text-right font-medium">
                        ${((counts[d.key] || 0) * d.value).toLocaleString('es-CO')}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Arqueo Comparison Section */}
          <div className="p-5 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-xs text-slate-400 uppercase tracking-wider block">
                Total Físico Conteo Gaveta
              </span>
              <span className="text-3xl font-extrabold font-mono text-emerald-400">
                ${totalCalculated.toLocaleString('es-CO')}{' '}
                <span className="text-xs text-slate-400 font-normal">COP</span>
              </span>
            </div>

            <div className="flex flex-col items-center sm:items-end gap-1.5">
              {!revealExpected ? (
                <button
                  type="button"
                  onClick={() => setRevealExpected(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  <span>Verificar contra Saldo Teórico del Sistema</span>
                </button>
              ) : (
                <div className="text-right space-y-1">
                  <span className="text-xs text-slate-400 block">
                    Saldo Teórico Sistema: <strong>${expectedCash.toLocaleString('es-CO')} COP</strong>
                  </span>
                  <div
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                      difference === 0
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : difference > 0
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {difference === 0 ? 'check_circle' : difference > 0 ? 'trending_up' : 'warning'}
                    </span>
                    <span>
                      {difference === 0
                        ? 'CUADRE PERFECTO: $0 COP'
                        : difference > 0
                        ? `SOBRANTE: +$${difference.toLocaleString('es-CO')} COP`
                        : `FALTANTE: -$${Math.abs(difference).toLocaleString('es-CO')} COP`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Responsable: <strong>{currentUser.name}</strong> ({currentUser.roleLabel})
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white text-slate-700 font-semibold rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleFinishArqueo}
              className="px-5 py-2 bg-slate-900 hover:bg-blue-600 text-white font-bold rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              Confirmar y Asentar Acta de Arqueo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
