import { Request, Response } from "express";
import { asyncHandler } from "@src/core/utils/asyncHandler";
import { createTResult } from "@src/core/mappers/tresult.mapper";
import { createAuditLog } from "../audit/audit.service";
import * as accessLogsService from "./access-logs.service";

export const getDataTable = asyncHandler(async (req: Request, res: Response) => {
  const result = await accessLogsService.getDataTableAccessLogs(req.body);
  return res.status(200).json(createTResult(result));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await accessLogsService.getAccessLogById(id);
  return res.status(200).json(createTResult(result));
});

export const addAccessLog = asyncHandler(async (req: Request, res: Response) => {
  const result = await accessLogsService.createAccessLog(req.body);

  await createAuditLog({
    userId: res.locals.user?.id || "SYSTEM",
    module: "ACCESS_LOGS",
    action: "CREATE",
    resourceId: result.id,
    details: { accessId: result.accessId, guardId: result.guardId },
  });

  return res.status(201).json(createTResult(result));
});

export const putAccessLog = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await accessLogsService.updateAccessLog(id, req.body);

  await createAuditLog({
    userId: res.locals.user?.id || "SYSTEM",
    module: "ACCESS_LOGS",
    action: "UPDATE",
    resourceId: id,
    details: req.body,
  });

  return res.status(200).json(createTResult(result));
});
