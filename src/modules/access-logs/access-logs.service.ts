import { prismaClient as prisma } from "@src/core/config/database";
import { IAccessLogCreateRequest, IAccessLogUpdateRequest } from "./access-logs.dto";
import { IAccessLogResponse } from "./access-logs.response";
import {
  ITDataTableFetchParams,
  ITDataTableResponse,
} from "@src/core/dto/datatable.dto";

const accessLogSelect = {
  id: true,
  accessId: true,
  guardId: true,
  entryTime: true,
  exitTime: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  access: {
    select: { id: true, type: true, qrCode: true, validFrom: true, validUntil: true },
  },
  guard: {
    select: { id: true, name: true, lastName: true, username: true },
  },
};

export const getDataTableAccessLogs = async (
  params: ITDataTableFetchParams,
): Promise<ITDataTableResponse<IAccessLogResponse>> => {
  const { page = 1, limit = 10, filters } = params;
  const accessId = (filters as any)?.accessId;
  const guardId = (filters as any)?.guardId;

  const where: any = {};
  if (accessId) where.accessId = accessId;
  if (guardId) where.guardId = guardId;

  const [rows, total] = await Promise.all([
    prisma.accessLog.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { entryTime: "desc" },
      select: accessLogSelect,
    }),
    prisma.accessLog.count({ where }),
  ]);

  return { rows: rows as IAccessLogResponse[], total };
};

export const getAccessLogById = async (id: string): Promise<IAccessLogResponse | null> => {
  return prisma.accessLog.findFirst({
    where: { id },
    select: accessLogSelect,
  }) as Promise<IAccessLogResponse | null>;
};

export const createAccessLog = async (data: IAccessLogCreateRequest): Promise<IAccessLogResponse> => {
  return prisma.$transaction(async (tx) => {
    const log = await tx.accessLog.create({
      data: {
        accessId: data.accessId,
        guardId: data.guardId,
        entryTime: data.entryTime ? new Date(data.entryTime) : new Date(),
        notes: data.notes || null,
      },
      select: accessLogSelect,
    });

    // Mark access as used and set status to ACTIVE
    await tx.access.update({
      where: { id: data.accessId },
      data: { used: true, status: "ACTIVE" },
    });

    return log;
  }) as Promise<IAccessLogResponse>;
};

export const updateAccessLog = async (id: string, data: IAccessLogUpdateRequest): Promise<IAccessLogResponse> => {
  return prisma.$transaction(async (tx) => {
    const updateData: any = {};
    if (data.exitTime !== undefined) updateData.exitTime = new Date(data.exitTime);
    if (data.notes !== undefined) updateData.notes = data.notes;

    const log = await tx.accessLog.update({
      where: { id },
      data: updateData,
      select: accessLogSelect,
    });

    // If exit time is set, mark access status as FINISHED
    if (data.exitTime) {
      await tx.access.update({
        where: { id: log.accessId },
        data: { status: "FINISHED" },
      });
    }

    return log;
  }) as Promise<IAccessLogResponse>;
};
