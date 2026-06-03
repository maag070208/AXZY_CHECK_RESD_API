import { PrismaClient, AccessType } from "@prisma/client";
import { randomUUID } from "crypto";
import { hackerLog } from "./logger";

const names = [
  "Carlos Mendez", "Ana Gutierrez", "Luis Paredes", "Sofia Ibarra",
  "Jorge Castillo", "Valeria Cruz", "Ricardo Fuentes", "Natalia Rios",
  "Eduardo Soto", "Claudia Navarro", "Felipe Aguilar", "Mariana Delgado",
  "Ivan Lozano", "Karla Ponce", "Daniel Rojas", "Patricia Serrano",
  "Alejandro Dominguez", "Beatriz Herrera", "Oscar Rangel", "Silvia Miranda",
];

export const visitorsSeed = async (prisma: PrismaClient) => {
  hackerLog.info("VISITORS", "Registering visitors and accesses");

  // Create visitors
  for (let i = 0; i < names.length; i++) {
    const [firstName, lastName] = names[i].split(" ");
    const existing = await prisma.visitor.findFirst({ where: { name: names[i], deletedAt: null } });
    if (!existing) {
      await prisma.visitor.create({
        data: {
          name: names[i],
          phone: `664${String(3000000 + i).slice(1)}`,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@mail.com`,
          notes: i % 4 === 0 ? "Visitante frecuente" : null,
        },
      });
    }
  }

  // Create accesses: pair each visitor with a random resident
  const residents = await prisma.resident.findMany({ where: { active: true, deletedAt: null } });
  const visitors = await prisma.visitor.findMany({ where: { deletedAt: null } });

  if (residents.length === 0 || visitors.length === 0) {
    hackerLog.error("VISITORS", "No residents or visitors found");
    return;
  }

  const now = new Date();
  const accessTypes: AccessType[] = ["TEMPORARY", "DELIVERY", "SERVICE", "RECURRING"];

  for (let i = 0; i < visitors.length; i++) {
    const visitor = visitors[i];
    const resident = residents[i % residents.length];
    const type = accessTypes[i % accessTypes.length];

    const validFrom = new Date(now.getTime() - i * 24 * 60 * 60 * 1000); // staggered start
    const validUntil = new Date(validFrom.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days

    const existing = await prisma.access.findFirst({
      where: { residentId: resident.id, visitorId: visitor.id },
    });

    if (!existing) {
      await prisma.access.create({
        data: {
          residentId: resident.id,
          visitorId: visitor.id,
          type,
          qrCode: randomUUID(),
          validFrom,
          validUntil,
          used: i % 5 === 0, // some already used
        },
      });
    }
  }

  const vCount = await prisma.visitor.count();
  const aCount = await prisma.access.count();
  hackerLog.success("VISITORS", `${vCount} visitors, ${aCount} accesses created`);
};
