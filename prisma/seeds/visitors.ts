import { PrismaClient, AccessType } from "@prisma/client";
import { randomUUID } from "crypto";
import { hackerLog } from "./logger";

const visitors = [
  { name: "Carlos Méndez Pérez", phone: "6641234567", notes: "Familiar de casa 3" },
  { name: "Ana Gutiérrez Sánchez", phone: "6642345678", notes: "Reparaciones eléctricas" },
  { name: "Luis Paredes Medina", phone: "6643456789", notes: null },
  { name: "Sofía Ibarra Castillo", phone: "6644567890", notes: "Visitante frecuente" },
  { name: "Jorge Castillo Rojas", phone: "6645678901", notes: "Servicio de jardinería" },
  { name: "Valeria Cruz Vega", phone: "6646789012", notes: "Familiar" },
  { name: "Ricardo Fuentes León", phone: "6647890123", notes: null },
  { name: "Natalia Ríos Ponce", phone: "6648901234", notes: "Reparto de paquetería" },
  { name: "Eduardo Soto Molina", phone: "6649012345", notes: null },
  { name: "Claudia Navarro Díaz", phone: "6631234567", notes: "Limpieza profunda" },
  { name: "Felipe Aguilar Rangel", phone: "6632345678", notes: "Visitante frecuente" },
  { name: "Mariana Delgado Campos", phone: "6633456789", notes: null },
  { name: "Iván Lozano Salas", phone: "6634567890", notes: "Servicio de plomería" },
  { name: "Karla Ponce Flores", phone: "6635678901", notes: "Familiar" },
  { name: "Daniel Rojas Navarro", phone: "6636789012", notes: null },
  { name: "Patricia Serrano García", phone: "6637890123", notes: "Entrega de muebles" },
  { name: "Alejandro Domínguez Ortiz", phone: "6638901234", notes: "Visitante frecuente" },
  { name: "Beatriz Herrera Ríos", phone: "6639012345", notes: null },
  { name: "Óscar Rangel Mendoza", phone: "6621234567", notes: "Servicio técnico" },
  { name: "Silvia Miranda Pacheco", phone: "6622345678", notes: null },
];

export const visitorsSeed = async (prisma: PrismaClient) => {
  hackerLog.info("VISITORS", "Registering visitors and accesses");

  for (const v of visitors) {
    const existing = await prisma.visitor.findFirst({ where: { name: v.name, deletedAt: null } });
    if (!existing) {
      await prisma.visitor.create({
        data: {
          name: v.name,
          phone: v.phone,
          email: `${v.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9.]/g, ".").replace(/\.+/g, ".").replace(/^\.|\.$/g, "")}@gmail.com`,
          notes: v.notes,
        },
      });
    }
  }

  const residents = await prisma.resident.findMany({ where: { active: true, deletedAt: null } });
  const allVisitors = await prisma.visitor.findMany({ where: { deletedAt: null } });

  if (residents.length === 0 || allVisitors.length === 0) {
    hackerLog.error("VISITORS", "No residents or visitors found");
    return;
  }

  const now = new Date();
  const accessTypes: AccessType[] = ["TEMPORARY", "DELIVERY", "SERVICE", "RECURRING"];

  for (let i = 0; i < allVisitors.length; i++) {
    const visitor = allVisitors[i];
    const resident = residents[i % residents.length];
    const type = accessTypes[i % accessTypes.length];

    const validFrom = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const validUntil = new Date(validFrom.getTime() + 3 * 24 * 60 * 60 * 1000);

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
          used: i % 5 === 0,
        },
      });
    }
  }

  const vCount = await prisma.visitor.count();
  const aCount = await prisma.access.count();
  hackerLog.success("VISITORS", `${vCount} visitors, ${aCount} accesses created`);
};
