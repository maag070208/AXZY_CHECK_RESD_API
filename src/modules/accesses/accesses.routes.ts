import { Router } from "express";
import { getDataTable, getById, addAccess, putAccess, removeAccess } from "./accesses.controller";
import { authenticate } from "../common/middlewares/auth.middleware";
import { validate } from "../../core/middlewares/validate.middleware";
import { CreateAccessSchema, UpdateAccessSchema, AccessIdParamSchema } from "./schemas/accesses.schema";
import { DataTableFetchParamsSchema } from "../../core/dto/datatable.schema";

const router = Router();

router.use(authenticate);

router.post("/datatable", validate(DataTableFetchParamsSchema), getDataTable);
router.get("/:id", validate(AccessIdParamSchema), getById);
router.post("/", validate(CreateAccessSchema), addAccess);
router.put("/:id", validate(UpdateAccessSchema), putAccess);
router.delete("/:id", validate(AccessIdParamSchema), removeAccess);

export default router;
