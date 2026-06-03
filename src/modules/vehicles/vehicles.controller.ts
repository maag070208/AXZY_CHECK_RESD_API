import { Request, Response } from "express";
import { asyncHandler } from "@src/core/utils/asyncHandler";
import { createTResult } from "@src/core/mappers/tresult.mapper";
import { createAuditLog } from "../audit/audit.service";
import * as vehiclesService from "./vehicles.service";

export const getDataTable = asyncHandler(async (req: Request, res: Response) => {
  const result = await vehiclesService.getDataTableVehicles(req.body);
  return res.status(200).json(createTResult(result));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await vehiclesService.getVehicleById(id);
  return res.status(200).json(createTResult(result));
});

export const addVehicle = asyncHandler(async (req: Request, res: Response) => {
  const result = await vehiclesService.createVehicle(req.body);

  await createAuditLog({
    userId: res.locals.user?.id || "SYSTEM",
    module: "VEHICLES",
    action: "CREATE",
    resourceId: result.id,
    details: { plate: result.plate, houseId: result.houseId },
  });

  return res.status(201).json(createTResult(result));
});

export const putVehicle = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await vehiclesService.updateVehicle(id, req.body);

  await createAuditLog({
    userId: res.locals.user?.id || "SYSTEM",
    module: "VEHICLES",
    action: "UPDATE",
    resourceId: id,
    details: req.body,
  });

  return res.status(200).json(createTResult(result));
});

export const removeVehicle = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await vehiclesService.deleteVehicle(id);

  await createAuditLog({
    userId: res.locals.user?.id || "SYSTEM",
    module: "VEHICLES",
    action: "DELETE",
    resourceId: id,
  });

  return res.status(200).json(createTResult(result));
});
