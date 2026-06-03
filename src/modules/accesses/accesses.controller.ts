import { Request, Response } from "express";
import { asyncHandler } from "@src/core/utils/asyncHandler";
import { createTResult } from "@src/core/mappers/tresult.mapper";
import { createAuditLog } from "../audit/audit.service";
import * as accessesService from "./accesses.service";
import { prismaClient as prisma } from "@src/core/config/database";

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
  const result = await accessesService.getDataTableAccesses(params);
  return res.status(200).json(createTResult(result));
});


export const getById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await accessesService.getAccessById(id);
  return res.status(200).json(createTResult(result));
});

export const addAccess = asyncHandler(async (req: Request, res: Response) => {
  const result = await accessesService.createAccess(req.body);

  await createAuditLog({
    userId: res.locals.user?.id || "SYSTEM",
    module: "ACCESSES",
    action: "CREATE",
    resourceId: result.id,
    details: { residentId: result.residentId, visitorId: result.visitorId, type: result.type },
  });

  return res.status(201).json(createTResult(result));
});

export const putAccess = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await accessesService.updateAccess(id, req.body);

  await createAuditLog({
    userId: res.locals.user?.id || "SYSTEM",
    module: "ACCESSES",
    action: "UPDATE",
    resourceId: id,
    details: req.body,
  });

  return res.status(200).json(createTResult(result));
});

export const removeAccess = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await accessesService.deleteAccess(id);

  await createAuditLog({
    userId: res.locals.user?.id || "SYSTEM",
    module: "ACCESSES",
    action: "DELETE",
    resourceId: id,
  });

  return res.status(200).json(createTResult(result));
});
