import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import * as activityController from '../activity/activity.controller';
import { ticketActivityParamSchema } from '../activity/activity.validation';
import commentsRoutes from '../comments/comments.routes';
import * as ticketsController from './tickets.controller';
import {
  createTicketSchema,
  listTicketsQuerySchema,
  ticketIdParamSchema,
  updateTicketSchema,
} from './tickets.validation';

const router = Router();

router.use(authenticate);

router.post('/', validate({ body: createTicketSchema }), ticketsController.createTicket);
router.get('/my', validate({ query: listTicketsQuerySchema }), ticketsController.getMyTickets);
router.get('/:id', validate({ params: ticketIdParamSchema }), ticketsController.getTicketById);
router.patch(
  '/:id',
  validate({ params: ticketIdParamSchema, body: updateTicketSchema }),
  ticketsController.updateOwnTicket,
);
router.delete('/:id', validate({ params: ticketIdParamSchema }), ticketsController.deleteOwnTicket);

router.get(
  '/:id/activity',
  validate({ params: ticketActivityParamSchema }),
  activityController.getTicketActivity,
);
router.use('/:ticketId/comments', commentsRoutes);

export default router;
