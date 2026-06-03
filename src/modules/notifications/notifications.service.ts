import { prismaClient as prisma } from "@src/core/config/database";
import { NotificationType } from "@prisma/client";
import {
  ITDataTableFetchParams,
  ITDataTableResponse,
} from "@src/core/dto/datatable.dto";

const notificationSelect = {
  id: true,
  userId: true,
  title: true,
  message: true,
  type: true,
  read: true,
  createdAt: true,
};

export const getDataTableNotifications = async (
  params: ITDataTableFetchParams,
): Promise<ITDataTableResponse<any>> => {
  const { page = 1, limit = 10, filters } = params;
  const userId = (filters as any)?.userId;
  const read = (filters as any)?.read;
  const type = (filters as any)?.type;

  const where: any = {};
  if (userId) where.userId = userId;
  if (type) where.type = type as NotificationType;
  if (read !== undefined) where.read = read === "true" || read === true;

  const [rows, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: notificationSelect,
    }),
    prisma.notification.count({ where }),
  ]);

  return { rows, total };
};

export const getNotificationById = async (id: string) => {
  return prisma.notification.findUnique({ where: { id }, select: notificationSelect });
};

export const createNotification = async (data: {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
}) => {
  return prisma.notification.create({
    data: {
      userId: data.userId,
      title: data.title,
      message: data.message,
      type: data.type,
      read: false,
    },
    select: notificationSelect,
  });
};

export const markAsRead = async (id: string) => {
  return prisma.notification.update({
    where: { id },
    data: { read: true },
    select: notificationSelect,
  });
};

export const markAllAsRead = async (userId: string) => {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
};

export const deleteNotification = async (id: string) => {
  return prisma.notification.delete({ where: { id }, select: notificationSelect });
};
