import { prismaClient as prisma } from "@src/core/config/database";
import { AccessType } from "@prisma/client";
import { IAccessCreateRequest, IAccessUpdateRequest } from "./accesses.dto";
import { IAccessResponse } from "./accesses.response";
import {
  ITDataTableFetchParams,
  ITDataTableResponse,
} from "@src/core/dto/datatable.dto";
import { randomUUID } from "crypto";

const accessSelect = {
  id: true,
  residentId: true,
  visitorId: true,
  type: true,
  qrCode: true,
  validFrom: true,
  validUntil: true,
  used: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  resident: {
    select: {
      id: true,
      phone: true,
      email: true,
      user: { select: { id: true, name: true, lastName: true } },
    },
  },
  visitor: {
    select: { id: true, name: true, phone: true },
  },
};

export const getDataTableAccesses = async (
  params: ITDataTableFetchParams,
): Promise<ITDataTableResponse<IAccessResponse>> => {
  const { page = 1, limit = 10, filters } = params;
  const residentId = (filters as any)?.residentId;
  const type = (filters as any)?.type;
  const used = (filters as any)?.used;

  const where: any = { deletedAt: null };
  if (residentId) where.residentId = residentId;
  if (type) where.type = type as AccessType;
  if (used !== undefined) where.used = used === "true" || used === true;

  const [rows, total] = await Promise.all([
    prisma.access.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: accessSelect,
    }),
    prisma.access.count({ where }),
  ]);

  return { rows: rows as IAccessResponse[], total };
};

export const getAccessById = async (id: string): Promise<IAccessResponse | null> => {
  return prisma.access.findFirst({
    where: { id, deletedAt: null },
    select: accessSelect,
  }) as Promise<IAccessResponse | null>;
};

export const createAccess = async (data: IAccessCreateRequest): Promise<IAccessResponse> => {
  const qrCode = randomUUID();

  return prisma.access.create({
    data: {
      residentId: data.residentId,
      visitorId: data.visitorId,
      type: data.type as AccessType,
      qrCode,
      validFrom: new Date(data.validFrom),
      validUntil: new Date(data.validUntil),
      used: false,
    },
    select: accessSelect,
  }) as Promise<IAccessResponse>;
};

export const updateAccess = async (id: string, data: IAccessUpdateRequest): Promise<IAccessResponse> => {
  const updateData: any = {};
  if (data.type !== undefined) updateData.type = data.type as AccessType;
  if (data.validFrom !== undefined) updateData.validFrom = new Date(data.validFrom);
  if (data.validUntil !== undefined) updateData.validUntil = new Date(data.validUntil);
  if (data.used !== undefined) updateData.used = data.used;
  if (data.softDelete !== undefined) {
    updateData.deletedAt = data.softDelete ? new Date() : null;
  }

  return prisma.access.update({
    where: { id },
    data: updateData,
    select: accessSelect,
  }) as Promise<IAccessResponse>;
};

export const deleteAccess = async (id: string): Promise<IAccessResponse> => {
  return prisma.access.update({
    where: { id },
    data: { deletedAt: new Date() },
    select: accessSelect,
  }) as Promise<IAccessResponse>;
};
