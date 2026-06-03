import { z } from "zod";

export const CreateVisitorSchema = z.object({
  body: z.object({
    name: z.string({ message: "Nombre requerido" }),
    phone: z.string().optional(),
    email: z.string().email("Correo inválido").optional().or(z.literal("")),
    notes: z.string().optional(),
  }),
});

export const UpdateVisitorSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email("Correo inválido").optional().or(z.literal("")),
    notes: z.string().optional(),
    softDelete: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().uuid("ID de visitante inválido"),
  }),
});

export const VisitorIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid("ID de visitante inválido"),
  }),
});
