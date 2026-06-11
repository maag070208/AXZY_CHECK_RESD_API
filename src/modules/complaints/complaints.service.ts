import { prismaClient as prisma } from "@src/core/config/database";
import { ComplaintStatus } from "@prisma/client";
import {
  IComplaintCategoryCreateRequest,
  IComplaintCategoryUpdateRequest,
  IComplaintCategoryResponse,
} from "./complaint-categories.dto";
import {
  IComplaintCreateRequest,
  IComplaintUpdateRequest,
  IComplaintResponse,
} from "./complaints.dto";
import {
  IComplaintMessageResponse,
} from "./complaints.dto";
import { publishComplaintMessage, publishComplaintUpdate } from "./complaints.socket";
import {
  ITDataTableFetchParams,
  ITDataTableResponse,
} from "@src/core/dto/datatable.dto";

const categorySelect = {
  id: true,
  name: true,
  icon: true,
  color: true,
  createdAt: true,
  updatedAt: true,
};

const complaintSelect = {
  id: true,
  residentId: true,
  categoryId: true,
  title: true,
  description: true,
  media: true,
  status: true,
  resolvedById: true,
  resolvedAt: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  resident: {
    select: {
      id: true,
      phone: true,
      user: { select: { id: true, name: true, lastName: true } },
    },
  },
  category: { select: { id: true, name: true, icon: true, color: true } },
  resolvedBy: { select: { id: true, name: true, lastName: true } },
};

// ---- Categories ----
export const getAllCategories = async (): Promise<IComplaintCategoryResponse[]> => {
  return prisma.complaintCategory.findMany({
    select: categorySelect,
    orderBy: { name: "asc" },
  });
};

export const getCategoryById = async (id: string): Promise<IComplaintCategoryResponse | null> => {
  return prisma.complaintCategory.findUnique({ where: { id }, select: categorySelect });
};

export const createCategory = async (data: IComplaintCategoryCreateRequest): Promise<IComplaintCategoryResponse> => {
  return prisma.complaintCategory.create({
    data: { name: data.name, icon: data.icon || null, color: data.color || null },
    select: categorySelect,
  });
};

export const updateCategory = async (id: string, data: IComplaintCategoryUpdateRequest): Promise<IComplaintCategoryResponse> => {
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.icon !== undefined) updateData.icon = data.icon;
  if (data.color !== undefined) updateData.color = data.color;
  return prisma.complaintCategory.update({ where: { id }, data: updateData, select: categorySelect });
};

export const deleteCategory = async (id: string): Promise<IComplaintCategoryResponse> => {
  return prisma.complaintCategory.delete({ where: { id }, select: categorySelect });
};

// ---- Complaints ----
export const getDataTableComplaints = async (
  params: ITDataTableFetchParams,
): Promise<ITDataTableResponse<IComplaintResponse>> => {
  const { page = 1, limit = 10, filters } = params;
  const search = (filters as any)?.search || "";
  const residentId = (filters as any)?.residentId;
  const status = (filters as any)?.status;

  const where: any = { deletedAt: null };
  if (residentId) where.residentId = residentId;
  if (status) where.status = status as ComplaintStatus;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.complaint.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: complaintSelect,
    }),
    prisma.complaint.count({ where }),
  ]);

  return { rows: rows as IComplaintResponse[], total };
};

export const getComplaintById = async (id: string): Promise<IComplaintResponse | null> => {
  return prisma.complaint.findFirst({
    where: { id, deletedAt: null },
    select: complaintSelect,
  }) as Promise<IComplaintResponse | null>;
};

export const createComplaint = async (data: IComplaintCreateRequest): Promise<IComplaintResponse> => {
  const complaint = await prisma.complaint.create({
    data: {
      residentId: data.residentId,
      categoryId: data.categoryId,
      title: data.title,
      description: data.description,
      media: data.media || undefined,
      status: ComplaintStatus.OPEN,
    },
    select: complaintSelect,
  });
  publishComplaintUpdate(complaint.id, "new_complaint").catch(() => {});
  return complaint as IComplaintResponse;
};

export const updateComplaint = async (id: string, data: IComplaintUpdateRequest, actorId?: string): Promise<IComplaintResponse> => {
  const existing = await prisma.complaint.findFirst({
    where: { id, deletedAt: null },
    select: { status: true },
  });

  if (!existing) {
    throw new Error("Queja no encontrada");
  }

  if (existing.status === ComplaintStatus.CLOSED) {
    throw new Error("No se puede modificar una queja cerrada");
  }

  if (data.status !== undefined) {
    const next = data.status as ComplaintStatus;
    const validTransitions: Record<ComplaintStatus, ComplaintStatus[]> = {
      OPEN: [ComplaintStatus.IN_PROGRESS, ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED],
      IN_PROGRESS: [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED],
      RESOLVED: [ComplaintStatus.CLOSED],
      CLOSED: [],
    };

    const allowed = validTransitions[existing.status];
    if (!allowed.includes(next)) {
      throw new Error(`No se puede cambiar de ${existing.status} a ${next}`);
    }

    if (next === ComplaintStatus.RESOLVED || next === ComplaintStatus.CLOSED) {
      if (actorId && !data.resolvedById) {
        data.resolvedById = actorId;
      }
      if (!data.resolvedAt) {
        data.resolvedAt = new Date().toISOString();
      }
    }
  }

  const updateData: any = {};
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.media !== undefined) updateData.media = data.media;
  if (data.status !== undefined) updateData.status = data.status as ComplaintStatus;
  if (data.resolvedById !== undefined) updateData.resolvedById = data.resolvedById;
  if (data.resolvedAt !== undefined) updateData.resolvedAt = new Date(data.resolvedAt);
  if (data.softDelete !== undefined) {
    updateData.deletedAt = data.softDelete ? new Date() : null;
  }

  const updated = await prisma.complaint.update({
    where: { id },
    data: updateData,
    select: complaintSelect,
  });

  if (data.status !== undefined) {
    publishComplaintUpdate(id, "status_change").catch(() => {});
  }

  return updated as IComplaintResponse;
};

export const deleteComplaint = async (id: string): Promise<IComplaintResponse> => {
  return prisma.complaint.update({
    where: { id },
    data: { deletedAt: new Date() },
    select: complaintSelect,
  }) as Promise<IComplaintResponse>;
};

const messageSelect = {
  id: true,
  complaintId: true,
  userId: true,
  message: true,
  createdAt: true,
  user: { select: { id: true, name: true, lastName: true } },
};

export const getComplaintMessages = async (complaintId: string): Promise<IComplaintMessageResponse[]> => {
  return prisma.complaintMessage.findMany({
    where: { complaintId },
    select: messageSelect,
    orderBy: { createdAt: "asc" },
  }) as Promise<IComplaintMessageResponse[]>;
};

export const createComplaintMessage = async (
  complaintId: string,
  userId: string,
  message: string,
): Promise<IComplaintMessageResponse> => {
  const complaint = await prisma.complaint.findFirst({
    where: { id: complaintId, deletedAt: null },
    select: { status: true },
  });

  if (!complaint) {
    throw new Error("Queja no encontrada");
  }

  if (complaint.status === ComplaintStatus.CLOSED) {
    throw new Error("No se pueden enviar mensajes en una queja cerrada");
  }
  const msg = await prisma.complaintMessage.create({
    data: { complaintId, userId, message },
    select: messageSelect,
  });

  const channelMessage = {
    id: msg.id,
    message: msg.message,
    userId: msg.userId,
    userName: (msg as any).user?.name || "Usuario",
    createdAt: msg.createdAt.toISOString(),
  };
  publishComplaintMessage(complaintId, channelMessage).catch(() => {});
  publishComplaintUpdate(complaintId, "new_message").catch(() => {});

  return msg as IComplaintMessageResponse;
};
