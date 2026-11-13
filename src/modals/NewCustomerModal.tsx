import React, { useState } from 'react';
import { Customer } from '../types';

interface NewCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveCustomer: (newCustomer: Customer) => void;
  onToast: (msg: string, isError?: boolean) => void;
}

export const NewCustomerModal: React.FC<NewCustomerModalProps> = ({
  isOpen,
  onClose,
  onSaveCustomer,
  onToast,
}) => {
  if (!isOpen) return null;

  const [docType, setDocType] = useState<'CC' | 'NIT' | 'CE' | 'Pasaporte'>('CC');
  const [docNumber, setDocNumber] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docNumber.trim() || !name.trim()) {
      onToast('El número de documento y nombre completo son obligatorios.', true);
      return;
    }

    const created: Customer = {
      id: `CUST-${Date.now()}`,
      documentType: docType,
      documentNumber: docNumber.trim(),
      name: name.trim(),
      phone: phone.trim() || '+57 (300) 123-4567',
      email: email.trim() || `${docNumber}@cliente.com`,
      address: address.trim() || 'Mostrador Principal',
      status: 'ACTIVO',
    };

    onSaveCustomer(created);
    onToast(`Cliente "${created.name}" registrado con éxito.`, false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header Strip */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">person_add</span>
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Registrar Nuevo Cliente</h3>
              <p className="text-xs text-slate-400">
                Punto de Venta · Creación de tercero para facturación legal
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs text-slate-800">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tipo Doc. *</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="CC">CC (Cédula)</option>
                <option value="NIT">NIT (Empresa)</option>
                <option value="CE">CE (Extranjería)</option>
                <option value="Pasaporte">Pasaporte</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Número de Documento *</label>
              <input
                type="text"
                required
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                placeholder="Ej: 1098234567"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Nombre Completo / Razón Social *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Mariana López Restrepo"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Teléfono / WhatsApp</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej: +57 (312) 489-0211"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Correo Electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ej: mariana.lopez@edu.co"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Dirección de Entrega</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ej: Calle 45 # 28 - 14, Bucaramanga"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-slate-900 hover:bg-blue-600 text-white font-bold rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              Guardar y Seleccionar Cliente
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
