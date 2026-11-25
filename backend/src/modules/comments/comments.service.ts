import { Role, TicketStatus } from '@prisma/client';
import { prisma } from '../../config/db';
import { eventBus } from '../../events/eventBus';
import { AppEvent } from '../../events/eventTypes';
import { AuthenticatedUser } from '../../types/express';
import { ApiError } from '../../utils/ApiError';
import { buildPaginationMeta, parsePagination } from '../../utils/pagination';
import { CreateCommentInput, ListCommentsQuery } from './comments.validation';

const userSummarySelect = {
  id: true,
  name: true,
  email: true,
  role: true,
} as const;

export async function addComment(
  ticketId: string,
  input: CreateCommentInput,
  actor: AuthenticatedUser,
) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      title: true,
      status: true,
      createdById: true,
    },
  });

  if (!ticket) {
    throw new ApiError(404, 'Ticket not found');
  }

  if (actor.role !== Role.ADMIN && ticket.createdById !== actor.id) {
    throw new ApiError(403, 'You do not have permission to comment on this ticket');
  }

  if (actor.role !== Role.ADMIN && ticket.status === TicketStatus.CLOSED) {
    throw new ApiError(400, 'Users cannot comment on CLOSED tickets');
  }

  const comment = await prisma.comment.create({
    data: {
      ticketId,
      userId: actor.id,
      message: input.message,
    },
    include: {
      user: { select: userSummarySelect },
    },
  });

  eventBus.emitEvent(AppEvent.COMMENT_ADDED, {
    ticketId: ticket.id,
    title: ticket.title,
    commentId: comment.id,
    ticketOwnerId: ticket.createdById,
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.name,
  });

  return comment;
}

export async function listComments(
  ticketId: string,
  query: ListCommentsQuery,
  actor: AuthenticatedUser,
) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, createdById: true },
  });

  if (!ticket) {
    throw new ApiError(404, 'Ticket not found');
  }

  if (actor.role !== Role.ADMIN && ticket.createdById !== actor.id) {
    throw new ApiError(403, 'You do not have permission to view comments on this ticket');
  }

  const { page, limit, skip } = parsePagination(query.page, query.limit);

  const [comments, total] = await prisma.$transaction([
    prisma.comment.findMany({
      where: { ticketId },
      skip,
      take: limit,
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: userSummarySelect },
      },
    }),
    prisma.comment.count({ where: { ticketId } }),
  ]);

  return {
    comments,
    meta: buildPaginationMeta(total, page, limit),
  };
}
