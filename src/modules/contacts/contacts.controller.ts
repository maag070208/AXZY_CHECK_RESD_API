import { Request, Response } from "express";
import { asyncHandler } from "@src/core/utils/asyncHandler";
import { createTResult } from "@src/core/mappers/tresult.mapper";
import { createAuditLog } from "../audit/audit.service";
import * as contactsService from "./contacts.service";

export const getDataTable = asyncHandler(async (req: Request, res: Response) => {
  const result = await contactsService.getDataTableContacts(req.body);
  return res.status(200).json(createTResult(result));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await contactsService.getContactById(id);
  return res.status(200).json(createTResult(result));
});

export const addContact = asyncHandler(async (req: Request, res: Response) => {
  const result = await contactsService.createContact(req.body);

  await createAuditLog({
    userId: res.locals.user?.id || "SYSTEM",
    module: "CONTACTS",
    action: "CREATE",
    resourceId: result.id,
    details: { residentId: result.residentId, name: result.name },
  });

  return res.status(201).json(createTResult(result));
});

export const putContact = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await contactsService.updateContact(id, req.body);

  await createAuditLog({
    userId: res.locals.user?.id || "SYSTEM",
    module: "CONTACTS",
    action: "UPDATE",
    resourceId: id,
    details: req.body,
  });

  return res.status(200).json(createTResult(result));
});

export const removeContact = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await contactsService.deleteContact(id);

  await createAuditLog({
    userId: res.locals.user?.id || "SYSTEM",
    module: "CONTACTS",
    action: "DELETE",
    resourceId: id,
  });

  return res.status(200).json(createTResult(result));
});
