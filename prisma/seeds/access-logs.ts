import { PrismaClient } from "@prisma/client";
import { hackerLog } from "./logger";

export const accessLogsSeed = async (prisma: PrismaClient) => {
  hackerLog.info("ACCESSLOGS", "Creating access log entries");

  // Get accesses that are marked as used
  const usedAccesses = await prisma.access.findMany({
    where: { used: true, deletedAt: null },
  });

  // Get a guard user
  const guards = await prisma.user.findMany({
    where: { role: { name: "GUARD" } },
    take: 3,
  });

  if (guards.length === 0 || usedAccesses.length === 0) {
    hackerLog.error("ACCESSLOGS", "No guards or used accesses found");
    return;
  }

  const now = new Date();
  let count = 0;

  for (let i = 0; i < usedAccesses.length; i++) {
    const access = usedAccesses[i];
    const guard = guards[i % guards.length];

    const entryTime = new Date(now.getTime() - (i + 1) * 2 * 60 * 60 * 1000); // hours ago
    const exitTime = new Date(entryTime.getTime() + 60 * 60 * 1000); // 1hr after entry

    await prisma.accessLog.create({
      data: {
        accessId: access.id,
        guardId: guard.id,
        entryTime,
        exitTime,
        notes: i % 3 === 0 ? "Acceso sin novedad" : null,
      },
    });
    count++;
  }

  hackerLog.success("ACCESSLOGS", `${count} access log entries created`);
};
