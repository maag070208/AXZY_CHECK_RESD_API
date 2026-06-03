import { Router } from "express";
import {
  getFees, getFeeById, addFee, putFee, removeFee, getDataTableFees,
  getDataTable, getPaymentById, addPayment, putPayment, removePayment,
  getPlans, checkoutSubscription, checkoutPayment, getSummary,
  getResidentFees, getDataTableResidentFees, addResidentFee, bulkAssignResidentFees, removeResidentFee,
} from "./payments.controller";
import { authenticate } from "../common/middlewares/auth.middleware";
import { validate } from "../../core/middlewares/validate.middleware";
import {
  CreateFeeSchema, UpdateFeeSchema, FeeIdParamSchema,
  CreatePaymentSchema, UpdatePaymentSchema, PaymentIdParamSchema,
  CreateResidentFeeSchema, BulkAssignResidentFeeSchema, ResidentFeeIdParamSchema, ResidentFeesQuerySchema,
} from "./schemas/payments.schema";
import { DataTableFetchParamsSchema } from "../../core/dto/datatable.schema";

const router = Router();

router.use(authenticate);

// Fees sub-routes
router.get("/fees", getFees);
router.post("/fees/datatable", validate(DataTableFetchParamsSchema), getDataTableFees);
router.get("/fees/:id", validate(FeeIdParamSchema), getFeeById);
router.post("/fees", validate(CreateFeeSchema), addFee);
router.put("/fees/:id", validate(UpdateFeeSchema), putFee);
router.delete("/fees/:id", validate(FeeIdParamSchema), removeFee);

// Resident Fee Assignments
router.get("/resident-fees", validate(ResidentFeesQuerySchema), getResidentFees);
router.post("/resident-fees/datatable", validate(DataTableFetchParamsSchema), getDataTableResidentFees);
router.post("/resident-fees", validate(CreateResidentFeeSchema), addResidentFee);
router.post("/resident-fees/bulk", validate(BulkAssignResidentFeeSchema), bulkAssignResidentFees);
router.delete("/resident-fees/:id", validate(ResidentFeeIdParamSchema), removeResidentFee);

// Stripe Subscriptions
router.get("/subscriptions/plans", getPlans);
router.post("/subscriptions/checkout", checkoutSubscription);

// Payments
router.get("/summary", getSummary);
router.post("/datatable", validate(DataTableFetchParamsSchema), getDataTable);
router.post("/", validate(CreatePaymentSchema), addPayment);
router.get("/:id", validate(PaymentIdParamSchema), getPaymentById);
router.put("/:id", validate(UpdatePaymentSchema), putPayment);
router.post("/:id/checkout", validate(PaymentIdParamSchema), checkoutPayment);
router.delete("/:id", validate(PaymentIdParamSchema), removePayment);

export default router;
