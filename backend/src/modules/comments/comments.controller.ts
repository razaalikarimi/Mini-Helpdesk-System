import { Request, Response } from 'express';
import { ApiError } from '../../utils/ApiError';
import { sendResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import * as commentsService from './comments.service';
import { ListCommentsQuery } from './comments.validation';

export const createComment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }
  const comment = await commentsService.addComment(String(req.params.ticketId), req.body, req.user);
  return sendResponse(res, 201, 'Comment added successfully', comment);
});

export const getComments = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }
  const query = req.query as unknown as ListCommentsQuery;
  const result = await commentsService.listComments(String(req.params.ticketId), query, req.user);
  return sendResponse(res, 200, 'Comments retrieved successfully', result.comments, result.meta);
});
