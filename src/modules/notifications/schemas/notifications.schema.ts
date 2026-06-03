import { z } from "zod";

const NOTIFICATION_TYPES = ["GENERAL", "ACCESS", "PAYMENT", "COMPLAINT", "EMERGENCY"] as const;

export const CreateNotificationSchema = z.object({
  body: z.object({
    userId: z.string().uuid("ID de usuario inválido"),
    title: z.string({ message: "Título requerido" }),
    message: z.string({ message: "Mensaje requerido" }),
    type: z.enum(NOTIFICATION_TYPES, { message: "Tipo de notificación inválido" }),
  }),
});

export const NotificationIdParamSchema = z.object({
  params: z.object({ id: z.string().uuid("ID de notificación inválido") }),
});

export const MarkAllReadSchema = z.object({
  body: z.object({
    userId: z.string().uuid("ID de usuario inválido"),
  }),
});
