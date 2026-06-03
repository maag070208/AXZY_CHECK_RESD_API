import { Router } from "express";
import {
  getCategories, getCategoryById, addCategory, putCategory, removeCategory,
  getDataTable, getById, addComplaint, putComplaint, removeComplaint,
} from "./complaints.controller";
import { authenticate } from "../common/middlewares/auth.middleware";
import { validate } from "../../core/middlewares/validate.middleware";
import {
  CreateComplaintCategorySchema,
  UpdateComplaintCategorySchema,
  ComplaintCategoryIdParamSchema,
  CreateComplaintSchema,
  UpdateComplaintSchema,
  ComplaintIdParamSchema,
} from "./schemas/complaints.schema";
import { DataTableFetchParamsSchema } from "../../core/dto/datatable.schema";

const router = Router();

router.use(authenticate);

// Categories sub-routes
router.get("/categories", getCategories);
router.get("/categories/:id", validate(ComplaintCategoryIdParamSchema), getCategoryById);
router.post("/categories", validate(CreateComplaintCategorySchema), addCategory);
router.put("/categories/:id", validate(UpdateComplaintCategorySchema), putCategory);
router.delete("/categories/:id", validate(ComplaintCategoryIdParamSchema), removeCategory);

// Complaints
router.post("/datatable", validate(DataTableFetchParamsSchema), getDataTable);
router.get("/:id", validate(ComplaintIdParamSchema), getById);
router.post("/", validate(CreateComplaintSchema), addComplaint);
router.put("/:id", validate(UpdateComplaintSchema), putComplaint);
router.delete("/:id", validate(ComplaintIdParamSchema), removeComplaint);

export default router;
