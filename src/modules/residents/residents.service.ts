import { prismaClient as prisma } from "@src/core/config/database";
import { IResidentCreateRequest, IResidentUpdateRequest } from "./residents.dto";
import { IResidentResponse } from "./residents.response";
import {
  ITDataTableFetchParams,
  ITDataTableResponse,
} from "@src/core/dto/datatable.dto";

const residentSelect = {
  id: true,
  userId: true,
  houseId: true,
  phone: true,
  email: true,
  isOwner: true,
  active: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      lastName: true,
      username: true,
    },
  },
  house: {
    select: {
      id: true,
      number: true,
      street: true,
      block: true,
      reference: true,
      occupied: true,
    },
  },
};

export const getDataTableResidents = async (
  params: ITDataTableFetchParams,
): Promise<ITDataTableResponse<IResidentResponse>> => {
  const { page = 1, limit = 10, filters } = params;
  const search = (filters as any)?.search || "";
  const isActive = (filters as any)?.active;

  const where: any = {
    deletedAt: null,
  };

  if (isActive !== undefined) {
    where.active = isActive === "true" || isActive === true;
  }

  if (search) {
    where.OR = [
      { phone: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      {
        user: {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { username: { contains: search, mode: "insensitive" } },
          ],
        },
      },
      {
        house: {
          OR: [
            { number: { contains: search, mode: "insensitive" } },
            { street: { contains: search, mode: "insensitive" } },
          ],
        },
      },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.resident.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: residentSelect,
    }),
    prisma.resident.count({ where }),
  ]);

  return { rows: rows as any[], total };
};

export const getResidentById = async (id: string): Promise<IResidentResponse | null> => {
  return prisma.resident.findFirst({
    where: { id, deletedAt: null },
    select: residentSelect,
  }) as Promise<IResidentResponse | null>;
};

export const createResident = async (data: IResidentCreateRequest) => {
  return prisma.$transaction(async (tx) => {
    const resident = await tx.resident.create({
      data: {
        userId: data.userId,
        houseId: data.houseId,
        phone: data.phone || null,
        email: data.email || null,
        isOwner: data.isOwner ?? false,
        active: data.active ?? true,
      },
      select: residentSelect,
    });

    if (resident.active) {
      await tx.house.update({
        where: { id: data.houseId },
        data: { occupied: true },
      });
    }

    return resident;
  });
};

export const updateResident = async (id: string, data: IResidentUpdateRequest) => {
  return prisma.$transaction(async (tx) => {
    const updateData: any = {};
    if (data.userId !== undefined) updateData.userId = data.userId;
    if (data.houseId !== undefined) updateData.houseId = data.houseId;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.isOwner !== undefined) updateData.isOwner = data.isOwner;
    if (data.active !== undefined) updateData.active = data.active;
    if (data.softDelete !== undefined) {
      if (data.softDelete) {
        updateData.deletedAt = new Date();
        updateData.active = false;
      } else {
        updateData.deletedAt = null;
      }
    }

    const resident = await tx.resident.update({
      where: { id },
      data: updateData,
      select: residentSelect,
    });

    // Check occupancy
    const activeResidents = await tx.resident.count({
      where: { houseId: resident.houseId, active: true, deletedAt: null },
    });

    await tx.house.update({
      where: { id: resident.houseId },
      data: { occupied: activeResidents > 0 },
    });

    return resident;
  });
};

export const deleteResident = async (id: string) => {
  return prisma.$transaction(async (tx) => {
    const resident = await tx.resident.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        active: false,
      },
      select: residentSelect,
    });

    // Check occupancy for house
    const activeResidents = await tx.resident.count({
      where: { houseId: resident.houseId, active: true, deletedAt: null },
    });

    await tx.house.update({
      where: { id: resident.houseId },
      data: { occupied: activeResidents > 0 },
    });

    return resident;
  });
};
