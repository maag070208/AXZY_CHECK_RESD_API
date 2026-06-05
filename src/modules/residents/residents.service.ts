import { prismaClient as prisma } from "@src/core/config/database";
import { IResidentCreateRequest, IResidentUpdateRequest } from "./residents.dto";
import { IResidentResponse } from "./residents.response";
import { hashPassword } from "@src/core/utils/security";
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
      active: true,
    },
  },
  house: {
    select: {
      id: true,
      number: true,
      street: true,
      block: true,
      reference: true,
      latitude: true,
      longitude: true,
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

const updateHouseOccupancy = async (tx: any, houseId: string) => {
  const activeCount = await tx.resident.count({
    where: {
      houseId,
      active: true,
      deletedAt: null,
    },
  });

  await tx.house.update({
    where: { id: houseId },
    data: {
      occupied: activeCount > 0,
    },
  });
};

export const createResident = async (data: IResidentCreateRequest) => {
  return prisma.$transaction(async (tx) => {
    let finalUserId = data.userId;

    if (!finalUserId && data.user) {
      const existing = await tx.user.findFirst({
        where: { username: data.user.username },
      });
      if (existing) {
        throw new Error("El nombre de usuario ya está registrado");
      }

      const roleObj = await tx.role.findUnique({
        where: { name: "RESDN" },
      });
      if (!roleObj) {
        throw new Error("Rol de residente (RESDN) no encontrado en el sistema");
      }

      let hashedPassword = "";
      if (data.user.password) {
        hashedPassword = await hashPassword(data.user.password);
      }

      const newUser = await tx.user.create({
        data: {
          name: data.user.name,
          lastName: data.user.lastName || null,
          username: data.user.username,
          password: hashedPassword,
          roleId: roleObj.id,
          active: true,
        },
      });

      finalUserId = newUser.id;
    }

    if (!finalUserId) {
      throw new Error("Debe proporcionar el ID de usuario o los datos de un usuario nuevo");
    }

    const resident = await tx.resident.create({
      data: {
        userId: finalUserId,
        houseId: data.houseId,
        phone: data.phone || null,
        email: data.email || null,
        isOwner: data.isOwner ?? false,
        active: data.active ?? true,
      },
      select: residentSelect,
    });

    await updateHouseOccupancy(tx, data.houseId);

    return resident;
  });
};

export const updateResident = async (id: string, data: IResidentUpdateRequest) => {
  return prisma.$transaction(async (tx) => {
    const oldResident = await tx.resident.findUnique({
      where: { id },
      select: { houseId: true, userId: true },
    });
    if (!oldResident) throw new Error("Residente no encontrado");

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

    const shouldDeactivate = data.active === false || data.softDelete === true;
    if (shouldDeactivate && oldResident.userId) {
      await tx.user.update({
        where: { id: oldResident.userId },
        data: { active: false },
      });
    }

    // Update new house occupancy
    await updateHouseOccupancy(tx, resident.houseId);

    // If house changed, update old house occupancy too
    if (oldResident && oldResident.houseId !== resident.houseId) {
      await updateHouseOccupancy(tx, oldResident.houseId);
    }

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
      select: { ...residentSelect, userId: true },
    });

    if (resident.userId) {
      await tx.user.update({
        where: { id: resident.userId },
        data: { active: false },
      });
    }

    await updateHouseOccupancy(tx, resident.houseId);

    return resident;
  });
};

export const getResidentByUserId = async (userId: string): Promise<IResidentResponse | null> => {
  return prisma.resident.findFirst({
    where: { userId, deletedAt: null },
    select: residentSelect,
  }) as Promise<IResidentResponse | null>;
};

