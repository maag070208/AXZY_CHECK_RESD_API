import { Router } from "express";
import { getDataTable, getById, addHouse, putHouse, removeHouse } from "./houses.controller";
import { authenticate } from "../common/middlewares/auth.middleware";
import { validate } from "../../core/middlewares/validate.middleware";
import { CreateHouseSchema, UpdateHouseSchema, HouseIdParamSchema } from "./schemas/houses.schema";
import { DataTableFetchParamsSchema } from "../../core/dto/datatable.schema";

const router = Router();

router.use(authenticate);

router.post("/datatable", validate(DataTableFetchParamsSchema), getDataTable);
router.get("/:id", validate(HouseIdParamSchema), getById);
router.post("/", validate(CreateHouseSchema), addHouse);
router.put("/:id", validate(UpdateHouseSchema), putHouse);
router.delete("/:id", validate(HouseIdParamSchema), removeHouse);

export default router;
