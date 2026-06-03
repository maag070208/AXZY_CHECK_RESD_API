import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { hackerLog } from "./logger";

export const securitySeed = async (prisma: PrismaClient) => {
  const password = await bcrypt.hash("123456", 10);
  hackerLog.info("SECURITY", "Initializing Security Layer");

  const adminRole = await prisma.role.findUnique({ where: { name: "ADMIN" } });
  const guardRole = await prisma.role.findUnique({ where: { name: "GUARD" } });
  const shiftRole = await prisma.role.findUnique({ where: { name: "SHIFT" } });
  const maintRole = await prisma.role.findUnique({ where: { name: "MAINT" } });
  const resdnRole = await prisma.role.findUnique({ where: { name: "RESDN" } });

  if (!adminRole || !guardRole || !shiftRole || !maintRole || !resdnRole) {
    hackerLog.error("SECURITY", "Roles not found, run catalogs seed first");
    return;
  }

  const matutino  = await prisma.schedule.findUnique({ where: { name: "Matutino" } });
  const vespertino = await prisma.schedule.findUnique({ where: { name: "Vespertino" } });
  const nocturno  = await prisma.schedule.findUnique({ where: { name: "Nocturno" } });
  const admin_sched = await prisma.schedule.findUnique({ where: { name: "Administracion" } });

  // ── ADMINS ──────────────────────────────────────────────────────────────
  hackerLog.info("AUTH", "Deploying Admin accounts");
  for (const u of [
    { username: "admin",  name: "Admin",   lastName: "Principal" },
    { username: "isabel", name: "Isabel",  lastName: "Ramirez"   },
    { username: "sofia",  name: "Sofia",   lastName: "Torres"    },
  ]) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: { roleId: adminRole.id, scheduleId: admin_sched?.id ?? null },
      create: { ...u, password, roleId: adminRole.id, scheduleId: admin_sched?.id ?? null },
    });
  }

  // ── GUARDS ───────────────────────────────────────────────────────────────
  hackerLog.info("AUTH", "Deploying Guard infrastructure");
  const guardUsers = [
    { username: "victor",  name: "Victor",  lastName: "Hernandez",  scheduleId: matutino?.id  },
    { username: "martin",  name: "Martin",  lastName: "Lopez",       scheduleId: matutino?.id  },
    { username: "marco",   name: "Marco",   lastName: "Solis",       scheduleId: vespertino?.id },
    { username: "asael",   name: "Asael",   lastName: "Morales",     scheduleId: nocturno?.id  },
    { username: "carlos",  name: "Carlos",  lastName: "Ruiz",        scheduleId: vespertino?.id },
    { username: "ernesto", name: "Ernesto", lastName: "Vega",        scheduleId: nocturno?.id  },
  ];

  for (const u of guardUsers) {
    const user = await prisma.user.upsert({
      where: { username: u.username },
      update: { scheduleId: u.scheduleId, roleId: guardRole.id },
      create: { ...u, password, roleId: guardRole.id },
    });
    await prisma.assignmentLog.create({
      data: { guardId: user.id, type: "ASIGNADO", notes: "Inicializado por seed" },
    });
  }

  // ── SHIFT CHIEFS ─────────────────────────────────────────────────────────
  hackerLog.info("AUTH", "Deploying Shift Chiefs");
  for (const u of [
    { username: "ricardo",  name: "Ricardo",  lastName: "Mendoza",  scheduleId: vespertino?.id },
    { username: "gonzalo",  name: "Gonzalo",  lastName: "Fuentes",  scheduleId: matutino?.id  },
  ]) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: { scheduleId: u.scheduleId, roleId: shiftRole.id },
      create: { ...u, password, roleId: shiftRole.id },
    });
  }

  // ── MAINTENANCE ───────────────────────────────────────────────────────────
  hackerLog.info("AUTH", "Deploying Maintenance personnel");
  for (const u of [
    { username: "mario",    name: "Mario",    lastName: "Garcia"   },
    { username: "jesus",    name: "Jesus",    lastName: "Pacheco"  },
  ]) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: { roleId: maintRole.id },
      create: { ...u, password, roleId: maintRole.id },
    });
  }

  // ── RESIDENT USERS (RESDN) ────────────────────────────────────────────────
  hackerLog.info("AUTH", "Deploying Resident user accounts");
  const residentUsers = [
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

  for (const u of residentUsers) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: { roleId: resdnRole.id },
      create: { ...u, password, roleId: resdnRole.id },
    });
  }

  hackerLog.success("SECURITY", "Security layer deployed");
};
