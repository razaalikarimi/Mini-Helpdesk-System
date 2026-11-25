import { Role } from '@prisma/client';
import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { authorize } from '../../middlewares/rbac';
import * as dashboardController from './dashboard.controller';

const router = Router();

router.use(authenticate, authorize(Role.ADMIN));

router.get('/stats', dashboardController.getStats);

export default router;
