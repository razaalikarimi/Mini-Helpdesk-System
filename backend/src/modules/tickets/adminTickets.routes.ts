import { Role } from '@prisma/client';
import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { authorize } from '../../middlewares/rbac';
import { validate } from '../../middlewares/validate';
import * as ticketsController from './tickets.controller';
import {
  assignTicketSchema,
  listTicketsQuerySchema,
  ticketIdParamSchema,
  updatePrioritySchema,
  updateStatusSchema,
} from './tickets.validation';

const router = Router();

router.use(authenticate, authorize(Role.ADMIN));

router.get('/', validate({ query: listTicketsQuerySchema }), ticketsController.getAllTickets);
router.patch(
  '/:id/status',
  validate({ params: ticketIdParamSchema, body: updateStatusSchema }),
  ticketsController.updateTicketStatus,
);
router.patch(
  '/:id/priority',
  validate({ params: ticketIdParamSchema, body: updatePrioritySchema }),
  ticketsController.updateTicketPriority,
);
router.patch(
  '/:id/assign',
  validate({ params: ticketIdParamSchema, body: assignTicketSchema }),
  ticketsController.assignTicket,
);
router.delete('/:id', validate({ params: ticketIdParamSchema }), ticketsController.adminDeleteTicket);

export default router;
