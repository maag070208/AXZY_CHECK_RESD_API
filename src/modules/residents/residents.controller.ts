import { Request, Response } from "express";
import { asyncHandler } from "@src/core/utils/asyncHandler";
import { createTResult } from "@src/core/mappers/tresult.mapper";
import { createAuditLog } from "../audit/audit.service";
import * as residentsService from "./residents.service";

export const getDataTable = asyncHandler(async (req: Request, res: Response) => {
  const result = await residentsService.getDataTableResidents(req.body);
  return res.status(200).json(createTResult(result));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await residentsService.getResidentById(id);
  return res.status(200).json(createTResult(result));
});

export const addResident = asyncHandler(async (req: Request, res: Response) => {
  const result = await residentsService.createResident(req.body);

  await createAuditLog({
    userId: res.locals.user?.id || "SYSTEM",
    module: "RESIDENTS",
    action: "CREATE",
    resourceId: result.id,
    details: { userId: result.userId, houseId: result.houseId },
  });

  return res.status(201).json(createTResult(result));
});

export const putResident = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await residentsService.updateResident(id, req.body);

  await createAuditLog({
    userId: res.locals.user?.id || "SYSTEM",
    module: "RESIDENTS",
    action: "UPDATE",
    resourceId: id,
    details: req.body,
  });

  return res.status(200).json(createTResult(result));
});

export const removeResident = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await residentsService.deleteResident(id);

  await createAuditLog({
    userId: res.locals.user?.id || "SYSTEM",
    module: "RESIDENTS",
    action: "DELETE",
    resourceId: id,
  });

  return res.status(200).json(createTResult(result));
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const userId = res.locals.user?.id;
  const result = await residentsService.getResidentByUserId(userId);
  return res.status(200).json(createTResult(result));
});

