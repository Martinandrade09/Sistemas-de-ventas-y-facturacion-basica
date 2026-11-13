import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CashMovement, CashSession, Sale, User } from '../types';

export interface ManagementPdfReportInput {
  sales: Sale[];
  totalSalesCount: number;
  cashSession: CashSession;
  cashMovements: CashMovement[];
  currentUser: User;
  appliedFiltersLabel?: string;
}

const formatCOP = (amount: number): string => {
  const absFormatted = Math.abs(amount).toLocaleString('es-CO');
  return amount < 0 ? `-$${absFormatted} COP` : `$${absFormatted} COP`;
};

const getLastTableFinalY = (doc: jsPDF, fallbackY: number): number => {
  const withTable = doc as unknown as { lastAutoTable?: { finalY?: number } };
  return withTable.lastAutoTable?.finalY ?? fallbackY;
};

export function generateManagementPdfReport({
  sales,
  totalSalesCount,
  cashSession,
  cashMovements,
  currentUser,
  appliedFiltersLabel,
}: ManagementPdfReportInput): string {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;

  const now = new Date();
  const generatedAt = `${now.toLocaleDateString('es-CO')} ${now.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;

  // Sales KPI calculations
  const paidSales = sales.filter((s) => s.status === 'PAGADA');
  const pendingSales = sales.filter((s) => s.status === 'PENDIENTE');
  const voidSales = sales.filter((s) => s.status === 'ANULADA');

  const paidTotal = paidSales.reduce((acc, s) => acc + s.total, 0);
  const paidNet = paidSales.reduce((acc, s) => acc + s.subtotalNeto, 0);
  const paidIva = paidSales.reduce((acc, s) => acc + s.iva, 0);
  const pendingTotal = pendingSales.reduce((acc, s) => acc + s.total, 0);
  const voidTotal = voidSales.reduce((acc, s) => acc + s.total, 0);

  // Cash reconciliation calculations
  const expectedDrawerBalance =
    cashSession.openingBalance +
    cashSession.totalSalesCash -
    cashSession.totalOutflows -
    cashSession.totalRefunds;

  // --- 1. Executive Header Banner ---
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.rect(0, 0, pageWidth, 34, 'F');

  doc.setFillColor(37, 99, 235); // Blue-600 accent bar
  doc.rect(0, 34, pageWidth, 1.5, 'F');

  doc.setTextColor(148, 163, 184); // Slate-400
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('SISTEMA DE VENTAS & FACTURACIÓN · INFORME EJECUTIVO DE GERENCIA', marginX, 11);

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Reporte Resumen de Ventas y Movimientos de Caja', marginX, 19.5);

  doc.setTextColor(203, 213, 225); // Slate-300
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `Generado: ${generatedAt}  |  Auditor: ${currentUser.name} (${currentUser.roleLabel})`,
    marginX,
    27
  );

  doc.setFont('helvetica', 'bold');
  doc.text(
    `${cashSession.registerNumber} · ${cashSession.status}`,
    pageWidth - marginX,
    19.5,
    { align: 'right' }
  );
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Cajero: ${cashSession.cashier} (ID ${cashSession.cashierId})`,
    pageWidth - marginX,
    27,
    { align: 'right' }
  );

  // --- 2. Context & Executive KPI Cards ---
  let cursorY = 42;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, cursorY, contentWidth, 12, 2, 2, 'FD');
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('ALCANCE DEL REPORTE:', marginX + 3.5, cursorY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(
    appliedFiltersLabel ||
      `Consolidado completo (${sales.length} de ${totalSalesCount} ventas registradas) y ${cashMovements.length} movimientos de caja.`,
    marginX + 41,
    cursorY + 5
  );
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.text(
    `Turno: ${cashSession.turnName}  ·  Apertura: ${cashSession.openingTime}  ·  Control de Caja y Facturación`,
    marginX + 3.5,
    cursorY + 9.5
  );

  cursorY += 16;

  // KPI Grid (3 columns x 2 rows)
  const cardGap = 4;
  const cardWidth = (contentWidth - cardGap * 2) / 3;
  const cardHeight = 18;

  const kpiCards: Array<{
    title: string;
    value: string;
    subtitle: string;
    accentRgb: [number, number, number];
    bgRgb: [number, number, number];
  }> = [
    {
      title: 'VENTAS PAGADAS (RECAUDO EFECTIVO/BANCO)',
      value: formatCOP(paidTotal),
      subtitle: `${paidSales.length} transacción(es) confirmadas`,
      accentRgb: [5, 150, 105],
      bgRgb: [236, 253, 245],
    },
    {
      title: 'VENTAS PENDIENTES DE COBRO',
      value: formatCOP(pendingTotal),
      subtitle: `${pendingSales.length} orden(es) en cola de caja`,
      accentRgb: [217, 119, 6],
      bgRgb: [255, 251, 235],
    },
    {
      title: 'VENTAS ANULADAS',
      value: formatCOP(voidTotal),
      subtitle: `${voidSales.length} documento(s) anulados`,
      accentRgb: [225, 29, 72],
      bgRgb: [255, 241, 242],
    },
    {
      title: 'SALDO INICIAL + INGRESOS EFECTIVO',
      value: formatCOP(cashSession.openingBalance + cashSession.totalSalesCash),
      subtitle: `Base: ${formatCOP(cashSession.openingBalance)} | Cobros: ${formatCOP(cashSession.totalSalesCash)}`,
      accentRgb: [37, 99, 235],
      bgRgb: [239, 246, 255],
    },
    {
      title: 'EGRESOS Y DEVOLUCIONES EN CAJA',
      value: formatCOP(-(cashSession.totalOutflows + cashSession.totalRefunds)),
      subtitle: `Egresos: ${formatCOP(cashSession.totalOutflows)} | Reembolsos: ${formatCOP(cashSession.totalRefunds)}`,
      accentRgb: [100, 116, 139],
      bgRgb: [248, 250, 252],
    },
    {
      title: 'SALDO FÍSICO ESPERADO EN GAVETA',
      value: formatCOP(expectedDrawerBalance),
      subtitle: `Transferencias bancarias: ${formatCOP(cashSession.totalSalesBank)}`,
      accentRgb: [15, 23, 42],
      bgRgb: [241, 245, 249],
    },
  ];

  kpiCards.forEach((card, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = marginX + col * (cardWidth + cardGap);
    const y = cursorY + row * (cardHeight + 3.5);

    doc.setFillColor(...card.bgRgb);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'FD');

    // Left accent strip
    doc.setFillColor(...card.accentRgb);
    doc.rect(x, y + 1.5, 1.4, cardHeight - 3, 'F');

    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text(card.title, x + 3.5, y + 5);

    doc.setTextColor(...card.accentRgb);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(card.value, x + 3.5, y + 11.2);

    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.text(card.subtitle, x + 3.5, y + 15.5, { maxWidth: cardWidth - 5 });
  });

  cursorY += cardHeight * 2 + 12;

  // --- 3. Section 1: Detalle de Ventas ---
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('1. Resumen Detallado de Ventas Registradas', marginX, cursorY);

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    `Base Gravable Pagada: ${formatCOP(paidNet)}  ·  IVA (19%) Pagado: ${formatCOP(paidIva)}`,
    pageWidth - marginX,
    cursorY,
    { align: 'right' }
  );

  cursorY += 3;

  const salesRows =
    sales.length > 0
      ? sales.map((s) => [
          `${s.correlativeNumber}\n${s.voucherNumber}`,
          `${s.date}\n${s.time}`,
          `${s.customer.name}\n${s.customer.documentType}: ${s.customer.documentNumber}`,
          s.vendorName.split('(')[0].trim(),
          s.paymentMethod || 'PENDIENTE',
          formatCOP(s.subtotalNeto),
          formatCOP(s.iva),
          formatCOP(s.total),
          s.status,
        ])
      : [['—', '—', 'Sin ventas registradas para los filtros aplicados', '—', '—', '—', '—', '—', '—']];

  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginX, right: marginX, bottom: 20 },
    head: [
      [
        'Factura / Comp.',
        'Fecha / Hora',
        'Cliente',
        'Vendedor',
        'Método',
        'Neto',
        'IVA 19%',
        'Total',
        'Estado',
      ],
    ],
    body: salesRows,
    foot:
      sales.length > 0
        ? [
            [
              'TOTALES (PAGADAS)',
              '',
              `${paidSales.length} confirmada(s) / ${sales.length} en listado`,
              '',
              '',
              formatCOP(paidNet),
              formatCOP(paidIva),
              formatCOP(paidTotal),
              '',
            ],
          ]
        : undefined,
    theme: 'grid',
    styles: {
      fontSize: 7.2,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.2,
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 25, fontStyle: 'bold' },
      1: { cellWidth: 19 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 21 },
      4: { cellWidth: 20 },
      5: { cellWidth: 18, halign: 'right' },
      6: { cellWidth: 17, halign: 'right' },
      7: { cellWidth: 19, halign: 'right', fontStyle: 'bold' },
      8: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 8) {
        const val = String(data.cell.raw);
        if (val === 'PAGADA') {
          data.cell.styles.textColor = [5, 150, 105];
          data.cell.styles.fillColor = [236, 253, 245];
        } else if (val === 'PENDIENTE') {
          data.cell.styles.textColor = [180, 83, 9];
          data.cell.styles.fillColor = [255, 251, 235];
        } else if (val === 'ANULADA') {
          data.cell.styles.textColor = [190, 18, 60];
          data.cell.styles.fillColor = [255, 241, 242];
        }
      }
    },
  });

  cursorY = getLastTableFinalY(doc, cursorY + 30) + 10;

  if (cursorY > pageHeight - 55) {
    doc.addPage();
    cursorY = 18;
  }

  // --- 4. Section 2: Movimientos de Caja ---
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('2. Movimientos de Caja y Conciliación de Turno', marginX, cursorY);

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    `Sesión #${cashSession.id} · ${cashMovements.length} partida(s) contables`,
    pageWidth - marginX,
    cursorY,
    { align: 'right' }
  );

  cursorY += 3;

  const cashNetTotal = cashMovements.reduce((acc, m) => acc + m.amount, 0);
  const cashRows =
    cashMovements.length > 0
      ? cashMovements.map((m) => [
          `#${m.id}`,
          `${m.date}\n${m.time}`,
          m.type,
          m.method,
          m.receiptNumber || (m.saleId ? `Venta #${m.saleId}` : '—'),
          m.concept,
          formatCOP(m.amount),
        ])
      : [['—', '—', '—', '—', '—', 'Sin movimientos registrados en la sesión actual', '$0 COP']];

  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginX, right: marginX, bottom: 25 },
    head: [['ID', 'Fecha / Hora', 'Tipo', 'Método', 'Referencia', 'Concepto Contable', 'Importe']],
    body: cashRows,
    foot:
      cashMovements.length > 0
        ? [
            [
              'NETO MOVIMIENTOS',
              '',
              '',
              '',
              `${cashMovements.length} reg.`,
              'Flujo acumulado (Efectivo + Transferencias)',
              formatCOP(cashNetTotal),
            ],
          ]
        : undefined,
    theme: 'grid',
    styles: {
      fontSize: 7.4,
      cellPadding: 2.3,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.4,
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 7.6,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 12, fontStyle: 'bold' },
      1: { cellWidth: 21 },
      2: { cellWidth: 31, fontStyle: 'bold' },
      3: { cellWidth: 23 },
      4: { cellWidth: 22 },
      5: { cellWidth: 'auto' },
      6: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 6) {
        const rawText = String(data.cell.raw);
        if (rawText.startsWith('-')) {
          data.cell.styles.textColor = [190, 18, 60];
        } else {
          data.cell.styles.textColor = [5, 150, 105];
        }
      }
    },
  });

  cursorY = getLastTableFinalY(doc, cursorY + 30) + 14;

  // --- 5. Executive Sign-off Block ---
  if (cursorY > pageHeight - 36) {
    doc.addPage();
    cursorY = 24;
  }

  const sigWidth = (contentWidth - 16) / 2;
  doc.setDrawColor(148, 163, 184);
  doc.line(marginX, cursorY + 10, marginX + sigWidth, cursorY + 10);
  doc.line(marginX + sigWidth + 16, cursorY + 10, pageWidth - marginX, cursorY + 10);

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Elaborado y Auditado por:', marginX, cursorY + 14.5);
  doc.text('Visto Bueno · Gerencia General:', marginX + sigWidth + 16, cursorY + 14.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`${currentUser.name} · ${currentUser.code}`, marginX, cursorY + 18.5);
  doc.text('Dirección Administrativa y Financiera', marginX + sigWidth + 16, cursorY + 18.5);

  // --- 6. Page Numbering Footer across all pages ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, pageHeight - 14, pageWidth - marginX, pageHeight - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'Reporte Gerencial Confidencial · Sistema de Ventas & Facturación',
      marginX,
      pageHeight - 9.5
    );
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - marginX, pageHeight - 9.5, {
      align: 'right',
    });
  }

  const dateStamp = now.toISOString().slice(0, 10);
  const filename = `reporte_gerencial_ventas_caja_${dateStamp}.pdf`;
  doc.save(filename);
  return filename;
}
