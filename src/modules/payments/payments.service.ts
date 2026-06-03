import { prismaClient as prisma } from "@src/core/config/database";
import { PaymentStatus } from "@prisma/client";
import {
  ITDataTableFetchParams,
  ITDataTableResponse,
} from "@src/core/dto/datatable.dto";
import { env } from "@src/core/config/env.config";
import { stripeService } from "./stripe.service";
import dayjs from "dayjs";

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

const getNextPeriodNameAndDueDate = (name: string, dueDate: Date): { nextName: string; nextDueDate: Date } => {
  const spanishMonths = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  
  for (let i = 0; i < spanishMonths.length; i++) {
    const month = spanishMonths[i];
    const regex = new RegExp(`\\b${month}\\b`, "i");
    if (regex.test(name)) {
      const yearRegex = /\b(20\d{2})\b/;
      const matchYear = name.match(yearRegex);
      let year = matchYear ? parseInt(matchYear[1]) : dayjs(dueDate).year();
      
      let nextMonthIdx = i + 1;
      let nextYear = year;
      if (nextMonthIdx >= 12) {
        nextMonthIdx = 0;
        nextYear += 1;
      }
      
      const nextMonthName = spanishMonths[nextMonthIdx];
      let nextName = name.replace(regex, nextMonthName);
      if (matchYear) {
        nextName = nextName.replace(yearRegex, String(nextYear));
      }
      
      const nextDueDate = dayjs(dueDate).add(1, "month").toDate();
      return { nextName, nextDueDate };
    }
  }

  const numRegex = /(mes[\s:-]+)?(\d+)/i;
  const matchNum = name.match(numRegex);
  if (matchNum) {
    const currentNum = parseInt(matchNum[2]);
    const nextNum = currentNum + 1;
    const digitIndex = matchNum.index! + (matchNum[1] ? matchNum[1].length : 0);
    const nextName = name.substring(0, digitIndex) + nextNum + name.substring(digitIndex + matchNum[2].length);
    const nextDueDate = dayjs(dueDate).add(1, "month").toDate();
    return { nextName, nextDueDate };
  }

  // 3. Fallback: append next month name and year based on the next due date
  const nextDate = dayjs(dueDate).add(1, "month");
  const nextMonthName = spanishMonths[nextDate.month()];
  const nextYear = nextDate.year();
  return { nextName: `${name} - ${nextMonthName} ${nextYear}`, nextDueDate: nextDate.toDate() };
};

export const handleRecurringPayment = async (tx: any, residentId: string, feeId: string) => {
  const currentFee = await tx.fee.findUnique({
    where: { id: feeId },
  });
  if (!currentFee || currentFee.type !== "MONTHLY") return;

  const { nextName, nextDueDate } = getNextPeriodNameAndDueDate(currentFee.name, currentFee.dueDate);

  // Find or create next Fee definition
  let nextFee = await tx.fee.findFirst({
    where: {
      name: nextName,
      active: true,
      deletedAt: null,
    },
  });

  if (!nextFee) {
    nextFee = await tx.fee.create({
      data: {
        name: nextName,
        description: currentFee.description,
        amount: currentFee.amount,
        type: "MONTHLY",
        dueDate: nextDueDate,
        active: true,
      },
    });
  }

  // Check if resident already has payment for next fee
  const existingNextPayment = await tx.payment.findFirst({
    where: {
      residentId,
      feeId: nextFee.id,
      deletedAt: null,
    },
  });

  if (!existingNextPayment) {
    const p = await tx.payment.create({
      data: {
        residentId,
        feeId: nextFee.id,
        amount: currentFee.amount,
        status: "PENDING",
      },
      select: { id: true, amount: true, status: true },
    });

    await tx.paymentLog.create({
      data: {
        paymentId: p.id,
        residentId,
        action: "CREATE",
        statusTo: "PENDING",
        amount: p.amount,
        notes: "Autogenerado por pago de período anterior",
      },
    });
  }
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
  return prisma.fee.findFirst({
    where: { id, deletedAt: null },
    select: feeSelect,
  });
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

export const updateFee = async (
  id: string,
  data: {
    name?: string;
    description?: string;
    amount?: number;
    dueDate?: string;
    active?: boolean;
    softDelete?: boolean;
  },
) => {
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
  return prisma.fee.update({
    where: { id },
    data: updateData,
    select: feeSelect,
  });
};

export const deleteFee = async (id: string) => {
  return prisma.fee.update({
    where: { id },
    data: { deletedAt: new Date(), active: false },
    select: feeSelect,
  });
};

// ---- Payments ----
export const getDataTableFees = async (
  params: ITDataTableFetchParams,
): Promise<ITDataTableResponse<any>> => {
  const { page = 1, limit = 10, filters } = params;
  const searchTerm = (filters as any)?.search;

  const where: any = { deletedAt: null, active: true };
  if (searchTerm) {
    where.name = { contains: searchTerm, mode: "insensitive" };
  }

  const [rows, total] = await Promise.all([
    prisma.fee.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { dueDate: "asc" },
      select: feeSelect,
    }),
    prisma.fee.count({ where }),
  ]);

  return { rows, total };
};

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
  return prisma.payment.findFirst({
    where: { id, deletedAt: null },
    select: paymentSelect,
  });
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

    if (p.status === PaymentStatus.PAID) {
      await handleRecurringPayment(tx, data.residentId, data.feeId);
    }

    return p;
  });

  return payment;
};

export const updatePayment = async (
  id: string,
  data: {
    status?: PaymentStatus;
    reference?: string;
    paidAt?: string;
    softDelete?: boolean;
  },
) => {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.payment.findUnique({
      where: { id },
      select: { status: true, residentId: true, amount: true, feeId: true },
    });

    const updateData: any = {};
    if (data.reference !== undefined) updateData.reference = data.reference;
    if (data.paidAt !== undefined) updateData.paidAt = new Date(data.paidAt);
    if (data.status !== undefined)
      updateData.status = data.status as PaymentStatus;
    if (data.softDelete !== undefined) {
      updateData.deletedAt = data.softDelete ? new Date() : null;
    }

    const updated = await tx.payment.update({
      where: { id },
      data: updateData,
      select: paymentSelect,
    });

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

      if (data.status === PaymentStatus.PAID) {
        await handleRecurringPayment(tx, existing.residentId, existing.feeId);
      }
    }

    return updated;
  });
};

export const deletePayment = async (id: string) => {
  return prisma.payment.update({
    where: { id },
    data: { deletedAt: new Date(), status: "CANCELLED" },
    select: paymentSelect,
  });
};

export const getPaymentSummary = async (residentId?: string) => {
  const wherePending: any = { status: "PENDING", deletedAt: null };
  const wherePaid: any = { status: "PAID", deletedAt: null };
  if (residentId) {
    wherePending.residentId = residentId;
    wherePaid.residentId = residentId;
  }

  const pendingPayments = await prisma.payment.aggregate({
    where: wherePending,
    _sum: { amount: true },
    _count: true,
  });

  const paidPayments = await prisma.payment.aggregate({
    where: wherePaid,
    _sum: { amount: true },
    _count: true,
  });

  return {
    pending: {
      total: pendingPayments._sum.amount || 0,
      count: pendingPayments._count || 0,
    },
    paid: {
      total: paidPayments._sum.amount || 0,
      count: paidPayments._count || 0,
    },
  };
};

export const checkoutPayment = async (paymentId: string) => {
  const successUrl = `${env.SYSTEM_URL || "http://localhost:12345"}/#/payments?payment=success`;
  const cancelUrl = `${env.SYSTEM_URL || "http://localhost:12345"}/#/payments?payment=cancel`;

  const session = await stripeService.createPaymentCheckout(
    paymentId,
    successUrl,
    cancelUrl,
  );

  return { url: session.url };
};

// ---- Stripe Subscriptions ----
export const getAllPlans = async () => {
  return prisma.subscriptionPlan.findMany({
    where: { active: true, deletedAt: null },
    orderBy: { amount: "asc" },
  });
};

export const checkoutSubscription = async (
  residentId: string,
  planId: string,
) => {
  const successUrl = `${process.env.SYSTEM_URL || "http://localhost:12345"}/#/payments?checkout=success`;
  const cancelUrl = `${process.env.SYSTEM_URL || "http://localhost:12345"}/#/payments?checkout=cancelled`;
  const session = await stripeService.createSubscriptionCheckout(
    residentId,
    planId,
    successUrl,
    cancelUrl,
  );
  return { url: session.url };
};

// ---- Resident Fees (Assignments) ----
const residentFeeSelect = {
  id: true,
  residentId: true,
  feeId: true,
  active: true,
  startDate: true,
  endDate: true,
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
  fee: { select: { id: true, name: true, amount: true, type: true, dueDate: true } },
};

export const getResidentFees = async (residentId?: string) => {
  const where: any = { deletedAt: null, active: true };
  if (residentId) where.residentId = residentId;
  return prisma.residentFee.findMany({
    where,
    select: residentFeeSelect,
    orderBy: { startDate: "desc" },
  });
};

export const getDataTableResidentFees = async (
  params: ITDataTableFetchParams,
): Promise<ITDataTableResponse<any>> => {
  const { page = 1, limit = 10, filters } = params;
  const residentId = (filters as any)?.residentId;
  const feeId = (filters as any)?.feeId;
  const searchTerm = (filters as any)?.search;

  const where: any = { deletedAt: null };
  if (residentId) where.residentId = residentId;
  if (feeId) where.feeId = feeId;
  if (searchTerm) {
    where.OR = [
      { resident: { user: { name: { contains: searchTerm, mode: "insensitive" } } } },
      { fee: { name: { contains: searchTerm, mode: "insensitive" } } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.residentFee.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { startDate: "desc" },
      select: residentFeeSelect,
    }),
    prisma.residentFee.count({ where }),
  ]);

  return { rows, total };
};

export const getResidentFeeById = async (id: string) => {
  return prisma.residentFee.findFirst({
    where: { id, deletedAt: null },
    select: residentFeeSelect,
  });
};

export const createResidentFee = async (data: {
  residentId: string;
  feeId: string;
  startDate?: string;
}) => {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.residentFee.findFirst({
      where: {
        residentId: data.residentId,
        feeId: data.feeId,
        deletedAt: null,
      },
    });

    if (existing) {
      if (!existing.active) {
        return tx.residentFee.update({
          where: { id: existing.id },
          data: { active: true, deletedAt: null, endDate: null, startDate: data.startDate ? new Date(data.startDate) : new Date() },
          select: residentFeeSelect,
        });
      }
      return existing;
    }

    const r = await tx.residentFee.create({
      data: {
        residentId: data.residentId,
        feeId: data.feeId,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
      },
      select: residentFeeSelect,
    });

    const fee = await tx.fee.findUnique({ where: { id: data.feeId } });
    if (fee && fee.type === "MONTHLY") {
      const existingPayment = await tx.payment.findFirst({
        where: {
          residentId: data.residentId,
          feeId: data.feeId,
          deletedAt: null,
        },
      });
      if (!existingPayment) {
        const p = await tx.payment.create({
          data: {
            residentId: data.residentId,
            feeId: data.feeId,
            amount: fee.amount,
            status: "PENDING",
          },
          select: { id: true, amount: true, status: true },
        });
        await tx.paymentLog.create({
          data: {
            paymentId: p.id,
            residentId: data.residentId,
            action: "CREATE",
            statusTo: "PENDING",
            amount: p.amount,
            notes: "Autogenerado por asignación de cuota",
          },
        });
      }
    }

    return r;
  });
};

export const bulkAssignResidentFees = async (data: {
  residentIds: string[];
  feeId: string;
  startDate?: string;
}) => {
  const results: any[] = [];
  for (const residentId of data.residentIds) {
    const result = await createResidentFee({
      residentId,
      feeId: data.feeId,
      startDate: data.startDate,
    });
    results.push(result);
  }
  return results;
};

export const deleteResidentFee = async (id: string) => {
  return prisma.residentFee.update({
    where: { id },
    data: { deletedAt: new Date(), active: false },
    select: residentFeeSelect,
  });
};
