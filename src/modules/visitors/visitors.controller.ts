import { Request, Response } from "express";
import { asyncHandler } from "@src/core/utils/asyncHandler";
import { createTResult } from "@src/core/mappers/tresult.mapper";
import { createAuditLog } from "../audit/audit.service";
import * as visitorsService from "./visitors.service";

export const getDataTable = asyncHandler(async (req: Request, res: Response) => {
  const result = await visitorsService.getDataTableVisitors(req.body);
  return res.status(200).json(createTResult(result));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await visitorsService.getVisitorById(id);
  return res.status(200).json(createTResult(result));
});

export const addVisitor = asyncHandler(async (req: Request, res: Response) => {
  const result = await visitorsService.createVisitor(req.body);

  await createAuditLog({
    userId: res.locals.user?.id || "SYSTEM",
    module: "VISITORS",
    action: "CREATE",
    resourceId: result.id,
    details: { name: result.name },
  });

  return res.status(201).json(createTResult(result));
});

export const putVisitor = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await visitorsService.updateVisitor(id, req.body);

  await createAuditLog({
    userId: res.locals.user?.id || "SYSTEM",
    module: "VISITORS",
    action: "UPDATE",
    resourceId: id,
    details: req.body,
  });

  return res.status(200).json(createTResult(result));
});

export const removeVisitor = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await visitorsService.deleteVisitor(id);

  await createAuditLog({
    userId: res.locals.user?.id || "SYSTEM",
    module: "VISITORS",
    action: "DELETE",
    resourceId: id,
  });

  return res.status(200).json(createTResult(result));
});
