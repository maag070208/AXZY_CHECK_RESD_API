import { PrismaClient } from "@prisma/client";
import { hackerLog } from "./logger";
import bcrypt from "bcryptjs";

export const residentsSeed = async (prisma: PrismaClient) => {
  hackerLog.info("RESIDENTS", "Creating resident users and linking to houses");

  const resdnRole = await prisma.role.findUnique({ where: { name: "RESDN" } });
  if (!resdnRole) { hackerLog.error("RESIDENTS", "RESDN role not found"); return; }

  const residentUsersData = [
    { username: "juan.garcia",    name: "Juan",    lastName: "Garcia"    },
    { username: "maria.lopez",    name: "Maria",   lastName: "Lopez"     },
    { username: "pedro.martinez", name: "Pedro",   lastName: "Martinez"  },
    { username: "ana.torres",     name: "Ana",     lastName: "Torres"    },
    { username: "carlos.reyes",   name: "Carlos",  lastName: "Reyes"     },
    { username: "lucia.flores",   name: "Lucia",   lastName: "Flores"    },
    { username: "roberto.ruiz",   name: "Roberto", lastName: "Ruiz"      },
    { username: "patricia.jimenez", name: "Patricia", lastName: "Jimenez" },
    { username: "miguel.sanchez",  name: "Miguel",  lastName: "Sanchez"  },
    { username: "elena.morales",   name: "Elena",   lastName: "Morales"  },
    { username: "oscar.medina",    name: "Oscar",   lastName: "Medina"   },
    { username: "rosa.vega",       name: "Rosa",    lastName: "Vega"     },
    { username: "andres.castro",   name: "Andres",  lastName: "Castro"   },
    { username: "laura.vargas",    name: "Laura",   lastName: "Vargas"   },
    { username: "fernando.romero", name: "Fernando", lastName: "Romero"  },
    { username: "gabriela.luna",   name: "Gabriela", lastName: "Luna"    },
    { username: "hugo.perez",      name: "Hugo",    lastName: "Perez"    },
    { username: "diana.chavez",    name: "Diana",   lastName: "Chavez"   },
    { username: "raul.gutierrez",  name: "Raul",    lastName: "Gutierrez" },
    { username: "carmen.ortiz",    name: "Carmen",  lastName: "Ortiz"    },
  ];

  const password = await bcrypt.hash("123456", 10);
  const residentUsers = [];

  for (const u of residentUsersData) {
    const user = await prisma.user.upsert({
      where: { username: u.username },
      update: { roleId: resdnRole.id },
      create: { ...u, password, roleId: resdnRole.id },
    });
    residentUsers.push(user);
  }

  // Get all houses
  const houses = await prisma.house.findMany({ orderBy: { number: "asc" } });

  if (houses.length === 0) { hackerLog.error("RESIDENTS", "No houses found, run housesSeed first"); return; }
  if (residentUsers.length === 0) { hackerLog.error("RESIDENTS", "No resident users found"); return; }

  const contactData = [
    { name: "Madre", relationship: "Familiar", canGenerateAccess: true },
    { name: "Hermano", relationship: "Familiar", canGenerateAccess: false },
    { name: "Empleada doméstica", relationship: "Empleado", canGenerateAccess: true },
  ];

  let houseIdx = 0;

  for (let i = 0; i < residentUsers.length; i++) {
    const user = residentUsers[i];
    const house = houses[houseIdx % houses.length];

    // Check if resident already exists
    const existing = await prisma.resident.findFirst({
      where: { userId: user.id, houseId: house.id },
    });

    if (!existing) {
      const resident = await prisma.resident.create({
        data: {
          userId: user.id,
          houseId: house.id,
          phone: `664${String(1000000 + i).slice(1)}`,
          email: `${user.username}@residencial.com`,
          isOwner: i % 2 === 0, // alternating owners
          active: true,
        },
      });

      // Mark house occupied
      await prisma.house.update({ where: { id: house.id }, data: { occupied: true } });

      // Add 1-2 contacts per resident
      const numContacts = (i % 2) + 1;
      for (let c = 0; c < numContacts; c++) {
        const contact = contactData[c % contactData.length];
        await prisma.residentContact.create({
          data: {
            residentId: resident.id,
            name: `${contact.name} de ${user.name}`,
            phone: `664${String(2000000 + i * 10 + c).slice(1)}`,
            email: null,
            relationship: contact.relationship,
            canGenerateAccess: contact.canGenerateAccess,
            active: true,
          },
        });
      }
    }

    // Move to next house every 1 resident (1:1) - some houses have multiple
    if (i % 3 !== 0) houseIdx++;
  }

  hackerLog.success("RESIDENTS", `${residentUsers.length} residents linked`);
};
