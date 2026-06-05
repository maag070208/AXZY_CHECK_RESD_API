import { PrismaClient } from "@prisma/client";
import { hackerLog } from "./logger";
import bcrypt from "bcryptjs";

export const residentsSeed = async (prisma: PrismaClient) => {
  hackerLog.info("RESIDENTS", "Creating resident users and linking to houses");

  const resdnRole = await prisma.role.findUnique({ where: { name: "RESDN" } });
  if (!resdnRole) {
    hackerLog.error("RESIDENTS", "RESDN role not found");
    return;
  }

  const residentUsersData = [
    {
      username: "juan.garcia",
      name: "Juan Carlos",
      lastName: "García Hernández",
    },
    {
      username: "maria.lopez",
      name: "María Elena",
      lastName: "López Rodríguez",
    },
    {
      username: "pedro.martinez",
      name: "Pedro Antonio",
      lastName: "Martínez Morales",
    },
    { username: "ana.torres", name: "Ana Sofía", lastName: "Torres Jiménez" },
    {
      username: "carlos.reyes",
      name: "Carlos Alberto",
      lastName: "Reyes Mendoza",
    },
    {
      username: "lucia.flores",
      name: "Lucía Fernanda",
      lastName: "Flores Vázquez",
    },
    { username: "roberto.ruiz", name: "Roberto", lastName: "Ruiz Delgado" },
    {
      username: "patricia.jimenez",
      name: "Patricia",
      lastName: "Jiménez Cruz",
    },
    {
      username: "miguel.sanchez",
      name: "Miguel Ángel",
      lastName: "Sánchez Ríos",
    },
    { username: "elena.morales", name: "Elena", lastName: "Morales Aguilar" },
    { username: "oscar.medina", name: "Óscar", lastName: "Medina Paredes" },
    { username: "rosa.vega", name: "Rosa María", lastName: "Vega Contreras" },
    { username: "andres.castro", name: "Andrés", lastName: "Castro Núñez" },
    { username: "laura.vargas", name: "Laura", lastName: "Vargas Salazar" },
    {
      username: "fernando.romero",
      name: "Fernando",
      lastName: "Romero Guerrero",
    },
    { username: "gabriela.luna", name: "Gabriela", lastName: "Luna Espinoza" },
    { username: "hugo.perez", name: "Hugo", lastName: "Pérez Castillo" },
    { username: "diana.chavez", name: "Diana", lastName: "Chávez Blanco" },
    { username: "raul.gutierrez", name: "Raúl", lastName: "Gutiérrez Soto" },
    {
      username: "carmen.ortiz",
      name: "María del Carmen",
      lastName: "Ortiz Domínguez",
    },
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

  const houses = await prisma.house.findMany({ orderBy: { number: "asc" } });

  if (houses.length === 0) {
    hackerLog.error("RESIDENTS", "No houses found, run housesSeed first");
    return;
  }
  if (residentUsers.length === 0) {
    hackerLog.error("RESIDENTS", "No resident users found");
    return;
  }

  const contactTemplates = [
    { name: "Esposo(a)", relationship: "Familiar", canGenerateAccess: true },
    { name: "Hijo(a)", relationship: "Familiar", canGenerateAccess: false },
    {
      name: "Empleada doméstica",
      relationship: "Empleado",
      canGenerateAccess: true,
    },
    { name: "Hermano(a)", relationship: "Familiar", canGenerateAccess: true },
    { name: "Niñera", relationship: "Empleado", canGenerateAccess: true },
  ];

  let houseIdx = 0;

  for (let i = 0; i < residentUsers.length; i++) {
    const user = residentUsers[i];
    const house = houses[houseIdx % houses.length];

    const existing = await prisma.resident.findFirst({
      where: { userId: user.id, houseId: house.id },
    });

    if (!existing) {
      const resident = await prisma.resident.create({
        data: {
          userId: user.id,
          houseId: house.id,
          phone: `664${String(1000000 + i * 37).slice(1)}`,
          email: `maag070208@gmail.com`,
          isOwner: i % 2 === 0,
          active: true,
        },
      });

      await prisma.house.update({
        where: { id: house.id },
        data: { occupied: true },
      });

      const numContacts = (i % 2) + 1;
      for (let c = 0; c < numContacts; c++) {
        const contact = contactTemplates[(i + c) % contactTemplates.length];
        await prisma.residentContact.create({
          data: {
            residentId: resident.id,
            name: `${contact.name} de ${user.name.split(" ")[0]}`,
            phone: `664${String(2000000 + i * 10 + c * 7).slice(1)}`,
            email: null,
            relationship: contact.relationship,
            canGenerateAccess: contact.canGenerateAccess,
            active: true,
          },
        });
      }
    }

    if (i % 3 !== 0) houseIdx++;
  }

  hackerLog.success("RESIDENTS", `${residentUsers.length} residents linked`);
};
