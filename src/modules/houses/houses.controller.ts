import { Request, Response } from "express";
import { asyncHandler } from "@src/core/utils/asyncHandler";
import { createTResult } from "@src/core/mappers/tresult.mapper";
import { createAuditLog } from "../audit/audit.service";
import * as housesService from "./houses.service";

export const getDataTable = asyncHandler(async (req: Request, res: Response) => {
  const result = await housesService.getDataTableHouses(req.body);
  return res.status(200).json(createTResult(result));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await housesService.getHouseById(id);
  return res.status(200).json(createTResult(result));
});

export const addHouse = asyncHandler(async (req: Request, res: Response) => {
  const result = await housesService.createHouse(req.body);

  await createAuditLog({
    userId: res.locals.user?.id || "SYSTEM",
    module: "HOUSES",
    action: "CREATE",
    resourceId: result.id,
    details: { number: result.number, street: result.street },
  });

  return res.status(201).json(createTResult(result));
});

export const putHouse = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await housesService.updateHouse(id, req.body);

  await createAuditLog({
    userId: res.locals.user?.id || "SYSTEM",
    module: "HOUSES",
    action: "UPDATE",
    resourceId: id,
    details: req.body,
  });

  return res.status(200).json(createTResult(result));
});

export const removeHouse = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await housesService.deleteHouse(id);

  await createAuditLog({
    userId: res.locals.user?.id || "SYSTEM",
    module: "HOUSES",
    action: "DELETE",
    resourceId: id,
  });

  return res.status(200).json(createTResult(result));
});
