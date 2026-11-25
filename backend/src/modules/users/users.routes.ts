import { Role } from '@prisma/client';
import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { authorize } from '../../middlewares/rbac';
import * as usersController from './users.controller';

const router = Router();

router.get('/admins', authenticate, authorize(Role.ADMIN), usersController.getAdmins);

export default router;
