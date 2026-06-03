import { Request, Response } from "express";
import { asyncHandler } from "@src/core/utils/asyncHandler";
import { createTResult } from "@src/core/mappers/tresult.mapper";
import { createAuditLog } from "../audit/audit.service";
import * as paymentsService from "./payments.service";
import { prismaClient as prisma } from "@src/core/config/database";

export const checkoutPayment = asyncHandler(async (req: Request, res: Response) => {
  const paymentId = req.params.id;
  return res.status(200).json(createTResult(await paymentsService.checkoutPayment(paymentId)));
});

// ---- Fees ----
export const getFees = asyncHandler(async (_req: Request, res: Response) => {
  return res.status(200).json(createTResult(await paymentsService.getAllFees()));
});

export const getFeeById = asyncHandler(async (req: Request, res: Response) => {
  return res.status(200).json(createTResult(await paymentsService.getFeeById(req.params.id)));
});

export const addFee = asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentsService.createFee(req.body);
  await createAuditLog({ userId: res.locals.user?.id || "SYSTEM", module: "FEES", action: "CREATE", resourceId: result.id, details: { name: result.name } });
  return res.status(201).json(createTResult(result));
});

export const putFee = asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentsService.updateFee(req.params.id, req.body);
  await createAuditLog({ userId: res.locals.user?.id || "SYSTEM", module: "FEES", action: "UPDATE", resourceId: req.params.id, details: req.body });
  return res.status(200).json(createTResult(result));
});

export const removeFee = asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentsService.deleteFee(req.params.id);
  await createAuditLog({ userId: res.locals.user?.id || "SYSTEM", module: "FEES", action: "DELETE", resourceId: req.params.id });
  return res.status(200).json(createTResult(result));
});

// ---- Payments ----
export const getSummary = asyncHandler(async (_req: Request, res: Response) => {
  let residentId: string | undefined;
  if (res.locals.user?.role === "RESDN") {
    const resident = await prisma.resident.findFirst({
      where: { userId: res.locals.user.id, deletedAt: null }
    });
    residentId = resident?.id;
  }
  return res.status(200).json(createTResult(await paymentsService.getPaymentSummary(residentId)));
});

export const getDataTable = asyncHandler(async (req: Request, res: Response) => {
  let params = req.body;
  if (res.locals.user?.role === "RESDN") {
    const resident = await prisma.resident.findFirst({
      where: { userId: res.locals.user.id, deletedAt: null }
    });
    if (resident) {
      params = {
        ...params,
        filters: {
          ...params.filters,
          residentId: resident.id
        }
      };
    }
  }
  return res.status(200).json(createTResult(await paymentsService.getDataTablePayments(params)));
});

export const getDataTableFees = asyncHandler(async (req: Request, res: Response) => {
  return res.status(200).json(createTResult(await paymentsService.getDataTableFees(req.body)));
});

export const getPaymentById = asyncHandler(async (req: Request, res: Response) => {
  return res.status(200).json(createTResult(await paymentsService.getPaymentById(req.params.id)));
});

export const addPayment = asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentsService.createPayment(req.body);
  await createAuditLog({ userId: res.locals.user?.id || "SYSTEM", module: "PAYMENTS", action: "CREATE", resourceId: (result as any).id, details: { residentId: (result as any).residentId, feeId: (result as any).feeId } });
  return res.status(201).json(createTResult(result));
});

export const putPayment = asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentsService.updatePayment(req.params.id, req.body);
  await createAuditLog({ userId: res.locals.user?.id || "SYSTEM", module: "PAYMENTS", action: "UPDATE", resourceId: req.params.id, details: req.body });
  return res.status(200).json(createTResult(result));
});

export const removePayment = asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentsService.deletePayment(req.params.id);
  await createAuditLog({ userId: res.locals.user?.id || "SYSTEM", module: "PAYMENTS", action: "DELETE", resourceId: req.params.id });
  return res.status(200).json(createTResult(result));
});

// ---- Stripe Subscriptions ----
export const getPlans = asyncHandler(async (_req: Request, res: Response) => {
  return res.status(200).json(createTResult(await paymentsService.getAllPlans()));
});

export const checkoutSubscription = asyncHandler(async (req: Request, res: Response) => {
  const residentId = req.body.residentId;
  const planId = req.body.planId;
  if (!residentId || !planId) return res.status(400).json({ error: "Missing residentId or planId" });
  return res.status(200).json(createTResult(await paymentsService.checkoutSubscription(residentId, planId)));
});

// ---- Resident Fees (Assignments) ----
export const getResidentFees = asyncHandler(async (req: Request, res: Response) => {
  const residentId = req.query.residentId as string | undefined;
  return res.status(200).json(createTResult(await paymentsService.getResidentFees(residentId)));
});

export const getDataTableResidentFees = asyncHandler(async (req: Request, res: Response) => {
  return res.status(200).json(createTResult(await paymentsService.getDataTableResidentFees(req.body)));
});

export const addResidentFee = asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentsService.createResidentFee(req.body);
  await createAuditLog({ userId: res.locals.user?.id || "SYSTEM", module: "FEES", action: "ASSIGN", resourceId: result.id, details: { residentId: result.residentId, feeId: result.feeId } });
  return res.status(201).json(createTResult(result));
});

export const bulkAssignResidentFees = asyncHandler(async (req: Request, res: Response) => {
  const results = await paymentsService.bulkAssignResidentFees(req.body);
  await createAuditLog({ userId: res.locals.user?.id || "SYSTEM", module: "FEES", action: "BULK_ASSIGN", resourceId: "bulk", details: { count: results.length, feeId: req.body.feeId } });
  return res.status(201).json(createTResult(results));
});

export const removeResidentFee = asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentsService.deleteResidentFee(req.params.id);
  await createAuditLog({ userId: res.locals.user?.id || "SYSTEM", module: "FEES", action: "UNASSIGN", resourceId: req.params.id });
  return res.status(200).json(createTResult(result));
});
