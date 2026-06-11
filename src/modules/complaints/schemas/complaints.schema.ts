import { z } from "zod";

const COMPLAINT_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;

export const CreateComplaintCategorySchema = z.object({
  body: z.object({
    name: z.string({ message: "Nombre requerido" }),
    icon: z.string().optional(),
    color: z.string().optional(),
  }),
});

export const UpdateComplaintCategorySchema = z.object({
  body: z.object({
    name: z.string().optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
  }),
  params: z.object({
    id: z.string().uuid("ID de categoría inválido"),
  }),
});

export const ComplaintCategoryIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid("ID de categoría inválido"),
  }),
});

export const CreateComplaintSchema = z.object({
  body: z.object({
    residentId: z.string().uuid("ID de residente inválido").optional(),
    categoryId: z.string().uuid("ID de categoría inválido"),
    title: z.string({ message: "Título requerido" }),
    description: z.string({ message: "Descripción requerida" }),
    media: z.record(z.string(), z.any()).optional(),
  }),
});

export const UpdateComplaintSchema = z.object({
  body: z.object({
    categoryId: z.string().uuid("ID de categoría inválido").optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    media: z.record(z.string(), z.any()).optional(),
    status: z.enum(COMPLAINT_STATUSES, { message: "Estado inválido" }).optional(),
    resolvedById: z.string().uuid("ID de resolutor inválido").optional(),
    resolvedAt: z.string().optional(),
    softDelete: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().uuid("ID de queja inválido"),
  }),
});

export const ComplaintIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid("ID de queja inválido"),
  }),
});

export const CreateMessageSchema = z.object({
  body: z.object({
    message: z.string({ message: "Mensaje requerido" }).min(1, "El mensaje no puede estar vacío"),
  }),
  params: z.object({
    id: z.string().uuid("ID de queja inválido"),
  }),
});
