import { TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';
import { z } from 'zod';

export const ticketIdParamSchema = z.object({
  id: z.string().uuid('Invalid ticket ID format'),
});

export const createTicketSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(150),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(5000),
  category: z.nativeEnum(TicketCategory).default(TicketCategory.GENERAL),
  priority: z.nativeEnum(TicketPriority).default(TicketPriority.MEDIUM),
});

export const updateTicketSchema = z
  .object({
    title: z.string().trim().min(3, 'Title must be at least 3 characters').max(150).optional(),
    description: z
      .string()
      .trim()
      .min(10, 'Description must be at least 10 characters')
      .max(5000)
      .optional(),
    category: z.nativeEnum(TicketCategory).optional(),
    priority: z.nativeEnum(TicketPriority).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export const listTicketsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.nativeEnum(TicketStatus).optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  category: z.nativeEnum(TicketCategory).optional(),
  search: z.string().trim().max(100).optional(),
  sort: z.enum(['createdAt', 'updatedAt', 'priority', 'status']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const updateStatusSchema = z.object({
  status: z.nativeEnum(TicketStatus),
});

export const updatePrioritySchema = z.object({
  priority: z.nativeEnum(TicketPriority),
});

export const assignTicketSchema = z.object({
  assignedToId: z.string().uuid('Invalid assignee ID format').nullable(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type UpdatePriorityInput = z.infer<typeof updatePrioritySchema>;
export type AssignTicketInput = z.infer<typeof assignTicketSchema>;
