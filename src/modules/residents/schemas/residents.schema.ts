import { z } from "zod";

export const CreateResidentSchema = z.object({
  body: z.object({
    userId: z.string().uuid("ID de usuario inválido"),
    houseId: z.string().uuid("ID de casa inválido"),
    phone: z.string().optional(),
    email: z.string().email("Formato de correo inválido").optional().or(z.literal("")),
    isOwner: z.boolean().optional().default(false),
    active: z.boolean().optional().default(true),
  }),
});

export const UpdateResidentSchema = z.object({
  body: z.object({
    userId: z.string().uuid("ID de usuario inválido").optional(),
    houseId: z.string().uuid("ID de casa inválido").optional(),
    phone: z.string().optional(),
    email: z.string().email("Formato de correo inválido").optional().or(z.literal("")),
    isOwner: z.boolean().optional(),
    active: z.boolean().optional(),
    softDelete: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().uuid("ID de residente inválido"),
  }),
});

export const ResidentIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid("ID de residente inválido"),
  }),
});
