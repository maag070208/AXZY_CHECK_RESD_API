import { z } from "zod";

const PAYMENT_STATUSES = ["PENDING", "PAID", "CANCELLED", "FAILED"] as const;

const FEE_TYPES = ["ONE_TIME", "MONTHLY"] as const;

export const CreateFeeSchema = z.object({
  body: z.object({
    name: z.string({ message: "Nombre requerido" }),
    description: z.string().optional(),
    amount: z.number({ message: "Monto requerido" }),
    type: z.enum(FEE_TYPES).optional().default("ONE_TIME"),
    dueDate: z.string({ message: "Fecha de vencimiento requerida" }),
    active: z.boolean().optional().default(true),
  }),
});

export const UpdateFeeSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    amount: z.number().optional(),
    type: z.enum(FEE_TYPES).optional(),
    dueDate: z.string().optional(),
    active: z.boolean().optional(),
    softDelete: z.boolean().optional(),
  }),
  params: z.object({ id: z.string().uuid("ID de cuota inválido") }),
});

export const FeeIdParamSchema = z.object({
  params: z.object({ id: z.string().uuid("ID de cuota inválido") }),
});

export const CreatePaymentSchema = z.object({
  body: z.object({
    residentId: z.string().uuid("ID de residente inválido"),
    feeId: z.string().uuid("ID de cuota inválido"),
    amount: z.number({ message: "Monto requerido" }),
    reference: z.string().optional(),
    status: z.enum(PAYMENT_STATUSES, { message: "Estado inválido" }).optional(),
    paidAt: z.string().optional(),
  }),
});

export const UpdatePaymentSchema = z.object({
  body: z.object({
    status: z.enum(PAYMENT_STATUSES, { message: "Estado inválido" }).optional(),
    reference: z.string().optional(),
    paidAt: z.string().optional(),
    softDelete: z.boolean().optional(),
  }),
  params: z.object({ id: z.string().uuid("ID de pago inválido") }),
});

export const PaymentIdParamSchema = z.object({
  params: z.object({ id: z.string().uuid("ID de pago inválido") }),
});

// ---- Resident Fees ----
export const CreateResidentFeeSchema = z.object({
  body: z.object({
    residentId: z.string().uuid("ID de residente inválido"),
    feeId: z.string().uuid("ID de cuota inválido"),
    startDate: z.string().optional(),
  }),
});

export const BulkAssignResidentFeeSchema = z.object({
  body: z.object({
    residentIds: z.array(z.string().uuid("ID de residente inválido"), { message: "Lista de residentes requerida" }),
    feeId: z.string().uuid("ID de cuota inválido"),
    startDate: z.string().optional(),
  }),
});

export const ResidentFeeIdParamSchema = z.object({
  params: z.object({ id: z.string().uuid("ID de asignación inválido") }),
});

export const ResidentFeesQuerySchema = z.object({
  query: z.object({
    residentId: z.string().uuid("ID de residente inválido").optional(),
  }),
});
