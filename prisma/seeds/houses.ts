import { PrismaClient } from "@prisma/client";
import { hackerLog } from "./logger";

export const housesSeed = async (prisma: PrismaClient) => {
  hackerLog.info("HOUSES", "Creating residential houses");

  const houses = [
    // Paseo del Bosque — Bloque A
    { number: "1", street: "Paseo del Bosque", block: "A", reference: "Esquina con Av. Central", latitude: 32.5149, longitude: -117.0382 },
    { number: "3", street: "Paseo del Bosque", block: "A", reference: "Casa con jardín frontal", latitude: 32.5150, longitude: -117.0381 },
    { number: "5", street: "Paseo del Bosque", block: "A", reference: "Portón blanco", latitude: 32.5151, longitude: -117.0380 },
    { number: "7", street: "Paseo del Bosque", block: "A", latitude: 32.5152, longitude: -117.0379 },
    { number: "9", street: "Paseo del Bosque", block: "A", latitude: 32.5153, longitude: -117.0378 },
    // Paseo del Bosque — Bloque B
    { number: "11", street: "Paseo del Bosque", block: "B", reference: "Al lado del parque", latitude: 32.5154, longitude: -117.0377 },
    { number: "13", street: "Paseo del Bosque", block: "B", latitude: 32.5155, longitude: -117.0376 },
    { number: "15", street: "Paseo del Bosque", block: "B", latitude: 32.5156, longitude: -117.0375 },
    { number: "17", street: "Paseo del Bosque", block: "B", latitude: 32.5157, longitude: -117.0374 },
    { number: "19", street: "Paseo del Bosque", block: "B", latitude: 32.5158, longitude: -117.0373 },
    // Privada de las Flores — Bloque C
    { number: "102", street: "Privada de las Flores", block: "C", reference: "Casa con bugambilias", latitude: 32.5159, longitude: -117.0372 },
    { number: "104", street: "Privada de las Flores", block: "C", latitude: 32.5160, longitude: -117.0371 },
    { number: "106", street: "Privada de las Flores", block: "C", latitude: 32.5161, longitude: -117.0370 },
    { number: "108", street: "Privada de las Flores", block: "C", latitude: 32.5162, longitude: -117.0369 },
    { number: "110", street: "Privada de las Flores", block: "C", latitude: 32.5163, longitude: -117.0368 },
    // Calle Los Olivos — Bloque D
    { number: "201", street: "Calle Los Olivos", block: "D", reference: "Frente al área de asadores", latitude: 32.5164, longitude: -117.0367 },
    { number: "203", street: "Calle Los Olivos", block: "D", latitude: 32.5165, longitude: -117.0366 },
    { number: "205", street: "Calle Los Olivos", block: "D", latitude: 32.5166, longitude: -117.0365 },
    { number: "207", street: "Calle Los Olivos", block: "D", latitude: 32.5167, longitude: -117.0364 },
    { number: "209", street: "Calle Los Olivos", block: "D", latitude: 32.5168, longitude: -117.0363 },
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
