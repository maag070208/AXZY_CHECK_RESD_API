import { z } from "zod";

const PAYMENT_STATUSES = ["PENDING", "PAID", "CANCELLED", "FAILED"] as const;

export const CreateFeeSchema = z.object({
  body: z.object({
    name: z.string({ message: "Nombre requerido" }),
    description: z.string().optional(),
    amount: z.number({ message: "Monto requerido" }),
    dueDate: z.string({ message: "Fecha de vencimiento requerida" }),
    active: z.boolean().optional().default(true),
  }),
});

export const UpdateFeeSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    amount: z.number().optional(),
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
