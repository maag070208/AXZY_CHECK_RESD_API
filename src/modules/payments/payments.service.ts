import { prismaClient as prisma } from "@src/core/config/database";
import { PaymentStatus } from "@prisma/client";
import {
  ITDataTableFetchParams,
  ITDataTableResponse,
} from "@src/core/dto/datatable.dto";

const feeSelect = {
  id: true,
  name: true,
  description: true,
  amount: true,
  dueDate: true,
  active: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
};

const paymentSelect = {
  id: true,
  residentId: true,
  feeId: true,
  amount: true,
  reference: true,
  status: true,
  paidAt: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  resident: {
    select: {
      id: true,
      phone: true,
      user: { select: { id: true, name: true, lastName: true } },
    },
  },
  fee: { select: { id: true, name: true, amount: true } },
};

// ---- Fees ----
export const getAllFees = async () => {
  return prisma.fee.findMany({
    where: { active: true, deletedAt: null },
    select: feeSelect,
    orderBy: { dueDate: "asc" },
  });
};

export const getFeeById = async (id: string) => {
  return prisma.fee.findFirst({ where: { id, deletedAt: null }, select: feeSelect });
};

export const createFee = async (data: {
  name: string;
  description?: string;
  amount: number;
  dueDate: string;
  active?: boolean;
}) => {
  return prisma.fee.create({
    data: {
      name: data.name,
      description: data.description || null,
      amount: data.amount,
      dueDate: new Date(data.dueDate),
      active: data.active ?? true,
    },
    select: feeSelect,
  });
};

export const updateFee = async (id: string, data: {
  name?: string;
  description?: string;
  amount?: number;
  dueDate?: string;
  active?: boolean;
  softDelete?: boolean;
}) => {
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.amount !== undefined) updateData.amount = data.amount;
  if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate);
  if (data.active !== undefined) updateData.active = data.active;
  if (data.softDelete !== undefined) {
    updateData.deletedAt = data.softDelete ? new Date() : null;
    if (data.softDelete) updateData.active = false;
  }
  return prisma.fee.update({ where: { id }, data: updateData, select: feeSelect });
};

export const deleteFee = async (id: string) => {
  return prisma.fee.update({
    where: { id },
    data: { deletedAt: new Date(), active: false },
    select: feeSelect,
  });
};

// ---- Payments ----
export const getDataTablePayments = async (
  params: ITDataTableFetchParams,
): Promise<ITDataTableResponse<any>> => {
  const { page = 1, limit = 10, filters } = params;
  const residentId = (filters as any)?.residentId;
  const feeId = (filters as any)?.feeId;
  const status = (filters as any)?.status;

  const where: any = { deletedAt: null };
  if (residentId) where.residentId = residentId;
  if (feeId) where.feeId = feeId;
  if (status) where.status = status as PaymentStatus;

  const [rows, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: paymentSelect,
    }),
    prisma.payment.count({ where }),
  ]);

  return { rows, total };
};

export const getPaymentById = async (id: string) => {
  return prisma.payment.findFirst({ where: { id, deletedAt: null }, select: paymentSelect });
};

export const createPayment = async (data: {
  residentId: string;
  feeId: string;
  amount: number;
  reference?: string;
  status?: PaymentStatus;
  paidAt?: string;
}) => {
  const payment = await prisma.$transaction(async (tx) => {
    const p = await tx.payment.create({
      data: {
        residentId: data.residentId,
        feeId: data.feeId,
        amount: data.amount,
        reference: data.reference || null,
        status: (data.status as PaymentStatus) || PaymentStatus.PENDING,
        paidAt: data.paidAt ? new Date(data.paidAt) : null,
      },
      select: paymentSelect,
    });

    await tx.paymentLog.create({
      data: {
        paymentId: p.id,
        residentId: data.residentId,
        action: "CREATE",
        statusTo: p.status as PaymentStatus,
        amount: data.amount,
      },
    });

    return p;
  });

  return payment;
};

export const updatePayment = async (id: string, data: {
  status?: PaymentStatus;
  reference?: string;
  paidAt?: string;
  softDelete?: boolean;
}) => {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.payment.findUnique({ where: { id }, select: { status: true, residentId: true, amount: true } });

    const updateData: any = {};
    if (data.reference !== undefined) updateData.reference = data.reference;
    if (data.paidAt !== undefined) updateData.paidAt = new Date(data.paidAt);
    if (data.status !== undefined) updateData.status = data.status as PaymentStatus;
    if (data.softDelete !== undefined) {
      updateData.deletedAt = data.softDelete ? new Date() : null;
    }

    const updated = await tx.payment.update({ where: { id }, data: updateData, select: paymentSelect });

    if (data.status && existing) {
      await tx.paymentLog.create({
        data: {
          paymentId: id,
          residentId: existing.residentId,
          action: "STATUS_CHANGE",
          statusFrom: existing.status as PaymentStatus,
          statusTo: data.status as PaymentStatus,
          amount: Number(existing.amount),
        },
      });
    }

    return updated;
  });
};

export const deletePayment = async (id: string) => {
  return prisma.payment.update({
    where: { id },
    data: { deletedAt: new Date() },
    select: paymentSelect,
  });
};
