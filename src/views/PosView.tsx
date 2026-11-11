import React, { useState } from 'react';
import { Customer, Product, SaleItem, User, Sale } from '../types';

interface PosViewProps {
  products: Product[];
  customers: Customer[];
  currentUser: User;
  onOpenNewCustomerModal: () => void;
  onCreateSale: (newSale: Partial<Sale>) => void;
  onToast: (msg: string, isError?: boolean) => void;
}

export const PosView: React.FC<PosViewProps> = ({
  products,
  customers,
  currentUser,
  onOpenNewCustomerModal,
  onCreateSale,
  onToast,
}) => {
  // Selected Customer state (defaults to Mariana López or first customer)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer>(customers[0]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Cart state
  const [cart, setCart] = useState<SaleItem[]>([
    {
      productId: 1,
      productCode: 'COD-SSD-101',
      productName: 'SSD Kingston NV2 1TB PCIe 4.0',
      unitPrice: 280000,
      quantity: 2,
      subtotal: 560000,
    },
  ]);

  // Product filtering
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  const categories = ['Todos', 'Almacenamiento', 'Periféricos', 'Accesorios', 'Componentes'];

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(productSearchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      c.documentNumber.includes(customerSearchQuery)
  );

  // Cart Totals calculation
  const totalAmount = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const subtotalNeto = Math.round(totalAmount / 1.19);
  const iva = totalAmount - subtotalNeto;
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Add product to cart
  const handleAddToCart = (product: Product) => {
    if (product.currentStock <= 0) {
      onToast(`El producto ${product.code} no tiene stock disponible en inventario.`, true);
      return;
    }

    setCart((prevCart) => {
      const existing = prevCart.find((it) => it.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.currentStock) {
          onToast(`No puedes añadir más unidades que el stock disponible (${product.currentStock}).`, true);
          return prevCart;
        }
        return prevCart.map((it) =>
          it.productId === product.id
            ? {
                ...it,
                quantity: it.quantity + 1,
                subtotal: (it.quantity + 1) * it.unitPrice,
              }
            : it
        );
      } else {
        return [
          ...prevCart,
          {
            productId: product.id,
            productCode: product.code,
            productName: product.name,
            unitPrice: product.salePrice,
            quantity: 1,
            subtotal: product.salePrice,
          },
        ];
      }
    });
    onToast(`"${product.name}" añadido a la orden.`, false);
  };

  // Adjust item quantity
  const handleUpdateQuantity = (productId: number, delta: number) => {
    setCart((prevCart) => {
      return prevCart
        .map((it) => {
          if (it.productId === productId) {
            const product = products.find((p) => p.id === productId);
            const newQty = it.quantity + delta;
            if (newQty <= 0) return null;
            if (product && newQty > product.currentStock) {
              onToast(`Stock máximo disponible alcanzado (${product.currentStock} unid.).`, true);
              return it;
            }
            return {
              ...it,
              quantity: newQty,
              subtotal: newQty * it.unitPrice,
            };
          }
          return it;
        })
        .filter(Boolean) as SaleItem[];
    });
  };

  const handleRemoveItem = (productId: number) => {
    setCart((prev) => prev.filter((it) => it.productId !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handleRegisterPendingSale = () => {
    if (cart.length === 0) {
      onToast('La orden no tiene artículos agregados.', true);
      return;
    }
    if (!selectedCustomer) {
      onToast('Seleccione un cliente para emitir el comprobante.', true);
      return;
    }

    const nextId = 1045 + Math.floor(Math.random() * 50);
    const newSale: Partial<Sale> = {
      id: nextId,
      correlativeNumber: `FAC-2024-0${nextId - 940}`,
      voucherNumber: `COMP-0000${nextId}`,
      date: '14/11/2024',
      time: '11:45 AM',
      customer: selectedCustomer,
      vendorName: `${currentUser.name} (${currentUser.roleLabel.split('·')[0].trim()})`,
      vendorRole: currentUser.role,
      items: [...cart],
      subtotalNeto,
      iva,
      total: totalAmount,
      status: 'PENDIENTE',
    };

    onCreateSale(newSale);
    setCart([]);
    onToast(`Venta #${nextId} registrada en estado PENDIENTE. Lista para validación y cobro en Caja.`, false);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6 animate-in fade-in duration-150">
      {/* 1. Pedagogical Header Banner */}
      <div className="bg-blue-50/90 border border-blue-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[20px]">info</span>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-slate-900">
                Punto de Venta — Registro de Ventas Pendientes
              </h2>
              <span className="font-mono text-[11px] font-bold bg-blue-100 text-blue-800 px-2 py-0.2 rounded">
                RF-07 / RF-08
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Módulo de Venta: La venta se creará en estado <strong>PENDIENTE</strong> sin descontar inventario hasta la confirmación de pago en Caja.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-blue-200/60 shadow-xs shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-bold text-slate-700">Caja Central: Abierta</span>
          <span className="text-xs text-slate-400">· Turno #04</span>
        </div>
      </div>

      {/* 2. Main Work Area: Left (Customer + Catalog) vs Right (Cart) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Step 1 Customer + Step 2 Catalog */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* STEP 1: Selección de Cliente */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <h3 className="font-bold text-sm text-slate-900">Selección de Cliente</h3>
                <span className="text-xs text-slate-400 font-normal">Requerido para comprobante</span>
              </div>
              <button
                onClick={onOpenNewCustomerModal}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">person_add</span>
                <span>+ Registrar Nuevo Cliente</span>
              </button>
            </div>

            {/* Customer Search Bar */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                search
              </span>
              <input
                type="text"
                value={customerSearchQuery}
                onFocus={() => setShowCustomerDropdown(true)}
                onChange={(e) => {
                  setCustomerSearchQuery(e.target.value);
                  setShowCustomerDropdown(true);
                }}
                placeholder="Buscar cliente por documento (CC, NIT) o nombre..."
                className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
              {customerSearchQuery && (
                <button
                  onClick={() => setCustomerSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}

              {/* Autocomplete dropdown */}
              {showCustomerDropdown && customerSearchQuery && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
                  {filteredCustomers.length === 0 ? (
                    <div className="p-3 text-xs text-slate-400 text-center">No se encontraron clientes</div>
                  ) : (
                    filteredCustomers.map((cust) => (
                      <div
                        key={cust.id}
                        onClick={() => {
                          setSelectedCustomer(cust);
                          setCustomerSearchQuery('');
                          setShowCustomerDropdown(false);
                        }}
                        className="p-2.5 text-xs hover:bg-slate-50 cursor-pointer flex items-center justify-between border-b border-slate-100 last:border-0"
                      >
                        <div>
                          <strong className="text-slate-900">{cust.name}</strong>
                          <span className="text-slate-400 ml-2 font-mono">
                            {cust.documentType}: {cust.documentNumber}
                          </span>
                        </div>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
                          Seleccionar
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Selected Customer Card Preview */}
            {selectedCustomer && (
              <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    <span className="material-symbols-outlined text-[20px]">person</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-xs text-slate-900">{selectedCustomer.name}</h4>
                      <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {selectedCustomer.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-600 mt-0.5">
                      <span className="font-mono">
                        {selectedCustomer.documentType}: {selectedCustomer.documentNumber}
                      </span>
                      <span>·</span>
                      <span>{selectedCustomer.phone}</span>
                      <span>·</span>
                      <span>{selectedCustomer.email}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => {
                      const nextCust = customers.find((c) => c.id !== selectedCustomer.id) || customers[0];
                      setSelectedCustomer(nextCust);
                    }}
                    className="text-xs text-blue-700 hover:text-blue-900 font-semibold cursor-pointer"
                  >
                    Cambiar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: Catálogo de Productos para la Venta */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                  2
                </span>
                <h3 className="font-bold text-sm text-slate-900">Catálogo de Productos para la Venta</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">database</span>
                Stock en Memoria (PDO)
              </span>
            </div>

            {/* Filter and Category Strip */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  placeholder="Buscar por SKU o descripción..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Category buttons */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredProducts.map((product) => {
                const isLow = product.currentStock <= product.minStock;
                const isOutOfStock = product.currentStock <= 0;

                return (
                  <div
                    key={product.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-400/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3"
                  >
                    <div>
                      {/* Product Header: SKU + Stock Badge */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {product.code}
                        </span>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            isOutOfStock
                              ? 'bg-rose-100 text-rose-800'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            {isOutOfStock ? 'cancel' : isLow ? 'warning' : 'inventory_2'}
                          </span>
                          <span>
                            {product.currentStock} disp.{isLow && !isOutOfStock ? ' (Bajo)' : ''}
                          </span>
                        </span>
                      </div>

                      {/* Product Title and Description */}
                      <h4 className="font-bold text-xs text-slate-900 leading-snug line-clamp-1">
                        {product.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                        {product.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Precio</span>
                        <span className="font-mono font-bold text-base text-slate-900">
                          ${product.salePrice.toLocaleString('es-CO')}{' '}
                          <span className="text-[10px] font-normal text-slate-400">COP</span>
                        </span>
                      </div>

                      <button
                        onClick={() => handleAddToCart(product)}
                        disabled={isOutOfStock}
                        className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          isOutOfStock
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow active:scale-95'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">add_shopping_cart</span>
                        <span>+ Agregar a la Orden</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Sticky Cart & Calculations */}
        <div className="lg:col-span-4 sticky top-24 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            {/* Header: Ticket & Item Count */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 text-[20px]">
                  receipt_long
                </span>
                <div>
                  <h3 className="font-bold text-xs text-slate-900">Orden en Construcción</h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Ticket Pre-Venta #ORD-2024-9102
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 font-mono">
                {totalItemCount} ITEMS
              </span>
            </div>

            {/* Cart Items List */}
            {cart.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-slate-300 text-[36px]">
                  shopping_cart
                </span>
                <span>No hay productos seleccionados en la orden.</span>
                <span className="text-[11px] text-slate-400">Selecciona productos del catálogo</span>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div
                    key={item.productId}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-900 block">{item.productName}</span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          Unitario: ${item.unitPrice.toLocaleString('es-CO')} COP
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(item.productId)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                        title="Eliminar de la orden"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      {/* Stepper */}
                      <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2 py-0.5">
                        <button
                          onClick={() => handleUpdateQuantity(item.productId, -1)}
                          className="font-bold text-slate-700 hover:text-blue-600 px-1 cursor-pointer"
                        >
                          -
                        </button>
                        <span className="font-bold text-slate-900 px-2 font-mono">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(item.productId, 1)}
                          className="font-bold text-slate-700 hover:text-blue-600 px-1 cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      {/* Subtotal */}
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        ${item.subtotal.toLocaleString('es-CO')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Calculations Breakdown */}
            <div className="pt-3 border-t border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal Facturable</span>
                <span className="font-mono font-medium">${subtotalNeto.toLocaleString('es-CO')} COP</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Descuento Promocional</span>
                <span className="font-mono text-emerald-600 font-medium">$0 COP</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>IVA (19% Régimen General)</span>
                <span className="font-mono font-medium">${iva.toLocaleString('es-CO')} COP</span>
              </div>

              {/* Total Card */}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-baseline justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[11px] uppercase font-bold text-slate-500 block">
                      TOTAL GENERAL
                    </span>
                    <span className="text-[10px] text-slate-400">Moneda Legal (COP)</span>
                  </div>
                  <span className="text-2xl font-extrabold text-blue-600 font-mono">
                    ${totalAmount.toLocaleString('es-CO')}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 flex items-center gap-1 pt-1">
                <span className="material-symbols-outlined text-[14px] text-emerald-600">verified</span>
                <span>Precios verificados contra base de datos por V...</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handleRegisterPendingSale}
                disabled={cart.length === 0}
                className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
                  cart.length === 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 active:scale-98'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">assignment_turned_in</span>
                <span>Registrar Venta Pendiente</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleClearCart}
                  disabled={cart.length === 0}
                  className="py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[15px]">clear_all</span>
                  <span>Limpiar Ítems</span>
                </button>
                <button
                  onClick={handleClearCart}
                  disabled={cart.length === 0}
                  className="py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[15px]">cancel</span>
                  <span>Cancelar Pedido</span>
                </button>
              </div>
            </div>

            {/* Academic RF-08 Callout */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <div className="flex items-center gap-1 text-slate-800 font-bold">
                <span className="material-symbols-outlined text-[15px] text-blue-600">terminal</span>
                <span>Requerimiento Funcional RF-08</span>
              </div>
              <p className="leading-relaxed">
                Cálculo de totales en tiempo real en cliente y revalidación obligatoria en servidor antes del commit de persistencia transaccional (ACID). El inventario se reserva únicamente con estado <strong>PAGADA</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
