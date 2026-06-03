import { PrismaClient } from "@prisma/client";
import { hackerLog } from "./logger";

export const residentsSeed = async (prisma: PrismaClient) => {
  hackerLog.info("RESIDENTS", "Linking resident users to houses");

  const resdnRole = await prisma.role.findUnique({ where: { name: "RESDN" } });
  if (!resdnRole) { hackerLog.error("RESIDENTS", "RESDN role not found"); return; }

  // Get all resident users
  const residentUsers = await prisma.user.findMany({
    where: { roleId: resdnRole.id },
    orderBy: { username: "asc" },
  });

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
