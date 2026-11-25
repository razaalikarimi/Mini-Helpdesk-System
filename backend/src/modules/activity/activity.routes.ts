import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import * as activityController from './activity.controller';
import {
  listNotificationsQuerySchema,
  notificationIdParamSchema,
} from './activity.validation';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  validate({ query: listNotificationsQuerySchema }),
  activityController.getMyNotifications,
);
router.patch('/read-all', activityController.markAllAsRead);
router.patch(
  '/:id/read',
  validate({ params: notificationIdParamSchema }),
  activityController.markAsRead,
);

export default router;
