import { z } from "zod";

export const CreateVehicleSchema = z.object({
  body: z.object({
    houseId: z.string().uuid("ID de casa inválido"),
    plate: z.string({ message: "Placa requerida" }),
    brand: z.string().optional(),
    model: z.string().optional(),
    color: z.string().optional(),
    active: z.boolean().optional().default(true),
  }),
});

export const UpdateVehicleSchema = z.object({
  body: z.object({
    houseId: z.string().uuid("ID de casa inválido").optional(),
    plate: z.string().optional(),
    brand: z.string().optional(),
    model: z.string().optional(),
    color: z.string().optional(),
    active: z.boolean().optional(),
    softDelete: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().uuid("ID de vehículo inválido"),
  }),
});

export const VehicleIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid("ID de vehículo inválido"),
  }),
});
