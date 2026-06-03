import { Request, Response } from "express";
import { asyncHandler } from "@src/core/utils/asyncHandler";
import { createTResult } from "@src/core/mappers/tresult.mapper";
import { createAuditLog } from "../audit/audit.service";
import * as paymentsService from "./payments.service";

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
export const getDataTable = asyncHandler(async (req: Request, res: Response) => {
  return res.status(200).json(createTResult(await paymentsService.getDataTablePayments(req.body)));
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
