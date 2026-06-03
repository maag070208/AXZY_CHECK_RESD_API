import { z } from "zod";

const ACCESS_TYPES = ["TEMPORARY", "RECURRING", "DELIVERY", "SERVICE"] as const;
const ACCESS_STATUSES = ["PENDING", "ACTIVE", "FINISHED", "EXPIRED", "REJECTED"] as const;

export const CreateAccessSchema = z.object({
  body: z.object({
    residentId: z.string().uuid("ID de residente inválido"),
    visitorId: z.string().uuid("ID de visitante inválido").optional(),
    visitor: z.object({
      name: z.string().min(1, "Nombre de visitante requerido"),
      phone: z.string().optional(),
    }).optional(),
    type: z.enum(ACCESS_TYPES, { message: "Tipo de acceso inválido" }),
    validFrom: z.string({ message: "Fecha inicio requerida" }),
    validUntil: z.string({ message: "Fecha fin requerida" }),
  }).refine(data => data.visitorId || data.visitor, {
    message: "Debe proporcionar el ID de visitante o los datos de un visitante nuevo",
    path: ["visitorId"],
  }),
});

export const UpdateAccessSchema = z.object({
  body: z.object({
    type: z.enum(ACCESS_TYPES, { message: "Tipo de acceso inválido" }).optional(),
    status: z.enum(ACCESS_STATUSES, { message: "Estado de acceso inválido" }).optional(),
    validFrom: z.string().optional(),
    validUntil: z.string().optional(),
    used: z.boolean().optional(),
    softDelete: z.boolean().optional(),
    rejectionReason: z.string().nullable().optional(),
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
