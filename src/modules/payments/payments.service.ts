import { prismaClient as prisma } from "@src/core/config/database";
import { PaymentStatus } from "@prisma/client";
import {
  ITDataTableFetchParams,
  ITDataTableResponse,
} from "@src/core/dto/datatable.dto";
import { env } from "@src/core/config/env.config";
import { stripeService } from "./stripe.service";
import { generateReceiptFromPaymentData } from "./payments.receipt.service";
import { AppError } from "@src/core/errors/AppError";
import { logger } from "@src/core/utils/logger";
import { sendPaymentSuccessEmail } from "@src/core/utils/emailSender";
import { generateAndUploadReceipt } from "./payments.receipt.service";
import dayjs from "dayjs";

const feeSelect = {
  id: true,
  name: true,
  description: true,
  amount: true,
  type: true,
  dueDate: true,
  active: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
};

const getNextPeriod = (currentPeriod?: string | null): string => {
  const date = currentPeriod ? dayjs(currentPeriod, "YYYY-MM") : dayjs();
  return date.add(1, "month").format("YYYY-MM");
};

export const handleRecurringPayment = async (tx: any, residentId: string, feeId: string | null, currentPeriod?: string | null) => {
  if (!feeId) return;
  const currentFee = await tx.fee.findUnique({
    where: { id: feeId },
    select: { type: true, amount: true },
  });
  if (!currentFee || currentFee.type !== "MONTHLY") return;

  const nextPeriod = getNextPeriod(currentPeriod);

  const existing = await tx.payment.findFirst({
    where: { residentId, feeId, period: nextPeriod, deletedAt: null },
  });

  if (!existing) {
    const p = await tx.payment.create({
      data: {
        residentId,
        feeId,
        amount: currentFee.amount,
        status: "PENDING",
        period: nextPeriod,
      },
      select: { id: true, amount: true, status: true, period: true },
    });

    await tx.paymentLog.create({
      data: {
        paymentId: p.id,
        residentId,
        action: "CREATE",
        statusTo: "PENDING",
        amount: p.amount,
        notes: `Autogenerado - Período ${nextPeriod}`,
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
  period: true,
  paidAt: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  stripePaymentIntentId: true,
  stripeInvoiceId: true,
  s3ReceiptUrl: true,
  resident: {
    select: {
      id: true,
      email: true,
      phone: true,
      user: { select: { id: true, name: true, lastName: true } },
    },
  },
  fee: { select: { id: true, name: true, amount: true, type: true, dueDate: true } },
  paymentLogs: {
    take: 5,
    orderBy: { createdAt: "desc" as const },
    select: { action: true, statusFrom: true, statusTo: true, notes: true, createdAt: true },
  },
};

const paymentListSelect = {
  id: true,
  residentId: true,
  feeId: true,
  amount: true,
  reference: true,
  status: true,
  period: true,
  paidAt: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  stripePaymentIntentId: true,
  resident: {
    select: {
      id: true,
      email: true,
      phone: true,
      user: { select: { id: true, name: true, lastName: true } },
    },
  },
  fee: { select: { id: true, name: true, amount: true, type: true, dueDate: true } },
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
  type?: "ONE_TIME" | "MONTHLY";
  dueDate?: string;
  active?: boolean;
}) => {
  return prisma.fee.create({
    data: {
      name: data.name,
      description: data.description || null,
      amount: data.amount,
      type: data.type ?? "ONE_TIME",
      dueDate: data.dueDate
        ? new Date(data.dueDate)
        : data.type === "MONTHLY"
          ? dayjs().add(1, "month").startOf("month").toDate()
          : dayjs().add(30, "day").toDate(),
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
  const dateFrom = (filters as any)?.dateFrom;
  const dateTo = (filters as any)?.dateTo;
  const search = (filters as any)?.search;

  const where: any = { deletedAt: null };
  if (residentId) where.residentId = residentId;
  if (feeId) {
    if (feeId === "null") where.feeId = null;
    else if (feeId === "notnull") where.feeId = { not: null };
    else where.feeId = feeId;
  }
  if (status) where.status = status as PaymentStatus;
  if (dateFrom && dateTo) {
    where.period = {};
    where.period.gte = dayjs(dateFrom as string).format("YYYY-MM");
    where.period.lte = dayjs(dateTo as string).format("YYYY-MM");
  }
  if (search) {
    where.OR = [
      { resident: { user: { name: { contains: search as string, mode: "insensitive" } } } },
      { resident: { user: { lastName: { contains: search as string, mode: "insensitive" } } } },
      { fee: { name: { contains: search as string, mode: "insensitive" } } },
    ];
  }

  const orderBy: any = { createdAt: "desc" };

  const skip = (page - 1) * limit;
  const total = await prisma.payment.count({ where });
  const rows = await prisma.payment.findMany({
    where,
    select: paymentSelect,
    orderBy,
    skip,
    take: limit,
  });

  return { rows: rows as any[], total };
};

export const getPaymentById = async (id: string) => {
  return prisma.payment.findFirst({
    where: { id, deletedAt: null },
    select: paymentSelect,
  });
};

export const getReceiptPDF = async (id: string): Promise<Buffer | null> => {
  const payment = await prisma.payment.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      amount: true,
      status: true,
      paidAt: true,
      createdAt: true,
      stripePaymentIntentId: true,
      residentId: true,
      fee: { select: { name: true } },
      resident: {
        select: {
          phone: true,
          email: true,
          user: { select: { name: true, lastName: true } },
        },
      },
    },
  });
  if (!payment) return null;
  return generateReceiptFromPaymentData(payment, payment.resident);
};

export const createPayment = async (data: {
  residentId: string;
  feeId?: string;
  amount: number;
  reference?: string;
  concept?: string;
  status?: PaymentStatus;
  paidAt?: string;
  period?: string;
}) => {
  const payment = await prisma.$transaction(async (tx) => {
    let feeType: string | undefined;
    if (data.feeId) {
      const fee = await tx.fee.findUnique({
        where: { id: data.feeId },
        select: { type: true, name: true },
      });
      feeType = fee?.type;
    }

    const period = data.period || (feeType === "MONTHLY" ? dayjs().format("YYYY-MM") : null);

    const p = await tx.payment.create({
      data: {
        residentId: data.residentId,
        feeId: data.feeId || null,
        amount: data.amount,
        reference: data.reference || data.concept || null,
        status: (data.status as PaymentStatus) || PaymentStatus.PENDING,
        period,
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

    if (p.status === PaymentStatus.PAID && data.feeId && period) {
      await handleRecurringPayment(tx, data.residentId, data.feeId, period);
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
      select: { status: true, residentId: true, amount: true, feeId: true, period: true },
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
        await handleRecurringPayment(tx, existing.residentId, existing.feeId, existing.period);
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

export const getPaymentSummary = async (residentId?: string, from?: string, to?: string) => {
  const currentPeriod = dayjs().format("YYYY-MM");

  const wherePaid: any = { status: "PAID", deletedAt: null };
  const wherePending: any = { status: "PENDING", deletedAt: null, period: currentPeriod };
  const whereOverdue: any = { status: "PENDING", deletedAt: null, period: { lt: currentPeriod } };

  if (residentId) {
    wherePaid.residentId = residentId;
    wherePending.residentId = residentId;
    whereOverdue.residentId = residentId;
  }

  if (from && to) {
    const periodFrom = dayjs(from).format("YYYY-MM");
    const periodTo = dayjs(to).format("YYYY-MM");
    wherePaid.period = { gte: periodFrom, lte: periodTo };
    wherePending.period = { gte: periodFrom, lte: periodTo };
  }

  const [paidPayments, pendingPayments, overduePayments] = await Promise.all([
    prisma.payment.aggregate({ where: wherePaid, _sum: { amount: true }, _count: true }),
    prisma.payment.aggregate({ where: wherePending, _sum: { amount: true }, _count: true }),
    prisma.payment.aggregate({ where: whereOverdue, _sum: { amount: true }, _count: true }),
  ]);

  return {
    paid: {
      total: paidPayments._sum.amount || 0,
      count: paidPayments._count || 0,
    },
    pending: {
      total: pendingPayments._sum.amount || 0,
      count: pendingPayments._count || 0,
    },
    overdue: {
      total: overduePayments._sum.amount || 0,
      count: overduePayments._count || 0,
    },
  };
};

export const checkoutPayment = async (paymentId: string) => {
  const baseUrl = env.SYSTEM_URL || env.FRONTEND_URL || "http://localhost:12345";
  const successUrl = `${baseUrl}/#/payments/receipt/${paymentId}?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${baseUrl}/#/payments?payment=cancel`;

  const session = await stripeService.createPaymentCheckout(
    paymentId,
    successUrl,
    cancelUrl,
  );

  return { url: session.url, sessionId: session.id };
};

export const createPaymentIntent = async (paymentId: string) => {
  const result = await stripeService.createPaymentIntent(paymentId);

  await prisma.payment.update({
    where: { id: paymentId },
    data: { stripePaymentIntentId: result.paymentIntentId },
  });

  return result;
};

export const verifyPaymentIntent = async (paymentId: string) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { id: true, status: true, stripePaymentIntentId: true, residentId: true, feeId: true, amount: true, period: true, fee: { select: { name: true } } },
  });

  if (!payment) throw new AppError("Pago no encontrado", 404);

  if (payment.status === "PAID") {
    return await getPaymentById(paymentId);
  }

  if (!payment.stripePaymentIntentId) {
    return await getPaymentById(paymentId);
  }

  const intent = await stripeService.retrievePaymentIntent(payment.stripePaymentIntentId);
  if (!intent) {
    return await getPaymentById(paymentId);
  }

  const isPending = intent.status === "processing" || intent.status === "requires_payment_method";
  if (isPending) {
    return await getPaymentById(paymentId);
  }

  if (intent.status !== "succeeded") {
    if (intent.status === "canceled" || intent.status === "requires_payment_method") {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: "FAILED" },
      });
    }
    return await getPaymentById(paymentId);
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: "PAID",
        paidAt: new Date(),
      },
    });

    await tx.paymentLog.create({
      data: {
        paymentId,
        residentId: payment.residentId,
        action: "STATUS_CHANGE",
        statusFrom: payment.status,
        statusTo: "PAID",
        amount: payment.amount,
        notes: "Pagado vía Stripe SDK (verificación síncrona)",
      },
    });

    if (payment.feeId) {
      await handleRecurringPayment(tx, payment.residentId, payment.feeId, payment.period);
    }
  });

  logger.info(`Payment ${paymentId} verified via PaymentIntent ${payment.stripePaymentIntentId}`);

  prisma.resident.findUnique({
    where: { id: payment.residentId },
    select: { id: true, email: true, phone: true, user: { select: { name: true, lastName: true } } },
  }).then(async (residentFull) => {
    if (residentFull) {
      sendPaymentSuccessEmail(
        { amount: payment.amount, fee: null },
        { ...residentFull, name: residentFull.user?.name },
      );
    }
  }).catch((err) => logger.error("Error sending payment email:", err));

  return await getPaymentById(paymentId);
};

export const verifyPaymentSession = async (sessionId: string) => {
  const session = await stripeService.retrieveCheckoutSession(sessionId);

  if (!session) {
    throw new AppError("Sesión de Stripe no encontrada", 404);
  }

  const paymentId = session.metadata?.paymentId;
  if (!paymentId) {
    throw new AppError("La sesión no tiene paymentId en metadata", 400);
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { id: true, status: true, residentId: true, feeId: true, amount: true, period: true, createdAt: true, fee: { select: { name: true } } },
  });

  if (!payment) {
    throw new AppError("Pago no encontrado", 404);
  }

  if (payment.status === "PAID") {
    return await getPaymentById(paymentId);
  }

  if (session.payment_status !== "paid") {
    return await getPaymentById(paymentId);
  }

  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id;

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: "PAID",
        stripePaymentIntentId: paymentIntentId,
        paidAt: new Date(),
      },
    });

    await tx.paymentLog.create({
      data: {
        paymentId,
        residentId: payment.residentId,
        action: "STATUS_CHANGE",
        statusFrom: payment.status,
        statusTo: "PAID",
        amount: payment.amount,
        notes: "Pagado vía Stripe (verificación manual desde sesión)",
      },
    });

    if (payment.feeId) {
      await handleRecurringPayment(tx, payment.residentId, payment.feeId, payment.period);
    }
  });

  logger.info(`Payment ${paymentId} verified via session ${sessionId} (PI: ${paymentIntentId})`);

  prisma.resident.findUnique({
    where: { id: payment.residentId },
    select: { id: true, email: true, phone: true, user: { select: { name: true, lastName: true } } },
  }).then(async (residentFull) => {
    if (residentFull) {
      sendPaymentSuccessEmail(
        { amount: payment.amount, fee: null },
        { ...residentFull, name: residentFull.user?.name },
      );

      const receiptUrl = await generateAndUploadReceipt(
        { ...payment, stripePaymentIntentId: paymentIntentId ?? null, paidAt: new Date() },
        residentFull,
      );
      if (receiptUrl) {
        await prisma.payment.update({
          where: { id: paymentId },
          data: { s3ReceiptUrl: receiptUrl },
        });
        logger.info(`Receipt PDF uploaded for payment ${paymentId}: ${receiptUrl}`);
      }
    }
  }).catch((err) => logger.error("Error processing post-payment tasks:", err));

  return await getPaymentById(paymentId);
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

export const getResidentFees = async (residentId?: string, feeId?: string) => {
  const where: any = { deletedAt: null, active: true };
  if (residentId) where.residentId = residentId;
  if (feeId) where.feeId = feeId;
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
        const period = dayjs().format("YYYY-MM");
        const p = await tx.payment.create({
          data: {
            residentId: data.residentId,
            feeId: data.feeId,
            amount: fee.amount,
            status: "PENDING",
            period,
          },
          select: { id: true, amount: true, status: true, period: true },
        });
        await tx.paymentLog.create({
          data: {
            paymentId: p.id,
            residentId: data.residentId,
            action: "CREATE",
            statusTo: "PENDING",
            amount: p.amount,
            notes: `Autogenerado - Período ${period}`,
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

export const bulkUnassignResidentFees = async (data: {
  residentIds: string[];
  feeId: string;
}) => {
  const results: any[] = [];
  for (const residentId of data.residentIds) {
    const r = await prisma.residentFee.findFirst({
      where: { residentId: residentId, feeId: data.feeId, deletedAt: null, active: true },
    });
    if (r) {
      const result = await deleteResidentFee(r.id);
      results.push(result);
    }
  }
  return results;
};
