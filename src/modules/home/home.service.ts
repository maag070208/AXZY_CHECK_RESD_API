import { prismaClient as prisma } from "@src/core/config/database";
import { TResult } from "@src/core/dto/TResult";
import {
  ROUND_STATUS_IN_PROGRESS,
  INCIDENT_STATUS_PENDING,
  MAINTENANCE_STATUS_PENDING,
} from "@src/core/config/constants";
import { IDashboardStats } from "./home.dto";

export const getDashboardStats = async (
  user: any,
): Promise<TResult<IDashboardStats>> => {
  try {
    const [
      activeRounds,
      activeRoundsList,
      pendingIncidents,
      pendingMaintenance,
    ] = await Promise.all([
      prisma.round.count({
        where: { status: ROUND_STATUS_IN_PROGRESS },
      }),
      prisma.round.findMany({
        where: { status: ROUND_STATUS_IN_PROGRESS },
        include: {
          guard: { select: { name: true, lastName: true } },
        },
        orderBy: { startTime: "desc" },
        take: 5,
      }),
      prisma.incident.count({
        where: { status: INCIDENT_STATUS_PENDING },
      }),
      prisma.maintenance.count({
        where: { status: MAINTENANCE_STATUS_PENDING },
      }),
    ]);

    return {
      success: true,
      data: {
        activeRoundsCount: activeRounds,
        activeRounds: activeRoundsList as any[],
        pendingIncidentsCount: pendingIncidents,
        pendingMaintenanceCount: pendingMaintenance,
      },
      messages: [],
    };
  } catch (error: any) {
    return {
      success: false,
      data: null as unknown as IDashboardStats,
      messages: [error.message],
    };
  }
};
