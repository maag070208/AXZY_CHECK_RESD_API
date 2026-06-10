import { PrismaClient, FeeType } from "@prisma/client";
import { hackerLog } from "./logger";

export const feesSeed = async (prisma: PrismaClient) => {
  hackerLog.info("FEES", "Seeding cuotas para demo");

  const fees = [
    {
      name: "Cuota de Mantenimiento",
      description: "Mantenimiento mensual de areas comunes, jardines y alberca",
      amount: 1200.00,
      dueDate: new Date("2026-06-30"),
      type: FeeType.MONTHLY,
    },
    {
      name: "Cuota de Vigilancia",
      description: "Servicio de vigilancia 24/7 y rondines",
      amount: 500.00,
      dueDate: new Date("2026-06-30"),
      type: FeeType.MONTHLY,
    },
    {
      name: "Fondo de Reserva",
      description: "Fondo para emergencias y reparaciones mayores",
      amount: 800.00,
      dueDate: new Date("2026-06-30"),
      type: FeeType.MONTHLY,
    },
    {
      name: "Limpieza de Cisterna",
      description: "Limpieza profunda trimestral de cisterna general",
      amount: 200.00,
      dueDate: new Date("2026-07-15"),
      type: FeeType.ONE_TIME,
    },
    {
      name: "Pintura de Fachada",
      description: "Cuota extraordinaria para pintura de fachadas principales",
      amount: 1500.00,
      dueDate: new Date("2026-07-31"),
      type: FeeType.ONE_TIME,
    },
  ];

  for (const f of fees) {
    const existing = await prisma.fee.findFirst({ where: { name: f.name } });
    if (!existing) {
      await prisma.fee.create({ data: { ...f, active: true } });
    }
  }

  const count = await prisma.fee.count();
  hackerLog.success("FEES", `${count} cuotas activas para demo`);
};
