import { Router } from "express";
import { getDataTable, getById, addVisitor, putVisitor, removeVisitor } from "./visitors.controller";
import { authenticate } from "../common/middlewares/auth.middleware";
import { validate } from "../../core/middlewares/validate.middleware";
import { CreateVisitorSchema, UpdateVisitorSchema, VisitorIdParamSchema } from "./schemas/visitors.schema";
import { DataTableFetchParamsSchema } from "../../core/dto/datatable.schema";

const router = Router();

router.use(authenticate);

router.post("/datatable", validate(DataTableFetchParamsSchema), getDataTable);
router.get("/:id", validate(VisitorIdParamSchema), getById);
router.post("/", validate(CreateVisitorSchema), addVisitor);
router.put("/:id", validate(UpdateVisitorSchema), putVisitor);
router.delete("/:id", validate(VisitorIdParamSchema), removeVisitor);

export default router;
