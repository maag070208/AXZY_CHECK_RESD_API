import { PrismaClient, PaymentStatus, FeeType } from "@prisma/client";
import { hackerLog } from "./logger";

export const paymentsSeed = async (prisma: PrismaClient) => {
  hackerLog.info("PAYMENTS", "Seeding fees and resident payments");

  const now = new Date();
  const june = new Date("2026-06-30");
  const july = new Date("2026-07-31");
  const august = new Date("2026-08-31");

  // Clear existing payments to prevent duplicates on re-seed
  await prisma.paymentLog.deleteMany();
  await prisma.payment.deleteMany().catch(() => {});

  // ── Fees (Cuotas) ──────────────────────────────────────────────────────────
  const fees = [
    {
      name: "Cuota de Mantenimiento",
      description: "Mantenimiento mensual de areas comunes, jardines, alberca y seguridad",
      amount: 1200.00,
      dueDate: june,
      type: FeeType.MONTHLY,
    },
    {
      name: "Cuota de Vigilancia",
      description: "Servicio de vigilancia 24/7, caseta y rondines",
      amount: 500.00,
      dueDate: june,
      type: FeeType.MONTHLY,
    },
    {
      name: "Fondo de Reserva",
      description: "Fondo para emergencias y reparaciones mayores del residencial",
      amount: 800.00,
      dueDate: june,
      type: FeeType.MONTHLY,
    },
    {
      name: "Pago de Alumbrado",
      description: "Mantenimiento y consumo de alumbrado publico en areas comunes",
      amount: 350.00,
      dueDate: june,
      type: FeeType.MONTHLY,
    },
    {
      name: "Limpieza de Cisterna",
      description: "Limpieza profunda trimestral de cisterna general del residencial",
      amount: 200.00,
      dueDate: july,
      type: FeeType.ONE_TIME,
    },
    {
      name: "Pintura de Fachada",
      description: "Cuota extraordinaria para pintura de fachadas principales del residencial",
      amount: 1500.00,
      dueDate: july,
      type: FeeType.ONE_TIME,
    },
    {
      name: "Reparacion de Porton",
      description: "Reparacion del porton electrico de acceso principal",
      amount: 950.00,
      dueDate: august,
      type: FeeType.ONE_TIME,
    },
    {
      name: "Cuota Anual de Seguro",
      description: "Seguro contra incendio y desastres naturales del residencial",
      amount: 5000.00,
      dueDate: august,
      type: FeeType.ONE_TIME,
    },
  ];

  const feeRecords: { id: string; amount: any; type: FeeType; name: string }[] = [];
  for (const f of fees) {
    const existing = await prisma.fee.findFirst({ where: { name: f.name } });
    if (existing) {
      feeRecords.push({ id: existing.id, amount: existing.amount, type: existing.type, name: existing.name });
    } else {
      const fee = await prisma.fee.create({ data: { ...f, active: true } });
      feeRecords.push({ id: fee.id, amount: fee.amount, type: fee.type, name: fee.name });
    }
  }

  const monthlyFees = feeRecords.filter((f) => f.type === FeeType.MONTHLY);
  const oneTimeFees = feeRecords.filter((f) => f.type === FeeType.ONE_TIME);

  // ── Residents ─────────────────────────────────────────────────────────────
  const residents = await prisma.resident.findMany({
    where: { active: true, deletedAt: null },
    include: { user: { select: { name: true, lastName: true } } },
  });

  if (residents.length === 0) {
    hackerLog.error("PAYMENTS", "No residents found");
    return;
  }

  hackerLog.info("PAYMENTS", `Generating payments for ${residents.length} residents`);

  // Periods for monthly fees: June, July, August 2026
  const periods = ["2026-06", "2026-07", "2026-08"];

  const statuses: PaymentStatus[] = [
    PaymentStatus.PAID,
    PaymentStatus.PAID,
    PaymentStatus.PAID,
    PaymentStatus.PENDING,
    PaymentStatus.PAID,
    PaymentStatus.PENDING,
    PaymentStatus.FAILED,
    PaymentStatus.CANCELLED,
    PaymentStatus.PAID,
    PaymentStatus.PENDING,
    PaymentStatus.PAID,
  ];

  // Paid dates: spread across June 1-15
  const paidDates = [
    new Date("2026-06-02T08:30:00"),
    new Date("2026-06-01T14:22:00"),
    new Date("2026-06-03T10:45:00"),
    new Date("2026-06-04T09:15:00"),
    new Date("2026-06-05T16:30:00"),
    new Date("2026-06-06T11:00:00"),
    new Date("2026-06-07T13:20:00"),
    new Date("2026-06-08T15:45:00"),
    new Date("2026-07-01T08:00:00"),
    new Date("2026-07-02T10:30:00"),
    new Date("2026-07-03T14:00:00"),
  ];

  let payIdx = 0;

  for (const resident of residents) {
    // Each resident gets 2-4 monthly payments across periods
    const numMonthly = 2 + (payIdx % 3); // 2, 3, or 4 monthly payments
    const feeSubset = monthlyFees.slice(0, Math.min(numMonthly, monthlyFees.length));

    for (const period of periods) {
      for (const fee of feeSubset) {
        const status = statuses[payIdx % statuses.length];

        await prisma.payment.create({
          data: {
            residentId: resident.id,
            feeId: fee.id,
            amount: fee.amount,
            period,
            reference: status === PaymentStatus.PAID
              ? `FOL-${String(payIdx + 1).padStart(4, "0")}`
              : null,
            status,
            paidAt: status === PaymentStatus.PAID
              ? paidDates[payIdx % paidDates.length]
              : null,
          },
        });

        payIdx++;
      }
    }

    // Some residents get one-time fees
    if (payIdx % 3 === 0 || payIdx % 4 === 0) {
      const otFee = oneTimeFees[payIdx % oneTimeFees.length];
      const status = payIdx % 2 === 0 ? PaymentStatus.PAID : PaymentStatus.PENDING;

      await prisma.payment.create({
        data: {
          residentId: resident.id,
          feeId: otFee.id,
          amount: otFee.amount,
          period: "2026-07",
          reference: status === PaymentStatus.PAID
            ? `FOL-${String(payIdx + 1).padStart(4, "0")}`
            : null,
          status,
          paidAt: status === PaymentStatus.PAID ? new Date("2026-07-05T09:00:00") : null,
        },
      });

      payIdx++;
    }
  }

  const feeCount = await prisma.fee.count();
  const payCount = await prisma.payment.count();
  const paidCount = await prisma.payment.count({ where: { status: PaymentStatus.PAID } });
  const pendingCount = await prisma.payment.count({ where: { status: PaymentStatus.PENDING } });
  hackerLog.success(
    "PAYMENTS",
    `${feeCount} fees | ${payCount} payments | ${paidCount} paid | ${pendingCount} pending`,
  );
};
