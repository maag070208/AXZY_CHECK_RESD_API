import { z } from "zod";

export const CreateAccessLogSchema = z.object({
  body: z.object({
    accessId: z.string().uuid("ID de acceso inválido"),
    guardId: z.string().uuid("ID de guardia inválido"),
    entryTime: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const UpdateAccessLogSchema = z.object({
  body: z.object({
    exitTime: z.string().optional(),
    notes: z.string().optional(),
  }),
  params: z.object({
    id: z.string().uuid("ID de registro inválido"),
  }),
});

export const AccessLogIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid("ID de registro inválido"),
  }),
});
