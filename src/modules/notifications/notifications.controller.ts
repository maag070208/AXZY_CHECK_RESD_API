import { Request, Response } from "express";
import { asyncHandler } from "@src/core/utils/asyncHandler";
import { createTResult } from "@src/core/mappers/tresult.mapper";
import { createAuditLog } from "../audit/audit.service";
import * as notificationsService from "./notifications.service";
import { NotificationType } from "@prisma/client";

export const getDataTable = asyncHandler(async (req: Request, res: Response) => {
  return res.status(200).json(createTResult(await notificationsService.getDataTableNotifications(req.body)));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  return res.status(200).json(createTResult(await notificationsService.getNotificationById(req.params.id)));
});

export const addNotification = asyncHandler(async (req: Request, res: Response) => {
  const result = await notificationsService.createNotification({
    ...req.body,
    type: req.body.type as NotificationType,
  });
  return res.status(201).json(createTResult(result));
});

export const readNotification = asyncHandler(async (req: Request, res: Response) => {
  const result = await notificationsService.markAsRead(req.params.id);
  return res.status(200).json(createTResult(result));
});

export const readAllNotifications = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.body;
  const result = await notificationsService.markAllAsRead(userId);
  return res.status(200).json(createTResult(result));
});

export const removeNotification = asyncHandler(async (req: Request, res: Response) => {
  const result = await notificationsService.deleteNotification(req.params.id);
  await createAuditLog({
    userId: res.locals.user?.id || "SYSTEM",
    module: "NOTIFICATIONS",
    action: "DELETE",
    resourceId: req.params.id,
  });
  return res.status(200).json(createTResult(result));
});
