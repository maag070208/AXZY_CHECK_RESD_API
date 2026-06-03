import { PrismaClient } from "@prisma/client";
import { hackerLog } from "./logger";

export const housesSeed = async (prisma: PrismaClient) => {
  hackerLog.info("HOUSES", "Creating residential houses");

  const houses = [
    // Calle Principal A
    { number: "101", street: "Calle Principal", block: "A", reference: "Esquina norte" },
    { number: "102", street: "Calle Principal", block: "A", reference: "Frente a jardín" },
    { number: "103", street: "Calle Principal", block: "A" },
    { number: "104", street: "Calle Principal", block: "A" },
    { number: "105", street: "Calle Principal", block: "A" },
    // Calle Principal B
    { number: "201", street: "Calle Principal", block: "B", reference: "Al lado de la cancha" },
    { number: "202", street: "Calle Principal", block: "B" },
    { number: "203", street: "Calle Principal", block: "B" },
    { number: "204", street: "Calle Principal", block: "B" },
    { number: "205", street: "Calle Principal", block: "B" },
    // Av. del Parque C
    { number: "301", street: "Av. del Parque", block: "C", reference: "Casa con portón azul" },
    { number: "302", street: "Av. del Parque", block: "C" },
    { number: "303", street: "Av. del Parque", block: "C" },
    { number: "304", street: "Av. del Parque", block: "C" },
    { number: "305", street: "Av. del Parque", block: "C" },
    // Calle Los Olivos D
    { number: "401", street: "Calle Los Olivos", block: "D" },
    { number: "402", street: "Calle Los Olivos", block: "D" },
    { number: "403", street: "Calle Los Olivos", block: "D" },
    { number: "404", street: "Calle Los Olivos", block: "D" },
    { number: "405", street: "Calle Los Olivos", block: "D" },
  ];

  for (const h of houses) {
    await prisma.house.upsert({
      where: { number_street_block: { number: h.number, street: h.street, block: h.block ?? null } },
      update: {},
      create: { ...h, active: true, occupied: false },
    });
  }

  hackerLog.success("HOUSES", `${houses.length} houses created`);
};
