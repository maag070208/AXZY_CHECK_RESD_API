import { z } from "zod";

export const CreateHouseSchema = z.object({
  body: z.object({
    number: z.string({ message: "Número requerido" }),
    street: z.string({ message: "Calle requerida" }),
    block: z.string().optional(),
    reference: z.string().optional(),
    occupied: z.boolean().optional().default(false),
    active: z.boolean().optional().default(true),
  }),
});

export const UpdateHouseSchema = z.object({
  body: z.object({
    number: z.string().optional(),
    street: z.string().optional(),
    block: z.string().optional(),
    reference: z.string().optional(),
    occupied: z.boolean().optional(),
    active: z.boolean().optional(),
    softDelete: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().uuid("ID de casa inválido"),
  }),
});

export const HouseIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid("ID de casa inválido"),
  }),
});
