import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import * as commentsController from './comments.controller';
import {
  commentTicketParamSchema,
  createCommentSchema,
  listCommentsQuerySchema,
} from './comments.validation';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post(
  '/',
  validate({ params: commentTicketParamSchema, body: createCommentSchema }),
  commentsController.createComment,
);
router.get(
  '/',
  validate({ params: commentTicketParamSchema, query: listCommentsQuerySchema }),
  commentsController.getComments,
);

export default router;
