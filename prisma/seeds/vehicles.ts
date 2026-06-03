import { PrismaClient } from "@prisma/client";
import { hackerLog } from "./logger";

export const vehiclesSeed = async (prisma: PrismaClient) => {
  hackerLog.info("VEHICLES", "Registering residential vehicles");

  const houses = await prisma.house.findMany({ where: { occupied: true } });
  if (houses.length === 0) { hackerLog.error("VEHICLES", "No occupied houses found"); return; }

  const makes = [
    { brand: "Toyota",    model: "Corolla",   color: "Blanco"  },
    { brand: "Nissan",    model: "Versa",     color: "Plata"   },
    { brand: "Chevrolet", model: "Aveo",      color: "Rojo"    },
    { brand: "Honda",     model: "Civic",     color: "Negro"   },
    { brand: "Volkswagen",model: "Jetta",     color: "Gris"    },
    { brand: "Ford",      model: "Fusion",    color: "Azul"    },
    { brand: "Hyundai",   model: "Tucson",    color: "Blanco"  },
    { brand: "Kia",       model: "Sportage",  color: "Plata"   },
    { brand: "Toyota",    model: "Hilux",     color: "Negro"   },
    { brand: "Nissan",    model: "X-Trail",   color: "Gris"    },
  ];

  let plateNum = 1000;

  for (let i = 0; i < houses.length; i++) {
    const house = houses[i];
    const numVehicles = (i % 3 === 0) ? 2 : 1; // some houses have 2

    for (let v = 0; v < numVehicles; v++) {
      const make = makes[(i + v) % makes.length];
      const plate = `ABC${String(plateNum++).padStart(4, "0")}`;

      const existing = await prisma.vehicle.findUnique({ where: { plate } });
      if (!existing) {
        await prisma.vehicle.create({
          data: {
            houseId: house.id,
            plate,
            brand: make.brand,
            model: make.model,
            color: make.color,
            active: true,
          },
        });
      }
    }
  }

  const count = await prisma.vehicle.count();
  hackerLog.success("VEHICLES", `${count} vehicles registered`);
};
