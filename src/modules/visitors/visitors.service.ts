import { prismaClient as prisma } from "@src/core/config/database";
import { IVisitorCreateRequest, IVisitorUpdateRequest } from "./visitors.dto";
import { IVisitorResponse } from "./visitors.response";
import {
  ITDataTableFetchParams,
  ITDataTableResponse,
} from "@src/core/dto/datatable.dto";

const visitorSelect = {
  id: true,
  name: true,
  phone: true,
  email: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
};

export const getDataTableVisitors = async (
  params: ITDataTableFetchParams,
): Promise<ITDataTableResponse<IVisitorResponse>> => {
  const { page = 1, limit = 10, filters } = params;
  const search = (filters as any)?.search || "";

  const where: any = { deletedAt: null };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.visitor.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: visitorSelect,
    }),
    prisma.visitor.count({ where }),
  ]);

  return { rows: rows as IVisitorResponse[], total };
};

export const getVisitorById = async (id: string): Promise<IVisitorResponse | null> => {
  return prisma.visitor.findFirst({
    where: { id, deletedAt: null },
    select: visitorSelect,
  }) as Promise<IVisitorResponse | null>;
};

export const createVisitor = async (data: IVisitorCreateRequest): Promise<IVisitorResponse> => {
  return prisma.visitor.create({
    data: {
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      notes: data.notes || null,
    },
    select: visitorSelect,
  }) as Promise<IVisitorResponse>;
};

export const updateVisitor = async (id: string, data: IVisitorUpdateRequest): Promise<IVisitorResponse> => {
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.softDelete !== undefined) {
    updateData.deletedAt = data.softDelete ? new Date() : null;
  }

  return prisma.visitor.update({
    where: { id },
    data: updateData,
    select: visitorSelect,
  }) as Promise<IVisitorResponse>;
};

export const deleteVisitor = async (id: string): Promise<IVisitorResponse> => {
  return prisma.visitor.update({
    where: { id },
    data: { deletedAt: new Date() },
    select: visitorSelect,
  }) as Promise<IVisitorResponse>;
};
