import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white py-3 px-4 sm:px-6 lg:px-8 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2.5">
      <div className="flex items-center gap-2 flex-wrap text-center sm:text-left">
        <span className="font-medium text-slate-700">Sistema de Ventas &amp; Facturación</span>
        <span className="hidden sm:inline">·</span>
        <span>Gestión Comercial POS &amp; Control de Inventario</span>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Operación Comercial Activa</span>
        </span>

        <span className="text-slate-300">|</span>

        <span className="flex items-center gap-1 text-slate-600">
          <span className="material-symbols-outlined text-[15px]">timer</span>
          Sesión activa
        </span>
      </div>
    </footer>
  );
};
