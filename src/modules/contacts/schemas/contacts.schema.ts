import { z } from "zod";

export const CreateContactSchema = z.object({
  body: z.object({
    residentId: z.string().uuid("ID de residente inválido"),
    name: z.string().min(1, "El nombre no puede estar vacío"),
    phone: z.string().optional(),
    email: z.string().email("Formato de correo inválido").optional().or(z.literal("")),
    relationship: z.string().min(1, "El parentesco/relación no puede estar vacío"),
    canGenerateAccess: z.boolean().optional().default(false),
    active: z.boolean().optional().default(true),
  }),
});

export const UpdateContactSchema = z.object({
  body: z.object({
    residentId: z.string().uuid("ID de residente inválido").optional(),
    name: z.string().min(1, "El nombre no puede estar vacío").optional(),
    phone: z.string().optional(),
    email: z.string().email("Formato de correo inválido").optional().or(z.literal("")),
    relationship: z.string().min(1, "El parentesco/relación no puede estar vacío").optional(),
    canGenerateAccess: z.boolean().optional(),
    active: z.boolean().optional(),
    softDelete: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().uuid("ID de contacto inválido"),
  }),
});

export const ContactIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid("ID de contacto inválido"),
  }),
});
