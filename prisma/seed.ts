import { PrismaClient } from "@prisma/client";
import { catalogsSeed }         from "./seeds/catalogs";
import { incidentCatalogsSeed } from "./seeds/incidents";
import { maintenanceCatalogsSeed } from "./seeds/maintenance";
import { schedulesSeed }        from "./seeds/schedules";
import { securitySeed }         from "./seeds/security";
import { locationsSeed }        from "./seeds/locations";
import { housesSeed }           from "./seeds/houses";
import { residentsSeed }        from "./seeds/residents";
import { vehiclesSeed }         from "./seeds/vehicles";
import { visitorsSeed }         from "./seeds/visitors";
import { accessLogsSeed }       from "./seeds/access-logs";
import { feesSeed }            from "./seeds/fees";
import { complaintsSeed }       from "./seeds/complaints";
import { notificationsSeed }    from "./seeds/notifications";
import { sysConfigSeed }        from "./seeds/sysconfig";
import { hackerLog }            from "./seeds/logger";

const prisma = new PrismaClient();

async function main() {
  hackerLog.ascii();
  hackerLog.header("AXZY CHECK - Master Seeding Sequence v2");

  // ── Foundation ────────────────────────────────────────────────────────────
  hackerLog.header("Phase 1: Foundation");
  await catalogsSeed(prisma);           // roles
  await schedulesSeed(prisma);          // turnos
  await incidentCatalogsSeed(prisma);   // cat. incidentes
  await maintenanceCatalogsSeed(prisma);// cat. mantenimiento
  await sysConfigSeed(prisma);          // sys config

  // ── Users ─────────────────────────────────────────────────────────────────
  hackerLog.header("Phase 2: Users");
  await securitySeed(prisma);           // admins, guardias, residents users

  // ── Locations ─────────────────────────────────────────────────────────────
  await locationsSeed(prisma);

  // ── Property ──────────────────────────────────────────────────────────────
  hackerLog.header("Phase 3: Property");
  await housesSeed(prisma);             // 20 casas
  await residentsSeed(prisma);          // vincular usuarios RESDN a casas
  await vehiclesSeed(prisma);           // vehículos por casa

  // ── Access Control ────────────────────────────────────────────────────────
  hackerLog.header("Phase 4: Access Control");
  await visitorsSeed(prisma);           // visitantes + accesos QR
  await accessLogsSeed(prisma);         // registros de entrada/salida

  // ── Community ─────────────────────────────────────────────────────────────
  hackerLog.header("Phase 5: Community & Finance");
  await feesSeed(prisma);              // cuotas para demo (sin pagos)
  await complaintsSeed(prisma);        // categorías + quejas
  await notificationsSeed(prisma);      // notificaciones

  hackerLog.divider();
  hackerLog.success("SYSTEM", "Master Seeding Complete — All modules populated");
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
