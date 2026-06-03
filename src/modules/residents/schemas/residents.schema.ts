import { z } from "zod";

export const CreateResidentSchema = z.object({
  body: z.object({
    userId: z.string().uuid("ID de usuario inválido").optional(),
    user: z.object({
      name: z.string().min(1, "Nombre es requerido"),
      lastName: z.string().optional(),
      username: z.string().min(3, "Usuario debe tener al menos 3 caracteres"),
      password: z.string().min(6, "Contraseña debe tener al menos 6 caracteres"),
    }).optional(),
    houseId: z.string().uuid("ID de casa inválido"),
    phone: z.string().optional(),
    email: z.string().email("Formato de correo inválido").optional().or(z.literal("")),
    isOwner: z.boolean().optional().default(false),
    active: z.boolean().optional().default(true),
  }).refine(data => data.userId || data.user, {
    message: "Debe proporcionar el ID de usuario o los datos de un usuario nuevo",
    path: ["userId"],
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
