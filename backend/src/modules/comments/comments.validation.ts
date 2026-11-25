import { z } from 'zod';

export const commentTicketParamSchema = z.object({
  ticketId: z.string().uuid('Invalid ticket ID format'),
});

export const createCommentSchema = z.object({
  message: z.string().trim().min(1, 'Comment message cannot be empty').max(2000),
});

export const listCommentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type ListCommentsQuery = z.infer<typeof listCommentsQuerySchema>;
