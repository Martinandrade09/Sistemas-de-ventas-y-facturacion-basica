import React, { useState, useRef, useCallback } from 'react';
import {
  INITIAL_USERS,
  INITIAL_PRODUCTS,
  INITIAL_CUSTOMERS,
  INITIAL_SALES,
  INITIAL_CASH_SESSION,
  INITIAL_CASH_MOVEMENTS,
  INITIAL_KARDEX_MOVEMENTS,
} from './data/mockData';
import { Product, Customer, Sale, User, CashSession, CashMovement, KardexMovement } from './types';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { DashboardView } from './views/DashboardView';
import { PosView } from './views/PosView';
import { CashRegisterView } from './views/CashRegisterView';
import { InventoryView } from './views/InventoryView';
import { ReportsView } from './views/ReportsView';
import { VoidSaleModal } from './modals/VoidSaleModal';
import { VoucherModal } from './modals/VoucherModal';
import { StockAdjustmentModal } from './modals/StockAdjustmentModal';
import { BlindCashCountModal } from './modals/BlindCashCountModal';
import { NewCustomerModal } from './modals/NewCustomerModal';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<string>('panel-general');

  // RBAC User Session State
  const [users] = useState<User[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_USERS[0]);

  // Core Data State
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [sales, setSales] = useState<Sale[]>(INITIAL_SALES);
  const [cashSession, setCashSession] = useState<CashSession>(INITIAL_CASH_SESSION);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>(INITIAL_CASH_MOVEMENTS);
  const [kardexMovements, setKardexMovements] = useState<KardexMovement[]>(INITIAL_KARDEX_MOVEMENTS);

  // Modal Visibility States
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [activeVoidSale, setActiveVoidSale] = useState<Sale | null>(null);

  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [activeVoucherSale, setActiveVoucherSale] = useState<Sale | null>(null);

  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockModalProductId, setStockModalProductId] = useState<number | null>(null);

  const [isBlindCountModalOpen, setIsBlindCountModalOpen] = useState(false);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; isError: boolean; visible: boolean }>({
    message: '',
    isError: false,
    visible: false,
  });
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, isError: boolean = false) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ message, isError, visible: true });
    toastTimerRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 5000);
  }, []);

  // --- Handlers & Business Logic ---

  // 1. Create Pending Sale from POS (RF-07 / RF-08)
  const handleCreateSale = (newSaleData: Partial<Sale>) => {
    const createdSale: Sale = {
      id: newSaleData.id || Date.now(),
      correlativeNumber: newSaleData.correlativeNumber || `FAC-2024-0${sales.length + 100}`,
      voucherNumber: newSaleData.voucherNumber || `COMP-0000${sales.length + 100}`,
      date: newSaleData.date || '14/11/2024',
      time: newSaleData.time || '11:45 AM',
      customer: newSaleData.customer || customers[0],
      vendorName: newSaleData.vendorName || currentUser.name,
      vendorRole: newSaleData.vendorRole || currentUser.role,
      items: newSaleData.items || [],
      subtotalNeto: newSaleData.subtotalNeto || 0,
      iva: newSaleData.iva || 0,
      total: newSaleData.total || 0,
      status: 'PENDIENTE',
    };

    setSales((prev) => [createdSale, ...prev]);
  };

  // 2. Confirm Payment in Cash Register (ACID: update sale, deduct stock, log cash & kardex)
  const handleConfirmPayment = (
    saleId: number,
    method: 'EFECTIVO' | 'TRANSFERENCIA',
    amountReceived?: number
  ) => {
    const saleToPay = sales.find((s) => s.id === saleId);
    if (!saleToPay) return;

    // Deduct stock for all items
    setProducts((prevProducts) => {
      return prevProducts.map((prod) => {
        const item = saleToPay.items.find((it) => it.productId === prod.id);
        if (item) {
          return {
            ...prod,
            currentStock: Math.max(0, prod.currentStock - item.quantity),
          };
        }
        return prod;
      });
    });

    // Record Kardex movements
    const newKardex: KardexMovement[] = saleToPay.items.map((it, idx) => ({
      id: 9850 + idx + Math.floor(Math.random() * 20),
      productId: it.productId,
      productCode: it.productCode,
      productName: it.productName,
      type: 'SALIDA_VENTA',
      quantity: it.quantity,
      documentRef: saleToPay.correlativeNumber,
      reason: `Despacho de venta ${saleToPay.correlativeNumber}`,
      user: currentUser.name,
      date: '14/11/2024',
      time: '11:50 AM',
      txHash: `TX-${saleToPay.id}`,
    }));
    setKardexMovements((prev) => [...newKardex, ...prev]);

    // Record Cash movement
    const newCashMov: CashMovement = {
      id: cashMovements.length + 1,
      cashRegisterId: cashSession.id,
      type: 'INGRESO_VENTA',
      method,
      amount: saleToPay.total,
      concept: `Cobro venta ${saleToPay.correlativeNumber} en ${method.toLowerCase()}`,
      date: '14/11/2024',
      time: '11:50 AM',
      saleId: saleToPay.id,
      receiptNumber: saleToPay.voucherNumber,
    };
    setCashMovements((prev) => [newCashMov, ...prev]);

    // Update Cash Session totals
    setCashSession((prev) => ({
      ...prev,
      totalSalesCash: method === 'EFECTIVO' ? prev.totalSalesCash + saleToPay.total : prev.totalSalesCash,
      totalSalesBank: method === 'TRANSFERENCIA' ? prev.totalSalesBank + saleToPay.total : prev.totalSalesBank,
    }));

    // Update Sale to PAGADA
    const changeGiven = method === 'EFECTIVO' && amountReceived ? Math.max(0, amountReceived - saleToPay.total) : 0;
    setSales((prev) =>
      prev.map((s) =>
        s.id === saleId
          ? {
              ...s,
              status: 'PAGADA',
              paymentMethod: method,
              amountReceived: amountReceived || saleToPay.total,
              changeGiven,
              cashierName: currentUser.name,
              cashRegisterId: 4,
              verificationHash: 'e4d909c290d0f0b1ca068ffaddf22cbd0a1f9401',
            }
          : s
      )
    );
  };

  // 3. Atomic Void Protocol (RF-13: Rollback stock & cash)
  const handleConfirmVoid = (
    saleId: number,
    reason: string,
    refundMethod: 'EFECTIVO' | 'TRANSFERENCIA'
  ) => {
    const saleToVoid = sales.find((s) => s.id === saleId);
    if (!saleToVoid) return;

    const wasPaid = saleToVoid.status === 'PAGADA';

    if (wasPaid) {
      // 1. Restock products
      setProducts((prev) =>
        prev.map((prod) => {
          const item = saleToVoid.items.find((it) => it.productId === prod.id);
          if (item) {
            return {
              ...prod,
              currentStock: prod.currentStock + item.quantity,
            };
          }
          return prod;
        })
      );

      // 2. Add Kardex return movements
      const returnKardex: KardexMovement[] = saleToVoid.items.map((it, idx) => ({
        id: 9900 + idx + Math.floor(Math.random() * 20),
        productId: it.productId,
        productCode: it.productCode,
        productName: it.productName,
        type: 'REPOSICION_ANULACION',
        quantity: it.quantity,
        documentRef: saleToVoid.correlativeNumber,
        reason: `Anulación ${saleToVoid.correlativeNumber} / Reingreso`,
        user: currentUser.name,
        date: '14/11/2024',
        time: '12:00 PM',
        txHash: `REV-${saleToVoid.id}`,
      }));
      setKardexMovements((prev) => [...returnKardex, ...prev]);

      // 3. Add cash refund outflow movement
      const refundMov: CashMovement = {
        id: cashMovements.length + 1,
        cashRegisterId: cashSession.id,
        type: 'DEVOLUCION_ANULACION',
        method: refundMethod,
        amount: -saleToVoid.total,
        concept: `Reembolso por anulación ${saleToVoid.correlativeNumber}`,
        date: '14/11/2024',
        time: '12:00 PM',
        saleId: saleToVoid.id,
        receiptNumber: `DEV-${saleToVoid.voucherNumber}`,
      };
      setCashMovements((prev) => [refundMov, ...prev]);

      // 4. Update session refunds
      setCashSession((prev) => ({
        ...prev,
        totalRefunds: prev.totalRefunds + saleToVoid.total,
      }));
    }

    // Update Sale to ANULADA
    setSales((prev) =>
      prev.map((s) =>
        s.id === saleId
          ? {
              ...s,
              status: 'ANULADA',
              cancellationReason: reason,
              cancellationDate: '14/11/2024 12:00 PM',
              cancellationUser: currentUser.name,
              verificationHash: 'a4c8f932e67df14800b189e904b78912efc4019a',
            }
          : s
      )
    );

    showToast(
      `Venta #${saleToVoid.correlativeNumber} anulada con éxito. Inventario y caja actualizados.`,
      false
    );
  };

  // 4. Stock Entry / Adjustment (RF-06)
  const handleAddStock = (
    productId: number,
    quantity: number,
    docRef: string,
    reason: string,
    type: 'ENTRADA_AJUSTE' | 'STOCK_INICIAL' = 'ENTRADA_AJUSTE'
  ) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, currentStock: p.currentStock + quantity } : p))
    );

    const newKardex: KardexMovement = {
      id: 9950 + Math.floor(Math.random() * 40),
      productId: prod.id,
      productCode: prod.code,
      productName: prod.name,
      type,
      quantity,
      documentRef: docRef,
      reason,
      user: currentUser.name,
      date: '14/11/2024',
      time: '12:05 PM',
      txHash: `ENT-${Date.now().toString().slice(-4)}`,
    };

    setKardexMovements((prev) => [newKardex, ...prev]);
  };

  // 5. Customer Registration
  const handleSaveCustomer = (newCustomer: Customer) => {
    setCustomers((prev) => [newCustomer, ...prev]);
  };

  // --- Modal Openers ---
  const handleOpenVoidModal = (sale: Sale) => {
    setActiveVoidSale(sale);
    setIsVoidModalOpen(true);
  };

  const handleViewVoucher = (sale: Sale) => {
    setActiveVoucherSale(sale);
    setIsVoucherModalOpen(true);
  };

  const handleOpenStockModal = (productId?: number) => {
    setStockModalProductId(productId || null);
    setIsStockModalOpen(true);
  };

  const handlePaySaleFromDashboard = (sale: Sale) => {
    setActiveTab('control-de-caja');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* 1. Global Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        users={users}
        onSelectUser={(u) => {
          setCurrentUser(u);
          showToast(`Rol activo cambiado a: ${u.name} (${u.roleLabel})`, false);
        }}
      />

      {/* 2. Main Tab View Router */}
      <main className="flex-1 pt-20">
        {activeTab === 'panel-general' && (
          <DashboardView
            sales={sales}
            products={products}
            cashSession={cashSession}
            currentUser={currentUser}
            onNavigate={setActiveTab}
            onViewVoucher={handleViewVoucher}
            onPaySale={handlePaySaleFromDashboard}
            onOpenStockModal={handleOpenStockModal}
            onToast={showToast}
          />
        )}

        {activeTab === 'punto-de-venta' && (
          <PosView
            products={products}
            customers={customers}
            currentUser={currentUser}
            onOpenNewCustomerModal={() => setIsNewCustomerModalOpen(true)}
            onCreateSale={handleCreateSale}
            onToast={showToast}
          />
        )}

        {activeTab === 'control-de-caja' && (
          <CashRegisterView
            sales={sales}
            products={products}
            cashSession={cashSession}
            currentUser={currentUser}
            onConfirmPayment={handleConfirmPayment}
            onOpenBlindCountModal={() => setIsBlindCountModalOpen(true)}
            onViewVoucher={handleViewVoucher}
            onToast={showToast}
          />
        )}

        {activeTab === 'catalogo-inventario' && (
          <InventoryView
            products={products}
            kardexMovements={kardexMovements}
            currentUser={currentUser}
            onOpenStockModal={handleOpenStockModal}
            onAddStockQuick={(pId, qty, doc, rsn) => handleAddStock(pId, qty, doc, rsn)}
            onToast={showToast}
          />
        )}

        {activeTab === 'reportes-gestion' && (
          <ReportsView
            sales={sales}
            products={products}
            kardexMovements={kardexMovements}
            cashSession={cashSession}
            cashMovements={cashMovements}
            currentUser={currentUser}
            onOpenVoidModal={handleOpenVoidModal}
            onViewVoucher={handleViewVoucher}
            onOpenStockModal={handleOpenStockModal}
            onToast={showToast}
          />
        )}
      </main>

      {/* 3. Global Footer */}
      <Footer />

      {/* 4. Modals and Drawers */}
      <VoidSaleModal
        sale={activeVoidSale}
        isOpen={isVoidModalOpen}
        onClose={() => setIsVoidModalOpen(false)}
        onConfirmVoid={handleConfirmVoid}
        currentUser={currentUser}
        onToast={showToast}
      />

      <VoucherModal
        sale={activeVoucherSale}
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
      />

      <StockAdjustmentModal
        products={products}
        selectedProductId={stockModalProductId}
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        onAddStock={handleAddStock}
        currentUser={currentUser}
        onToast={showToast}
      />

      <BlindCashCountModal
        session={cashSession}
        isOpen={isBlindCountModalOpen}
        onClose={() => setIsBlindCountModalOpen(false)}
        currentUser={currentUser}
        onToast={showToast}
      />

      <NewCustomerModal
        isOpen={isNewCustomerModalOpen}
        onClose={() => setIsNewCustomerModalOpen(false)}
        onSaveCustomer={handleSaveCustomer}
        onToast={showToast}
      />

      {/* 5. Dynamic Toast Notification */}
      {toast.visible && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold animate-in slide-in-from-bottom-3 duration-200 border ${
            toast.isError
              ? 'bg-rose-900 text-rose-100 border-rose-700'
              : 'bg-slate-900 text-slate-100 border-slate-700'
          }`}
        >
          <span
            className={`material-symbols-outlined text-[20px] ${
              toast.isError ? 'text-rose-300' : 'text-emerald-400'
            }`}
          >
            {toast.isError ? 'warning' : 'check_circle'}
          </span>
          <span>{toast.message}</span>
          <button
            onClick={() => setToast((prev) => ({ ...prev, visible: false }))}
            className="text-slate-400 hover:text-white ml-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}
    </div>
  );
}
