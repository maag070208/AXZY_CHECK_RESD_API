import { PrismaClient } from "@prisma/client";
import { hackerLog } from "./logger";

export const vehiclesSeed = async (prisma: PrismaClient) => {
  hackerLog.info("VEHICLES", "Registering residential vehicles");

  const houses = await prisma.house.findMany({ where: { occupied: true } });
  if (houses.length === 0) { hackerLog.error("VEHICLES", "No occupied houses found"); return; }

  const makes = [
    { brand: "Toyota",    model: "Corolla",    color: "Blanco"   },
    { brand: "Nissan",    model: "Versa",      color: "Gris"     },
    { brand: "Chevrolet", model: "Aveo",       color: "Rojo"     },
    { brand: "Honda",     model: "Civic",      color: "Negro"    },
    { brand: "Volkswagen",model: "Jetta",      color: "Azul Marino" },
    { brand: "Mazda",     model: "Mazda 3",    color: "Plata"    },
    { brand: "Kia",       model: "Rio",        color: "Blanco"   },
    { brand: "Hyundai",   model: "Accent",     color: "Gris Oscuro" },
    { brand: "Toyota",    model: "Hilux",      color: "Negro"    },
    { brand: "Nissan",    model: "NP300",      color: "Blanco"   },
    { brand: "Suzuki",    model: "Swift",      color: "Rojo"     },
    { brand: "Ford",      model: "Ranger",     color: "Gris"     },
    { brand: "Chevrolet", model: "Silverado",  color: "Blanco"   },
    { brand: "Mitsubishi",model: "L200",       color: "Verde"    },
    { brand: "Jeep",      model: "Cherokee",   color: "Negro"    },
  ];

  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  for (let i = 0; i < houses.length; i++) {
    const house = houses[i];
    const numVehicles = (i % 3 === 0) ? 2 : 1;

    for (let v = 0; v < numVehicles; v++) {
      const make = makes[(i + v) % makes.length];
      const l1 = letters[Math.floor(Math.random() * 26)];
      const l2 = letters[Math.floor(Math.random() * 26)];
      const l3 = letters[Math.floor(Math.random() * 26)];
      const nums = String(100 + Math.floor(Math.random() * 900));
      const state = Math.random() > 0.5 ? "BC" : "SON";
      const plate = `${l1}${l2}${l3}-${nums}-${state}`;

      await prisma.vehicle.create({
        data: {
          houseId: house.id,
          plate,
          brand: make.brand,
          model: make.model,
          color: make.color,
          active: true,
        },
      }).catch(() => {
        // plate collision, skip
      });
    }
  }

  const count = await prisma.vehicle.count();
  hackerLog.success("VEHICLES", `${count} vehicles registered`);
};
