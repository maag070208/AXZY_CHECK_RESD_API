import { Request, Response } from "express";
import { asyncHandler } from "@src/core/utils/asyncHandler";
import { createTResult } from "@src/core/mappers/tresult.mapper";
import { createAuditLog } from "../audit/audit.service";
import * as complaintsService from "./complaints.service";
import { prismaClient as prisma } from "@src/core/config/database";
import { AppError } from "@src/core/errors/AppError";

// ---- Categories ----
export const getCategories = asyncHandler(async (_req: Request, res: Response) => {
  const result = await complaintsService.getAllCategories();
  return res.status(200).json(createTResult(result));
});

export const getCategoryById = asyncHandler(async (req: Request, res: Response) => {
  const result = await complaintsService.getCategoryById(req.params.id);
  return res.status(200).json(createTResult(result));
});

export const addCategory = asyncHandler(async (req: Request, res: Response) => {
  const result = await complaintsService.createCategory(req.body);
  await createAuditLog({
    userId: res.locals.user?.id || "SYSTEM",
    module: "COMPLAINT_CATEGORIES",
    action: "CREATE",
    resourceId: result.id,
    details: { name: result.name },
  });
  return res.status(201).json(createTResult(result));
});

export const putCategory = asyncHandler(async (req: Request, res: Response) => {
  const result = await complaintsService.updateCategory(req.params.id, req.body);
  await createAuditLog({
    userId: res.locals.user?.id || "SYSTEM",
    module: "COMPLAINT_CATEGORIES",
    action: "UPDATE",
    resourceId: req.params.id,
    details: req.body,
  });
  return res.status(200).json(createTResult(result));
});

export const removeCategory = asyncHandler(async (req: Request, res: Response) => {
  const result = await complaintsService.deleteCategory(req.params.id);
  await createAuditLog({
    userId: res.locals.user?.id || "SYSTEM",
    module: "COMPLAINT_CATEGORIES",
    action: "DELETE",
    resourceId: req.params.id,
  });
  return res.status(200).json(createTResult(result));
});

// ---- Complaints ----
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
  const result = await complaintsService.getDataTableComplaints(params);
  return res.status(200).json(createTResult(result));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const result = await complaintsService.getComplaintById(req.params.id);
  return res.status(200).json(createTResult(result));
});

export const addComplaint = asyncHandler(async (req: Request, res: Response) => {
  let body = req.body;
  if (res.locals.user?.role === "RESDN") {
    const resident = await prisma.resident.findFirst({
      where: { userId: res.locals.user.id, deletedAt: null }
    });
    if (!resident) {
      throw new AppError("No se encontró el perfil de residente", 400);
    }
    body = { ...body, residentId: resident.id };
  }
  const result = await complaintsService.createComplaint(body);
  await createAuditLog({
    userId: res.locals.user?.id || "SYSTEM",
    module: "COMPLAINTS",
    action: "CREATE",
    resourceId: result.id,
    details: { title: result.title, residentId: result.residentId },
  });
  return res.status(201).json(createTResult(result));
});


export const putComplaint = asyncHandler(async (req: Request, res: Response) => {
  const result = await complaintsService.updateComplaint(req.params.id, req.body);
  await createAuditLog({
    userId: res.locals.user?.id || "SYSTEM",
    module: "COMPLAINTS",
    action: "UPDATE",
    resourceId: req.params.id,
    details: req.body,
  });
  return res.status(200).json(createTResult(result));
});

export const removeComplaint = asyncHandler(async (req: Request, res: Response) => {
  const result = await complaintsService.deleteComplaint(req.params.id);
  await createAuditLog({
    userId: res.locals.user?.id || "SYSTEM",
    module: "COMPLAINTS",
    action: "DELETE",
    resourceId: req.params.id,
  });
  return res.status(200).json(createTResult(result));
});
