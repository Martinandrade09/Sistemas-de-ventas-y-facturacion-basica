import React from 'react';

interface FooterProps {
  onOpenSqlModal: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenSqlModal }) => {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white py-3 px-4 sm:px-6 lg:px-8 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2.5">
      <div className="flex items-center gap-2 flex-wrap text-center sm:text-left">
        <span className="font-medium text-slate-700">Proyecto Formativo Académico</span>
        <span className="hidden sm:inline">·</span>
        <span>Semestre Lectivo 2024-II</span>
        <span className="hidden sm:inline">·</span>
        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">Arquitectura MVC Modular PHP 8</span>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <button
          onClick={onOpenSqlModal}
          className="flex items-center gap-1.5 hover:text-blue-600 transition-colors font-medium cursor-pointer"
          title="Ver registro de sentencias preparadas PDO"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="text-emerald-700 font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px]">database</span>
            Estado BD: Conectado (PDO InnoDB)
          </span>
        </button>

        <span className="text-slate-300">|</span>

        <span className="flex items-center gap-1 text-slate-600">
          <span className="material-symbols-outlined text-[15px]">timer</span>
          Sesión: 30 min activos
        </span>
      </div>
    </footer>
  );
};
