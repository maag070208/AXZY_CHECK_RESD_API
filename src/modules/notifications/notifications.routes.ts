import { Router } from "express";
import {
  getDataTable, getById, addNotification,
  readNotification, readAllNotifications, removeNotification,
} from "./notifications.controller";
import { authenticate } from "../common/middlewares/auth.middleware";
import { validate } from "../../core/middlewares/validate.middleware";
import {
  CreateNotificationSchema,
  NotificationIdParamSchema,
  MarkAllReadSchema,
} from "./schemas/notifications.schema";
import { DataTableFetchParamsSchema } from "../../core/dto/datatable.schema";

const router = Router();

router.use(authenticate);

router.post("/datatable", validate(DataTableFetchParamsSchema), getDataTable);
router.get("/:id", validate(NotificationIdParamSchema), getById);
router.post("/", validate(CreateNotificationSchema), addNotification);
router.patch("/:id/read", validate(NotificationIdParamSchema), readNotification);
router.post("/read-all", validate(MarkAllReadSchema), readAllNotifications);
router.delete("/:id", validate(NotificationIdParamSchema), removeNotification);

export default router;
