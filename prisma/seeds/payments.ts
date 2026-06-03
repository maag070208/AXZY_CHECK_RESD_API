import { PrismaClient, PaymentStatus } from "@prisma/client";
import { hackerLog } from "./logger";

export const paymentsSeed = async (prisma: PrismaClient) => {
  hackerLog.info("PAYMENTS", "Seeding fees and resident payments");

  const now = new Date();

  // ── Fees ─────────────────────────────────────────────────────────────────
  const fees = [
    {
      name: "Cuota de Mantenimiento - Junio 2026",
      description: "Cuota mensual de mantenimiento de áreas comunes",
      amount: 500.00,
      dueDate: new Date("2026-06-30"),
    },
    {
      name: "Cuota de Mantenimiento - Mayo 2026",
      description: "Cuota mensual de mantenimiento de áreas comunes",
      amount: 500.00,
      dueDate: new Date("2026-05-31"),
    },
    {
      name: "Cuota de Seguridad - Q2 2026",
      description: "Cuota trimestral de servicios de seguridad",
      amount: 1200.00,
      dueDate: new Date("2026-06-30"),
    },
    {
      name: "Limpieza Cisterna",
      description: "Cuota especial para limpieza de cisterna comunitaria",
      amount: 200.00,
      dueDate: new Date("2026-07-15"),
    },
    {
      name: "Reparación Portón Principal",
      description: "Cuota extraordinaria para reparación del portón de entrada",
      amount: 350.00,
      dueDate: new Date("2026-06-20"),
    },
  ];

  const feeIds: string[] = [];
  for (const f of fees) {
    const fee = await prisma.fee.create({ data: { ...f, active: true } });
    feeIds.push(fee.id);
  }

  hackerLog.info("PAYMENTS", "Creating resident payments");

  // ── Payments ──────────────────────────────────────────────────────────────
  const residents = await prisma.resident.findMany({
    where: { active: true, deletedAt: null },
  });

  if (residents.length === 0) {
    hackerLog.error("PAYMENTS", "No residents found");
    return;
  }

  const statusCycle: PaymentStatus[] = [
    PaymentStatus.PAID,
    PaymentStatus.PAID,
    PaymentStatus.PENDING,
    PaymentStatus.PAID,
    PaymentStatus.FAILED,
    PaymentStatus.CANCELLED,
    PaymentStatus.PENDING,
    PaymentStatus.PAID,
  ];

  let payIdx = 0;
  for (const resident of residents) {
    // Each resident gets payments for first 2-3 fees
    const numFees = (payIdx % 3) + 2;
    for (let f = 0; f < Math.min(numFees, feeIds.length); f++) {
      const status = statusCycle[payIdx % statusCycle.length];
      const fee = fees[f];

      const payment = await prisma.payment.create({
        data: {
          residentId: resident.id,
          feeId: feeIds[f],
          amount: fee.amount,
          reference: status === PaymentStatus.PAID ? `REF${String(100000 + payIdx).slice(1)}` : null,
          status,
          paidAt: status === PaymentStatus.PAID ? now : null,
        },
      });

      // Create payment log
      await prisma.paymentLog.create({
        data: {
          paymentId: payment.id,
          residentId: resident.id,
          action: "CREATE",
          statusTo: status,
          amount: fee.amount,
          notes: `Pago generado por seed`,
        },
      });

      payIdx++;
    }
  }

  const feeCount = await prisma.fee.count();
  const payCount = await prisma.payment.count();
  hackerLog.success("PAYMENTS", `${feeCount} fees, ${payCount} payments seeded`);
};
