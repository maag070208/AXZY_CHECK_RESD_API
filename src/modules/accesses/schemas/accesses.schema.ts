import { z } from "zod";

const ACCESS_TYPES = ["TEMPORARY", "RECURRING", "DELIVERY", "SERVICE"] as const;

export const CreateAccessSchema = z.object({
  body: z.object({
    residentId: z.string().uuid("ID de residente inválido"),
    visitorId: z.string().uuid("ID de visitante inválido"),
    type: z.enum(ACCESS_TYPES, { message: "Tipo de acceso inválido" }),
    validFrom: z.string({ message: "Fecha inicio requerida" }),
    validUntil: z.string({ message: "Fecha fin requerida" }),
  }),
});

export const UpdateAccessSchema = z.object({
  body: z.object({
    type: z.enum(ACCESS_TYPES, { message: "Tipo de acceso inválido" }).optional(),
    validFrom: z.string().optional(),
    validUntil: z.string().optional(),
    used: z.boolean().optional(),
    softDelete: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().uuid("ID de acceso inválido"),
  }),
});

export const AccessIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid("ID de acceso inválido"),
  }),
});
