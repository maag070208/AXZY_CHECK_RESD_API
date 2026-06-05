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
    { username: "admin",     name: "Alejandro", lastName: "Mendoza López"      },
    { username: "isabel",    name: "Isabel",    lastName: "Ramírez García"      },
    { username: "sofia",     name: "Sofía",     lastName: "Torres Navarro"      },
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
    { username: "victor",  name: "Víctor",     lastName: "Hernández Cruz",     scheduleId: matutino?.id  },
    { username: "martin",  name: "Martín",     lastName: "López García",       scheduleId: matutino?.id  },
    { username: "marco",   name: "Marco",      lastName: "Solis Aguilar",      scheduleId: vespertino?.id },
    { username: "asael",   name: "Asael",      lastName: "Morales Rivera",     scheduleId: nocturno?.id  },
    { username: "carlos",  name: "Carlos",     lastName: "Ruiz Fernández",     scheduleId: vespertino?.id },
    { username: "ernesto", name: "Ernesto",    lastName: "Vega Pacheco",       scheduleId: nocturno?.id  },
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
    { username: "ricardo",  name: "Ricardo",  lastName: "Mendoza Ríos",      scheduleId: vespertino?.id },
    { username: "gonzalo",  name: "Gonzalo",  lastName: "Fuentes Silva",     scheduleId: matutino?.id  },
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
    { username: "mario",    name: "Mario",    lastName: "García Sandoval"    },
    { username: "jesus",    name: "Jesús",    lastName: "Pacheco Hernández"  },
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
    { username: "juan.garcia",    name: "Juan Carlos",    lastName: "García Hernández"    },
    { username: "maria.lopez",    name: "María Elena",    lastName: "López Rodríguez"      },
    { username: "pedro.martinez", name: "Pedro Antonio",  lastName: "Martínez Morales"     },
    { username: "ana.torres",     name: "Ana Sofía",      lastName: "Torres Jiménez"       },
    { username: "carlos.reyes",   name: "Carlos Alberto", lastName: "Reyes Mendoza"        },
    { username: "lucia.flores",   name: "Lucía Fernanda", lastName: "Flores Vázquez"       },
    { username: "roberto.ruiz",   name: "Roberto",        lastName: "Ruiz Delgado"         },
    { username: "patricia.jimenez", name: "Patricia",     lastName: "Jiménez Cruz"         },
    { username: "miguel.sanchez",  name: "Miguel Ángel",  lastName: "Sánchez Ríos"         },
    { username: "elena.morales",   name: "Elena",         lastName: "Morales Aguilar"      },
    { username: "oscar.medina",    name: "Óscar",         lastName: "Medina Paredes"       },
    { username: "rosa.vega",       name: "Rosa María",    lastName: "Vega Contreras"       },
    { username: "andres.castro",   name: "Andrés",        lastName: "Castro Núñez"         },
    { username: "laura.vargas",    name: "Laura",         lastName: "Vargas Salazar"       },
    { username: "fernando.romero", name: "Fernando",      lastName: "Romero Guerrero"      },
    { username: "gabriela.luna",   name: "Gabriela",      lastName: "Luna Espinoza"        },
    { username: "hugo.perez",      name: "Hugo",          lastName: "Pérez Castillo"       },
    { username: "diana.chavez",    name: "Diana",         lastName: "Chávez Blanco"        },
    { username: "raul.gutierrez",  name: "Raúl",          lastName: "Gutiérrez Soto"       },
    { username: "carmen.ortiz",    name: "María del Carmen", lastName: "Ortiz Domínguez"   },
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
