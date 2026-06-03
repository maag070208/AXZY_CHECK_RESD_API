import { prismaClient as prisma } from "@src/core/config/database";
import { IVehicleCreateRequest, IVehicleUpdateRequest } from "./vehicles.dto";
import { IVehicleResponse } from "./vehicles.response";
import {
  ITDataTableFetchParams,
  ITDataTableResponse,
} from "@src/core/dto/datatable.dto";

const vehicleSelect = {
  id: true,
  houseId: true,
  plate: true,
  brand: true,
  model: true,
  color: true,
  active: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  house: {
    select: { id: true, number: true, street: true, block: true },
  },
};

export const getDataTableVehicles = async (
  params: ITDataTableFetchParams,
): Promise<ITDataTableResponse<IVehicleResponse>> => {
  const { page = 1, limit = 10, filters } = params;
  const search = (filters as any)?.search || "";
  const houseId = (filters as any)?.houseId;
  const isActive = (filters as any)?.active;

  const where: any = { deletedAt: null };
  if (isActive !== undefined) {
    where.active = isActive === "true" || isActive === true;
  }
  if (houseId) where.houseId = houseId;

  if (search) {
    where.OR = [
      { plate: { contains: search, mode: "insensitive" } },
      { brand: { contains: search, mode: "insensitive" } },
      { model: { contains: search, mode: "insensitive" } },
      { color: { contains: search, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: vehicleSelect,
    }),
    prisma.vehicle.count({ where }),
  ]);

  return { rows: rows as IVehicleResponse[], total };
};

export const getVehicleById = async (id: string): Promise<IVehicleResponse | null> => {
  return prisma.vehicle.findFirst({
    where: { id, deletedAt: null },
    select: vehicleSelect,
  }) as Promise<IVehicleResponse | null>;
};

export const createVehicle = async (data: IVehicleCreateRequest): Promise<IVehicleResponse> => {
  return prisma.vehicle.create({
    data: {
      houseId: data.houseId,
      plate: data.plate,
      brand: data.brand || null,
      model: data.model || null,
      color: data.color || null,
      active: data.active ?? true,
    },
    select: vehicleSelect,
  }) as Promise<IVehicleResponse>;
};

export const updateVehicle = async (id: string, data: IVehicleUpdateRequest): Promise<IVehicleResponse> => {
  const updateData: any = {};
  if (data.houseId !== undefined) updateData.houseId = data.houseId;
  if (data.plate !== undefined) updateData.plate = data.plate;
  if (data.brand !== undefined) updateData.brand = data.brand;
  if (data.model !== undefined) updateData.model = data.model;
  if (data.color !== undefined) updateData.color = data.color;
  if (data.active !== undefined) updateData.active = data.active;
  if (data.softDelete !== undefined) {
    if (data.softDelete) {
      updateData.deletedAt = new Date();
      updateData.active = false;
    } else {
      updateData.deletedAt = null;
    }
  }

  return prisma.vehicle.update({
    where: { id },
    data: updateData,
    select: vehicleSelect,
  }) as Promise<IVehicleResponse>;
};

export const deleteVehicle = async (id: string): Promise<IVehicleResponse> => {
  return prisma.vehicle.update({
    where: { id },
    data: { deletedAt: new Date(), active: false },
    select: vehicleSelect,
  }) as Promise<IVehicleResponse>;
};
