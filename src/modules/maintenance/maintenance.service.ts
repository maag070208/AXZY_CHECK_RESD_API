import { prismaClient } from "@src/core/config/database";
import {
  ITDataTableFetchParams,
  ITDataTableResponse,
} from "@src/core/dto/datatable.dto";
import { getPrismaPaginationParams } from "@src/core/utils/prisma-pagination.utils";
import {
  MAINTENANCE_STATUS_ATTENDED,
  MAINTENANCE_STATUS_PENDING,
} from "@src/core/config/constants";

import { IMaintenanceResponse } from "./maintenance.response";

export const getDataTableMaintenances = async (
  params: ITDataTableFetchParams,
): Promise<ITDataTableResponse<IMaintenanceResponse>> => {
  const prismaParams = getPrismaPaginationParams(params);
  
  // Handle combined search
  const searchVal = String(params.filters.search || "").trim();
  if (searchVal.length > 0) {
    delete prismaParams.where.search; // Remove generic search added by util
    prismaParams.where.OR = [
      { title: { contains: searchVal, mode: "insensitive" } },
      { description: { contains: searchVal, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    prismaClient.maintenance.findMany({
      ...prismaParams,
      select: {
        id: true,
        guardId: true,
        title: true,
        categoryId: true,
        typeId: true,
        category: true,
        description: true,
        media: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        resolvedAt: true,
        resolvedById: true,
        status: true,
        guard: { select: { id: true, name: true, lastName: true, username: true } },
        resolvedBy: { select: { id: true, name: true, lastName: true } },
        categoryRel: { select: { id: true, name: true } },
        type: { select: { id: true, name: true } },
      },
      orderBy: prismaParams.orderBy || { createdAt: "desc" },
    }),
    prismaClient.maintenance.count({
      where: prismaParams.where,
    }),
  ]);

  return { rows: rows as IMaintenanceResponse[], total };
};

import {
  sendMaintenanceEmail,
  sendMaintenanceWhatsApp,
} from "@src/core/utils/emailSender";
import { logger } from "@src/core/utils/logger";
import { now } from "@src/core/utils/date-time.utils";

export const createMaintenance = async (data: {
  guardId: string;
  title: string;
  categoryId?: string;
  typeId?: string;
  category?: string;
  description?: string;
  media?: any;
  latitude?: number;
  longitude?: number;
}) => {
  const maintenance = await prismaClient.maintenance.create({
    data: {
      guardId: data.guardId,
      title: data.title,
      categoryId: data.categoryId,
      typeId: data.typeId,
      category: data.category,
      description: data.description,
      media: data.media,
      latitude: data.latitude,
      longitude: data.longitude,
    },
  });

  setImmediate(async () => {
    try {
      const enrichedMaintenance = await prismaClient.maintenance.findUnique({
        where: { id: maintenance.id },
        include: {
          guard: true,
          categoryRel: true,
          type: true,
        },
      });
      if (enrichedMaintenance) {
        await sendMaintenanceEmail(
          enrichedMaintenance,
          enrichedMaintenance.guard,
        );
        await sendMaintenanceWhatsApp(
          enrichedMaintenance,
          enrichedMaintenance.guard,
        );
      }
    } catch (error) {
      logger.error("Background maintenance processing error:", error);
    }
  });

  return maintenance;
};

export const getMaintenancesByGuard = async (guardId: string) => {
  return prismaClient.maintenance.findMany({
    where: { guardId },
    orderBy: { createdAt: "desc" },
  });
};

export const getMaintenances = async (filters: {
  startDate?: Date;
  endDate?: Date;
  guardId?: string;
  category?: string;
  title?: string;
}) => {
  const whereClause: any = {};

  if (filters.startDate && filters.endDate) {
    whereClause.createdAt = {
      gte: filters.startDate,
      lte: filters.endDate,
    };
  } else if (filters.startDate) {
    whereClause.createdAt = { gte: filters.startDate };
  }

  if (filters.guardId) whereClause.guardId = filters.guardId;
  if (filters.category) whereClause.category = filters.category;
  if (filters.title)
    whereClause.title = { contains: filters.title, mode: "insensitive" };

  return prismaClient.maintenance.findMany({
    where: whereClause,
    include: {
      guard: true,
      resolvedBy: true,
    },
    orderBy: { createdAt: "desc" },
  });
};

export const resolveMaintenance = async (id: string, userId: string) => {
  return prismaClient.maintenance.update({
    where: { id },
    data: {
      status: MAINTENANCE_STATUS_ATTENDED,
      resolvedAt: now(),
      resolvedById: userId,
    },
    include: {
      guard: true,
      resolvedBy: true,
    },
  });
};

export const getPendingMaintenancesCount = async () => {
  return prismaClient.maintenance.count({
    where: {
      status: MAINTENANCE_STATUS_PENDING,
    },
  });
};

export const getMaintenanceById = async (id: string) => {
  return prismaClient.maintenance.findUnique({
    where: { id },
    include: {
      guard: true,
      resolvedBy: true,
    },
  });
};

export const deleteMaintenance = async (id: string) => {
  return prismaClient.maintenance.delete({
    where: { id },
  });
};

export const updateMaintenanceMedia = async (id: string, media: any) => {
  return prismaClient.maintenance.update({
    where: { id },
    data: { media },
  });
};
