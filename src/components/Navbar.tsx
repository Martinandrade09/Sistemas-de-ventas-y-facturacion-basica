import React, { useState } from 'react';
import { User } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User;
  users: User[];
  onSelectUser: (user: User) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  users,
  onSelectUser,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const navItems = [
    { id: 'panel-general', label: 'Panel General' },
    { id: 'punto-de-venta', label: 'Punto de Venta' },
    { id: 'control-de-caja', label: 'Control de Caja & Cobros' },
    { id: 'catalogo-inventario', label: 'Catálogo & Inventario' },
    { id: 'reportes-gestion', label: 'Reportes de Gestión' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-20 w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Brand & Subtitle */}
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => setActiveTab('panel-general')}
        >
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-md shadow-slate-900/10 group-hover:bg-blue-600 transition-colors">
            <span className="material-symbols-outlined text-[22px]">account_balance</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-900 text-base tracking-tight leading-tight group-hover:text-blue-600 transition-colors">
              Sistema de Ventas & Facturación
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Gestión Comercial e Inventario
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden xl:flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/60">
          {navItems.map((item) => {
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

        {/* Right side: Active Role Switcher & Log Out */}
        <div className="flex items-center gap-3">
          {/* User Profile Capsule with Interactive Role Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer text-left"
              title="Cambiar usuario activo"
            >
              <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-sm font-bold shrink-0">
                <span className="material-symbols-outlined text-[18px]">person</span>
              </div>
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                    {currentUser.name}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 animate-pulse"></span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                  {currentUser.roleLabel}
                  <span className="material-symbols-outlined text-[13px] text-slate-400">expand_more</span>
                </span>
              </div>
            </button>

            {/* Role Switcher Menu */}
            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-1.5 border-b border-slate-100">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Cambiar Perfil de Usuario
                  </span>
                </div>
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => {
                      onSelectUser(user);
                      setShowUserDropdown(false);
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs hover:bg-slate-50 transition-colors cursor-pointer ${
                      user.id === currentUser.id ? 'bg-blue-50/70 text-blue-700 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold">{user.name}</span>
                      <span className="text-[11px] text-slate-400 capitalize">{user.role} · ID: {user.id}</span>
                    </div>
                    {user.id === currentUser.id && (
                      <span className="material-symbols-outlined text-blue-600 text-[18px]">check</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reset / Exit Session */}
          <button
            onClick={() => {
              if (window.confirm('¿Reiniciar sesión de trabajo actual?')) {
                setActiveTab('panel-general');
              }
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition-colors text-xs font-semibold cursor-pointer"
            title="Cerrar o reiniciar sesión"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* Mobile / Tablet Horizontal Navigation Scroll */}
      <div className="xl:hidden flex items-center gap-1 px-4 py-2 bg-slate-50 border-t border-slate-200 overflow-x-auto">
        {navItems.map((item) => {
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
