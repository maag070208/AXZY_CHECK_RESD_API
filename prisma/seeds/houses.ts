import { PrismaClient } from "@prisma/client";
import { hackerLog } from "./logger";

export const housesSeed = async (prisma: PrismaClient) => {
  hackerLog.info("HOUSES", "Creating residential houses");

  const houses = [
    // Calle Principal A
    { number: "101", street: "Calle Principal", block: "A", reference: "Esquina norte", latitude: 32.5149, longitude: -117.0382 },
    { number: "102", street: "Calle Principal", block: "A", reference: "Frente a jardín", latitude: 32.5150, longitude: -117.0381 },
    { number: "103", street: "Calle Principal", block: "A", latitude: 32.5151, longitude: -117.0380 },
    { number: "104", street: "Calle Principal", block: "A", latitude: 32.5152, longitude: -117.0379 },
    { number: "105", street: "Calle Principal", block: "A", latitude: 32.5153, longitude: -117.0378 },
    // Calle Principal B
    { number: "201", street: "Calle Principal", block: "B", reference: "Al lado de la cancha", latitude: 32.5154, longitude: -117.0377 },
    { number: "202", street: "Calle Principal", block: "B", latitude: 32.5155, longitude: -117.0376 },
    { number: "203", street: "Calle Principal", block: "B", latitude: 32.5156, longitude: -117.0375 },
    { number: "204", street: "Calle Principal", block: "B", latitude: 32.5157, longitude: -117.0374 },
    { number: "205", street: "Calle Principal", block: "B", latitude: 32.5158, longitude: -117.0373 },
    // Av. del Parque C
    { number: "301", street: "Av. del Parque", block: "C", reference: "Casa con portón azul", latitude: 32.5159, longitude: -117.0372 },
    { number: "302", street: "Av. del Parque", block: "C", latitude: 32.5160, longitude: -117.0371 },
    { number: "303", street: "Av. del Parque", block: "C", latitude: 32.5161, longitude: -117.0370 },
    { number: "304", street: "Av. del Parque", block: "C", latitude: 32.5162, longitude: -117.0369 },
    { number: "305", street: "Av. del Parque", block: "C", latitude: 32.5163, longitude: -117.0368 },
    // Calle Los Olivos D
    { number: "401", street: "Calle Los Olivos", block: "D", latitude: 32.5164, longitude: -117.0367 },
    { number: "402", street: "Calle Los Olivos", block: "D", latitude: 32.5165, longitude: -117.0366 },
    { number: "403", street: "Calle Los Olivos", block: "D", latitude: 32.5166, longitude: -117.0365 },
    { number: "404", street: "Calle Los Olivos", block: "D", latitude: 32.5167, longitude: -117.0364 },
    { number: "405", street: "Calle Los Olivos", block: "D", latitude: 32.5168, longitude: -117.0363 },
  ];

  for (const h of houses) {
    await prisma.house.upsert({
      where: { number_street_block: { number: h.number, street: h.street, block: h.block ?? null } },
      update: {
        latitude: h.latitude,
        longitude: h.longitude,
      },
      create: { ...h, active: true, occupied: false },
    });
  }

  hackerLog.success("HOUSES", `${houses.length} houses created`);
};
