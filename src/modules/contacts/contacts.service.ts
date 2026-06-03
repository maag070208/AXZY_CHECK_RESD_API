import { prismaClient as prisma } from "@src/core/config/database";
import { IResidentContactCreateRequest, IResidentContactUpdateRequest } from "./contacts.dto";
import { IResidentContactResponse } from "./contacts.response";
import {
  ITDataTableFetchParams,
  ITDataTableResponse,
} from "@src/core/dto/datatable.dto";

const contactSelect = {
  id: true,
  residentId: true,
  name: true,
  phone: true,
  email: true,
  relationship: true,
  canGenerateAccess: true,
  active: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  resident: {
    select: {
      id: true,
      phone: true,
      email: true,
      isOwner: true,
      user: {
        select: {
          id: true,
          name: true,
          lastName: true,
          username: true,
        },
      },
    },
  },
};

export const getDataTableContacts = async (
  params: ITDataTableFetchParams,
): Promise<ITDataTableResponse<IResidentContactResponse>> => {
  const { page = 1, limit = 10, filters } = params;
  const search = (filters as any)?.search || "";
  const residentId = (filters as any)?.residentId;
  const isActive = (filters as any)?.active;

  const where: any = {
    deletedAt: null,
  };

  if (residentId) {
    where.residentId = residentId;
  }

  if (isActive !== undefined) {
    where.active = isActive === "true" || isActive === true;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { relationship: { contains: search, mode: "insensitive" } },
      {
        resident: {
          user: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.residentContact.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: contactSelect,
    }),
    prisma.residentContact.count({ where }),
  ]);

  return { rows: rows as any[], total };
};

export const getContactById = async (id: string): Promise<IResidentContactResponse | null> => {
  return prisma.residentContact.findFirst({
    where: { id, deletedAt: null },
    select: contactSelect,
  }) as Promise<IResidentContactResponse | null>;
};

export const createContact = async (data: IResidentContactCreateRequest) => {
  return prisma.residentContact.create({
    data: {
      residentId: data.residentId,
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      relationship: data.relationship,
      canGenerateAccess: data.canGenerateAccess ?? false,
      active: data.active ?? true,
    },
    select: contactSelect,
  });
};

export const updateContact = async (id: string, data: IResidentContactUpdateRequest) => {
  const updateData: any = {};
  if (data.residentId !== undefined) updateData.residentId = data.residentId;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.relationship !== undefined) updateData.relationship = data.relationship;
  if (data.canGenerateAccess !== undefined) updateData.canGenerateAccess = data.canGenerateAccess;
  if (data.active !== undefined) updateData.active = data.active;
  if (data.softDelete !== undefined) {
    if (data.softDelete) {
      updateData.deletedAt = new Date();
      updateData.active = false;
    } else {
      updateData.deletedAt = null;
    }
  }

  return prisma.residentContact.update({
    where: { id },
    data: updateData,
    select: contactSelect,
  });
};

export const deleteContact = async (id: string) => {
  return prisma.residentContact.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      active: false,
    },
    select: contactSelect,
  });
};
