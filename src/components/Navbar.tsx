import React from 'react';
import { User } from '../types';
import { canAccessTab, ROLE_LABELS } from '../auth/permissions';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User;
  onLogout: () => void;
  users?: User[];
  onSelectUser?: (user: User) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onLogout,
}) => {
  const navItems = [
    { id: 'panel-general', label: 'Panel General' },
    { id: 'punto-de-venta', label: 'Punto de Venta' },
    { id: 'control-de-caja', label: 'Control de Caja & Cobros' },
    { id: 'catalogo-inventario', label: 'Catálogo & Inventario' },
    { id: 'reportes-gestion', label: 'Reportes de Gestión' },
  ];

  // RBAC: filtrar solo las pestañas autorizadas para el rol activo
  const visibleNavItems = navItems.filter((item) =>
    canAccessTab(currentUser.role, item.id)
  );

  const handleBrandClick = () => {
    if (canAccessTab(currentUser.role, 'panel-general')) {
      setActiveTab('panel-general');
    } else {
      setActiveTab('punto-de-venta');
    }
  };

  const handleLogoutClick = () => {
    if (window.confirm(`¿Cerrar sesión de ${currentUser.name}?`)) {
      onLogout();
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-20 w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Brand & Subtitle */}
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={handleBrandClick}
        >
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-md shadow-slate-900/10 group-hover:bg-blue-600 transition-colors">
            <span className="material-symbols-outlined text-[22px]">account_balance</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-900 text-base tracking-tight leading-tight group-hover:text-blue-600 transition-colors">
              Sistema de Ventas &amp; Facturación
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Gestión Comercial e Inventario
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links — Filtradas por RBAC */}
        <nav className="hidden xl:flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/60">
          {visibleNavItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right side: Información de Sesión Activa y Botón Cerrar Sesión */}
        <div className="flex items-center gap-3">
          {/* User Profile Capsule (Solo lectura de sesión autenticada) */}
          <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-left select-none">
            <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-sm font-bold shrink-0">
              <span className="material-symbols-outlined text-[18px]">person</span>
            </div>
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                  {currentUser.name}
                </span>
                <span
                  className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 animate-pulse"
                  title="Sesión activa"
                ></span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                {ROLE_LABELS[currentUser.role] || currentUser.roleLabel}
              </span>
            </div>
          </div>

          {/* Cerrar Sesión Funcional */}
          <button
            onClick={handleLogoutClick}
            className="flex items-center gap-1 px-3 py-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-xl transition-colors text-xs font-semibold cursor-pointer border border-transparent hover:border-rose-200"
            title="Cerrar sesión actual"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* Mobile / Tablet Horizontal Navigation Scroll — Filtradas por RBAC */}
      <div className="xl:hidden flex items-center gap-1 px-4 py-2 bg-slate-50 border-t border-slate-200 overflow-x-auto">
        {visibleNavItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
