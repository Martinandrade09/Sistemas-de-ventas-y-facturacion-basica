import React, { useState } from 'react';
import { User } from '../types';
import { INITIAL_USERS } from '../data/mockData';
import { ROLE_LABELS } from '../auth/permissions';

interface LoginViewProps {
  onLogin: (user: User) => void;
}

const ROLE_ICONS: Record<string, string> = {
  admin:    'admin_panel_settings',
  cajero:   'point_of_sale',
  vendedor: 'storefront',
};

const ROLE_COLORS: Record<string, string> = {
  admin:    'bg-blue-600',
  cajero:   'bg-emerald-600',
  vendedor: 'bg-violet-600',
};

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHints, setShowHints] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Ingresa tu usuario y contraseña para continuar.');
      return;
    }

    const matchedUser = INITIAL_USERS.find(
      (u) => u.username === username.trim() && u.demoPassword === password
    );

    if (!matchedUser) {
      setError('Usuario o contraseña incorrectos. Verifica las credenciales de demostración.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLogin(matchedUser);
    }, 700);
  };

  const handleQuickLogin = (user: User) => {
    setUsername(user.username);
    setPassword(user.demoPassword);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Background decorative pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative w-full max-w-sm space-y-5">
        {/* Logo & System Name */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-sm shadow-xl">
            <span className="material-symbols-outlined text-[30px] text-white">account_balance</span>
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">
              Sistema de Ventas &amp; Facturación
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Gestión Comercial e Inventario
            </p>
          </div>

          {/* Demo Mode Banner */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 backdrop-blur-sm">
            <span className="material-symbols-outlined text-[13px] text-amber-400">science</span>
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-widest">
              Modo Demostración
            </span>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl space-y-5">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white">Iniciar Sesión</h2>
            <p className="text-xs text-slate-400">
              Accede con tus credenciales de usuario asignadas.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Username */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                Usuario
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-slate-500">
                  person
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(''); }}
                  placeholder="nombre.apellido"
                  autoComplete="username"
                  className="w-full bg-white/[0.07] border border-white/10 text-white placeholder-slate-600 rounded-xl pl-9 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                Contraseña
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-slate-500">
                  lock
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full bg-white/[0.07] border border-white/10 text-white placeholder-slate-600 rounded-xl pl-9 pr-10 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30">
                <span className="material-symbols-outlined text-[16px] text-rose-400 shrink-0">
                  error
                </span>
                <p className="text-xs text-rose-300 font-medium">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px]">autorenew</span>
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">login</span>
                  <span>Ingresar al Sistema</span>
                </>
              )}
            </button>
          </form>

          {/* Demo credentials toggle */}
          <div className="border-t border-white/[0.08] pt-4 space-y-3">
            <button
              type="button"
              onClick={() => setShowHints((v) => !v)}
              className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer group"
            >
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-amber-500">science</span>
                <span className="font-semibold">Credenciales de demostración</span>
              </span>
              <span className={`material-symbols-outlined text-[16px] transition-transform ${showHints ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>

            {showHints && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Disclaimer */}
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Estos datos son <strong className="text-slate-400">ficticios</strong> y se usan exclusivamente para pruebas de demostración. No representan credenciales reales ni almacenamiento seguro.
                </p>

                {/* User cards */}
                {INITIAL_USERS.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleQuickLogin(user)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.07] transition-all cursor-pointer text-left group"
                    title={`Autocompletar con ${user.name}`}
                  >
                    <div className={`w-8 h-8 rounded-lg ${ROLE_COLORS[user.role]} flex items-center justify-center shrink-0`}>
                      <span className="material-symbols-outlined text-[16px] text-white">
                        {ROLE_ICONS[user.role]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white">{user.name}</span>
                        <span className="text-[10px] font-bold text-slate-500 group-hover:text-blue-400 transition-colors">
                          Autocompletar ↗
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        <span className="text-slate-400">{user.username}</span>
                        <span className="mx-1 text-slate-700">·</span>
                        <span className="text-slate-500">{ROLE_LABELS[user.role]}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-600">
          Sistema académico de demostración · Datos simulados
        </p>
      </div>
    </div>
  );
};
