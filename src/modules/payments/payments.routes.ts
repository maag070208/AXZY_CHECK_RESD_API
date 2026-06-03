import { Router } from "express";
import {
  getFees, getFeeById, addFee, putFee, removeFee,
  getDataTable, getPaymentById, addPayment, putPayment, removePayment,
} from "./payments.controller";
import { authenticate } from "../common/middlewares/auth.middleware";
import { validate } from "../../core/middlewares/validate.middleware";
import {
  CreateFeeSchema, UpdateFeeSchema, FeeIdParamSchema,
  CreatePaymentSchema, UpdatePaymentSchema, PaymentIdParamSchema,
} from "./schemas/payments.schema";
import { DataTableFetchParamsSchema } from "../../core/dto/datatable.schema";

const router = Router();

router.use(authenticate);

// Fees sub-routes
router.get("/fees", getFees);
router.get("/fees/:id", validate(FeeIdParamSchema), getFeeById);
router.post("/fees", validate(CreateFeeSchema), addFee);
router.put("/fees/:id", validate(UpdateFeeSchema), putFee);
router.delete("/fees/:id", validate(FeeIdParamSchema), removeFee);

// Payments
router.post("/datatable", validate(DataTableFetchParamsSchema), getDataTable);
router.get("/:id", validate(PaymentIdParamSchema), getPaymentById);
router.post("/", validate(CreatePaymentSchema), addPayment);
router.put("/:id", validate(UpdatePaymentSchema), putPayment);
router.delete("/:id", validate(PaymentIdParamSchema), removePayment);

export default router;
