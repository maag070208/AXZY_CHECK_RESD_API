import { z } from "zod";

export const CreateZoneSchema = z.object({
  body: z.object({
    name: z
      .string("El nombre es requerido")
      .min(1, "El nombre no puede estar vacío"),
  }),
});

export const UpdateZoneSchema = z.object({
  body: z.object({
    name: z.string().min(1, "El nombre no puede estar vacío").optional(),
    active: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().uuid("ID de zona inválido"),
  }),
});

export const ZoneIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid("ID de zona inválido"),
  }),
});
