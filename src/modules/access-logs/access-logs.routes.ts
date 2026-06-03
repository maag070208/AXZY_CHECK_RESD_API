import { Router } from "express";
import { getDataTable, getById, addAccessLog, putAccessLog } from "./access-logs.controller";
import { authenticate } from "../common/middlewares/auth.middleware";
import { validate } from "../../core/middlewares/validate.middleware";
import { CreateAccessLogSchema, UpdateAccessLogSchema, AccessLogIdParamSchema } from "./schemas/access-logs.schema";
import { DataTableFetchParamsSchema } from "../../core/dto/datatable.schema";

const router = Router();

router.use(authenticate);

router.post("/datatable", validate(DataTableFetchParamsSchema), getDataTable);
router.get("/:id", validate(AccessLogIdParamSchema), getById);
router.post("/", validate(CreateAccessLogSchema), addAccessLog);
router.put("/:id", validate(UpdateAccessLogSchema), putAccessLog);

export default router;
