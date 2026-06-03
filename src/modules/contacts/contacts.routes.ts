import { Router } from "express";
import {
  getDataTable,
  getById,
  addContact,
  putContact,
  removeContact,
} from "./contacts.controller";
import { authenticate } from "../common/middlewares/auth.middleware";
import { validate } from "../../core/middlewares/validate.middleware";
import {
  CreateContactSchema,
  UpdateContactSchema,
  ContactIdParamSchema,
} from "./schemas/contacts.schema";
import { DataTableFetchParamsSchema } from "../../core/dto/datatable.schema";

const router = Router();

router.use(authenticate);

router.post("/datatable", validate(DataTableFetchParamsSchema), getDataTable);
router.get("/:id", validate(ContactIdParamSchema), getById);
router.post("/", validate(CreateContactSchema), addContact);
router.put("/:id", validate(UpdateContactSchema), putContact);
router.delete("/:id", validate(ContactIdParamSchema), removeContact);

export default router;
