export type Role = 'admin' | 'cajero' | 'vendedor';

export interface User {
  id: string;
  name: string;
  role: Role;
  roleLabel: string;
  avatarUrl?: string;
  code: string;
}

export type Category = 'Almacenamiento' | 'Periféricos' | 'Componentes' | 'Accesorios';

export interface Product {
  id: number;
  code: string; // e.g. COD-SSD-101
  name: string;
  description: string;
  category: Category;
  salePrice: number;
  costPrice: number;
  currentStock: number;
  minStock: number;
  optimalStock: number;
  image?: string;
  icon?: string;
  status: 'Activo' | 'Inactivo';
}

export interface Customer {
  id: string;
  documentType: 'CC' | 'NIT' | 'CE' | 'Pasaporte';
  documentNumber: string;
  name: string;
  phone: string;
  email: string;
  address?: string;
  status: 'ACTIVO' | 'INACTIVO';
}

export type SaleStatus = 'PAGADA' | 'PENDIENTE' | 'ANULADA';

export interface SaleItem {
  productId: number;
  productCode: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface Sale {
  id: number;
  correlativeNumber: string; // e.g. FAC-2024-0104 or #VTA-1042
  voucherNumber: string; // e.g. COMP-00001042
  date: string;
  time: string;
  customer: Customer;
  vendorName: string;
  vendorRole: string;
  items: SaleItem[];
  subtotalNeto: number;
  iva: number; // 19%
  total: number;
  status: SaleStatus;
  paymentMethod?: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA';
  amountReceived?: number;
  changeGiven?: number;
  cashierName?: string;
  cashRegisterId?: number;
  cancellationReason?: string;
  cancellationDate?: string;
  cancellationUser?: string;
  verificationHash?: string;
}

export interface CashMovement {
  id: number;
  cashRegisterId: number;
  type: 'INGRESO_VENTA' | 'EGRESO' | 'DEVOLUCION_ANULACION' | 'APERTURA';
  method: 'EFECTIVO' | 'TRANSFERENCIA';
  amount: number;
  concept: string;
  date: string;
  time: string;
  saleId?: number;
  receiptNumber?: string;
}

export interface KardexMovement {
  id: number;
  productId: number;
  productCode: string;
  productName: string;
  type: 'ENTRADA_AJUSTE' | 'STOCK_INICIAL' | 'SALIDA_VENTA' | 'REPOSICION_ANULACION';
  quantity: number;
  documentRef: string;
  reason: string;
  user: string;
  date: string;
  time: string;
  txHash?: string;
}

export interface CashSession {
  id: number;
  registerNumber: string; // "Caja #004"
  status: 'ABIERTA' | 'CERRADA';
  turnName: string; // "Turno Mañana" or "Turno #089"
  cashier: string;
  cashierId: string;
  openingTime: string;
  openingBalance: number; // $200,000
  totalSalesCash: number; // +$740,000
  totalSalesBank: number; // $480,000
  totalOutflows: number; // -$50,000
  totalRefunds: number; // $0
}
