import { Router } from "express";
import { getDataTable, getById, addVehicle, putVehicle, removeVehicle } from "./vehicles.controller";
import { authenticate } from "../common/middlewares/auth.middleware";
import { validate } from "../../core/middlewares/validate.middleware";
import { CreateVehicleSchema, UpdateVehicleSchema, VehicleIdParamSchema } from "./schemas/vehicles.schema";
import { DataTableFetchParamsSchema } from "../../core/dto/datatable.schema";

const router = Router();

router.use(authenticate);

router.post("/datatable", validate(DataTableFetchParamsSchema), getDataTable);
router.get("/:id", validate(VehicleIdParamSchema), getById);
router.post("/", validate(CreateVehicleSchema), addVehicle);
router.put("/:id", validate(UpdateVehicleSchema), putVehicle);
router.delete("/:id", validate(VehicleIdParamSchema), removeVehicle);

export default router;
