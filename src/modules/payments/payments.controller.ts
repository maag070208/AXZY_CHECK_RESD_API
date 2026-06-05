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
export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  let residentId: string | undefined;
  if (res.locals.user?.role === "RESDN") {
    const resident = await prisma.resident.findFirst({
      where: { userId: res.locals.user.id, deletedAt: null }
    });
    residentId = resident?.id;
  }
  const { from, to } = req.query as { from?: string; to?: string };
  return res.status(200).json(createTResult(await paymentsService.getPaymentSummary(residentId, from, to)));
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

export const downloadReceipt = asyncHandler(async (req: Request, res: Response) => {
  const pdfBuffer = await paymentsService.getReceiptPDF(req.params.id);
  if (!pdfBuffer) {
    return res.status(404).json(createTResult(null, ["Comprobante no encontrado"]));
  }
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="comprobante_${req.params.id.slice(0, 8)}.pdf"`);
  return res.send(pdfBuffer);
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

// ---- Resident Fees (Assignments) ----
export const getResidentFees = asyncHandler(async (req: Request, res: Response) => {
  const residentId = req.query.residentId as string | undefined;
  const feeId = req.query.feeId as string | undefined;
  return res.status(200).json(createTResult(await paymentsService.getResidentFees(residentId, feeId)));
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

export const bulkUnassignResidentFees = asyncHandler(async (req: Request, res: Response) => {
  const results = await paymentsService.bulkUnassignResidentFees(req.body);
  await createAuditLog({ userId: res.locals.user?.id || "SYSTEM", module: "FEES", action: "BULK_UNASSIGN", resourceId: "bulk", details: { count: results.length, feeId: req.body.feeId } });
  return res.status(200).json(createTResult(results));
});

export const removeResidentFee = asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentsService.deleteResidentFee(req.params.id);
  await createAuditLog({ userId: res.locals.user?.id || "SYSTEM", module: "FEES", action: "UNASSIGN", resourceId: req.params.id });
  return res.status(200).json(createTResult(result));
});
