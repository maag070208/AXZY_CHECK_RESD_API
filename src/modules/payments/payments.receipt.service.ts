import PDFDocument from "pdfkit";

interface ReceiptData {
  paymentId: string;
  amount: number;
  status: string;
  paidAt: Date | null;
  createdAt: Date;
  stripePaymentIntentId: string | null;
  feeName: string;
  residentName: string;
  residentPhone: string | null;
  residentEmail: string | null;
}

export const generateReceiptPDF = (data: ReceiptData): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 40 });
    const buffers: Buffer[] = [];

    doc.on("data", (chunk: any) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const C = {
      SLATE_900: "#0f172a",
      SLATE_700: "#334155",
      SLATE_600: "#475569",
      SLATE_500: "#64748b",
      SLATE_400: "#94a3b8",
      SLATE_200: "#e2e8f0",
      SLATE_100: "#f1f5f9",
      SLATE_50: "#f8fafc",
      WHITE: "#ffffff",
      GREEN: "#16a34a",
      EMERALD_50: "#ecfdf5",
    };

    const PW = doc.page.width - 80;
    const CX = doc.page.width / 2;
    const folio = data.paymentId.slice(0, 8).toUpperCase();
    const issuedDate = new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });
    const statusLabel = data.status === "PAID" ? "PAGADO" : data.status;

    // ── TOP BAR ──
    doc.rect(0, 0, doc.page.width, 8).fill(C.SLATE_900);

    // ── HEADER ROW ──
    doc.fillColor(C.SLATE_900).fontSize(10).font("Helvetica-Bold").text("COMPROBANTE DE PAGO", 40, 24);
    doc.roundedRect(PW - 62, 22, 52, 18, 4).fill(C.GREEN);
    doc.fillColor(C.WHITE).fontSize(7).font("Helvetica-Bold").text(statusLabel, PW - 62, 27, { width: 52, align: "center" });

    doc.fontSize(6).font("Helvetica").fillColor(C.SLATE_500).text(`Folio: ${folio}    |    ${issuedDate}`, 40, 46);

    // ── DIVIDER ──
    doc.moveTo(40, 60).lineTo(40 + PW, 60).lineWidth(0.5).stroke(C.SLATE_200);

    // ── AMOUNT PANEL ──
    doc.roundedRect(40, 74, PW, 56, 6).fill(C.SLATE_50);
    doc.roundedRect(40, 74, PW, 56, 6).lineWidth(0.5).stroke(C.SLATE_200);

    doc.fillColor(C.SLATE_900).fontSize(26).font("Helvetica-Bold").text(
      `$${data.amount.toFixed(2)} MXN`, 40, 82, { width: PW, align: "center" }
    );
    doc.fillColor(C.SLATE_600).fontSize(7).font("Helvetica-Bold").text(
      data.feeName.toUpperCase(), 40, 114, { width: PW, align: "center" }
    );

    // ── TWO-COLUMN INFO SECTION ──
    const infoY = 148;
    const colW = (PW - 10) / 2;
    const col1X = 40;
    const col2X = 40 + colW + 10;

    // LEFT: RESIDENTE
    doc.roundedRect(col1X, infoY, colW, 90, 6).fill(C.WHITE);
    doc.roundedRect(col1X, infoY, colW, 90, 6).lineWidth(0.5).stroke(C.SLATE_200);
    doc.fillColor(C.SLATE_900).fontSize(7).font("Helvetica-Bold").text("RESIDENTE", col1X + 12, infoY + 10);
    doc.fontSize(9).font("Helvetica-Bold").fillColor(C.SLATE_900).text(data.residentName, col1X + 12, infoY + 26);
    doc.fontSize(7).font("Helvetica").fillColor(C.SLATE_500).text(data.residentPhone || "—", col1X + 12, infoY + 46);
    doc.fontSize(7).font("Helvetica").fillColor(C.SLATE_500).text(data.residentEmail || "—", col1X + 12, infoY + 62);

    // RIGHT: DETALLE
    doc.roundedRect(col2X, infoY, colW, 90, 6).fill(C.WHITE);
    doc.roundedRect(col2X, infoY, colW, 90, 6).lineWidth(0.5).stroke(C.SLATE_200);
    doc.fillColor(C.SLATE_900).fontSize(7).font("Helvetica-Bold").text("DETALLE DEL PAGO", col2X + 12, infoY + 10);

    const detailRows = [
      ["Folio", folio],
      ["Concepto", data.feeName],
      ["Monto", `$${data.amount.toFixed(2)} MXN`],
      ["Método", "Tarjeta (Stripe)"],
    ];
    let dy = infoY + 28;
    detailRows.forEach(([l, v]) => {
      doc.fontSize(6).font("Helvetica-Bold").fillColor(C.SLATE_500).text(l as string, col2X + 12, dy);
      doc.fontSize(7).font("Helvetica").fillColor(C.SLATE_900).text(v as string, col2X + 12 + 55, dy);
      dy += 14;
    });

    // ── BOTTOM ROW: FECHAS ──
    const dateY = infoY + 104;
    doc.roundedRect(40, dateY, PW, 36, 6).fill(C.WHITE);
    doc.roundedRect(40, dateY, PW, 36, 6).lineWidth(0.5).stroke(C.SLATE_200);

    if (data.paidAt) {
      doc.fontSize(6).font("Helvetica-Bold").fillColor(C.SLATE_500).text("FECHA DE PAGO", 52, dateY + 8);
      doc.fontSize(7).font("Helvetica").fillColor(C.SLATE_900).text(
        new Date(data.paidAt).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }),
        52, dateY + 22
      );
    }
    doc.fontSize(6).font("Helvetica-Bold").fillColor(C.SLATE_500).text("FECHA DE CREACIÓN", CX + 10, dateY + 8);
    doc.fontSize(7).font("Helvetica").fillColor(C.SLATE_900).text(
      new Date(data.createdAt).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      CX + 10, dateY + 22
    );

    // ── AUDIT ──
    let currentY = dateY + 50;
    if (data.stripePaymentIntentId) {
      doc.roundedRect(40, currentY, PW, 44, 6).fill(C.WHITE);
      doc.roundedRect(40, currentY, PW, 44, 6).lineWidth(0.5).stroke(C.SLATE_200);
      doc.fillColor(C.SLATE_900).fontSize(7).font("Helvetica-Bold").text("AUDITORÍA", 52, currentY + 10);
      doc.fontSize(6).font("Helvetica-Bold").fillColor(C.SLATE_500).text("Payment Intent ID", 52, currentY + 26);
      doc.fontSize(6).font("Helvetica").fillColor(C.SLATE_900).text(data.stripePaymentIntentId, 52 + 85, currentY + 26);
      currentY += 44;
    }

    // ── FOOTER ──
    const footerY = 704;
    doc.moveTo(40, footerY).lineTo(40 + PW, footerY).lineWidth(0.5).stroke(C.SLATE_200);
    doc.fillColor(C.SLATE_400).fontSize(6).font("Helvetica").text(
      "AXZY CHECK — Sistema de Administración Residencial",
      40, footerY + 12, { width: PW, align: "center" }
    );
    doc.fontSize(5).font("Helvetica").fillColor(C.SLATE_400).text(
      "Comprobante válido para fines administrativos.",
      40, footerY + 24, { width: PW, align: "center" }
    );
    doc.end();
  });
};

const sanitizeFileName = (name: string): string =>
  name
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .toLowerCase()
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

export const generateAndUploadReceipt = async (payment: any, resident: any): Promise<string | null> => {
  return null;
};

export const generateReceiptFromPaymentData = async (payment: any, resident: any): Promise<Buffer> => {
  const receiptData: ReceiptData = {
    paymentId: payment.id,
    amount: Number(payment.amount),
    status: payment.status || "PAID",
    paidAt: payment.paidAt || new Date(),
    createdAt: payment.createdAt || new Date(),
    stripePaymentIntentId: payment.stripePaymentIntentId || null,
    feeName: payment.fee?.name || "Cuota",
    residentName: resident?.user?.name
      ? `${resident.user.name} ${resident.user.lastName || ""}`.trim()
      : "Residente",
    residentPhone: resident?.phone || null,
    residentEmail: resident?.email || null,
  };
  return generateReceiptPDF(receiptData);
};