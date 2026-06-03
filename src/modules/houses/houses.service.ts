import { prismaClient as prisma } from "@src/core/config/database";
import { IHouseCreateRequest, IHouseUpdateRequest } from "./houses.dto";
import { IHouseResponse } from "./houses.response";
import {
  ITDataTableFetchParams,
  ITDataTableResponse,
} from "@src/core/dto/datatable.dto";

const houseSelect = {
  id: true,
  number: true,
  street: true,
  block: true,
  reference: true,
  latitude: true,
  longitude: true,
  occupied: true,
  active: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
};

export const getDataTableHouses = async (
  params: ITDataTableFetchParams,
): Promise<ITDataTableResponse<IHouseResponse>> => {
  const { page = 1, limit = 10, filters } = params;
  const search = (filters as any)?.search || "";
  const isActive = (filters as any)?.active;

  const where: any = { deletedAt: null };

  if (isActive !== undefined) {
    where.active = isActive === "true" || isActive === true;
  }

  if (search) {
    where.OR = [
      { number: { contains: search, mode: "insensitive" } },
      { street: { contains: search, mode: "insensitive" } },
      { block: { contains: search, mode: "insensitive" } },
      { reference: { contains: search, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.house.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: houseSelect,
    }),
    prisma.house.count({ where }),
  ]);

  return { rows: rows as IHouseResponse[], total };
};

export const getHouseById = async (id: string): Promise<IHouseResponse | null> => {
  return prisma.house.findFirst({
    where: { id, deletedAt: null },
    select: houseSelect,
  }) as Promise<IHouseResponse | null>;
};

export const createHouse = async (data: IHouseCreateRequest): Promise<IHouseResponse> => {
  return prisma.house.create({
    data: {
      number: data.number,
      street: data.street,
      block: data.block || null,
      reference: data.reference || null,
      latitude: data.latitude !== undefined ? data.latitude : null,
      longitude: data.longitude !== undefined ? data.longitude : null,
      occupied: false, // Enforce unoccupied on creation until residents are assigned
      active: data.active ?? true,
    },
    select: houseSelect,
  }) as Promise<IHouseResponse>;
};

export const updateHouse = async (id: string, data: IHouseUpdateRequest): Promise<IHouseResponse> => {
  const updateData: any = {};
  if (data.number !== undefined) updateData.number = data.number;
  if (data.street !== undefined) updateData.street = data.street;
  if (data.block !== undefined) updateData.block = data.block;
  if (data.reference !== undefined) updateData.reference = data.reference;
  if (data.latitude !== undefined) updateData.latitude = data.latitude;
  if (data.longitude !== undefined) updateData.longitude = data.longitude;
  if (data.occupied !== undefined) updateData.occupied = data.occupied;
  if (data.active !== undefined) updateData.active = data.active;
  if (data.softDelete !== undefined) {
    if (data.softDelete) {
      updateData.deletedAt = new Date();
      updateData.active = false;
    } else {
      updateData.deletedAt = null;
    }
  }

  return prisma.house.update({
    where: { id },
    data: updateData,
    select: houseSelect,
  }) as Promise<IHouseResponse>;
};

export const deleteHouse = async (id: string): Promise<IHouseResponse> => {
  return prisma.house.update({
    where: { id },
    data: { deletedAt: new Date(), active: false },
    select: houseSelect,
  }) as Promise<IHouseResponse>;
};
