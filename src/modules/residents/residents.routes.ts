import { Router } from "express";
import {
  getDataTable,
  getById,
  addResident,
  putResident,
  removeResident,
} from "./residents.controller";
import { authenticate } from "../common/middlewares/auth.middleware";
import { validate } from "../../core/middlewares/validate.middleware";
import {
  CreateResidentSchema,
  UpdateResidentSchema,
  ResidentIdParamSchema,
} from "./schemas/residents.schema";
import { DataTableFetchParamsSchema } from "../../core/dto/datatable.schema";

const router = Router();

router.use(authenticate);

router.post("/datatable", validate(DataTableFetchParamsSchema), getDataTable);
router.get("/:id", validate(ResidentIdParamSchema), getById);
router.post("/", validate(CreateResidentSchema), addResident);
router.put("/:id", validate(UpdateResidentSchema), putResident);
router.delete("/:id", validate(ResidentIdParamSchema), removeResident);

export default router;
