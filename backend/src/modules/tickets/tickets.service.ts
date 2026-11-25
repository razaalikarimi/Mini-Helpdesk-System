import { Prisma, Role, TicketStatus } from '@prisma/client';
import { prisma } from '../../config/db';
import { eventBus } from '../../events/eventBus';
import { AppEvent } from '../../events/eventTypes';
import { AuthenticatedUser } from '../../types/express';
import { ApiError } from '../../utils/ApiError';
import { buildPaginationMeta, parsePagination } from '../../utils/pagination';
import {
  AssignTicketInput,
  CreateTicketInput,
  ListTicketsQuery,
  UpdatePriorityInput,
  UpdateStatusInput,
  UpdateTicketInput,
} from './tickets.validation';

const ALLOWED_STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.OPEN]: [TicketStatus.IN_PROGRESS],
  [TicketStatus.IN_PROGRESS]: [TicketStatus.RESOLVED],
  [TicketStatus.RESOLVED]: [TicketStatus.CLOSED, TicketStatus.IN_PROGRESS],
  [TicketStatus.CLOSED]: [],
};

const userSummarySelect = {
  id: true,
  name: true,
  email: true,
  role: true,
} as const;

function buildTicketWhereClause(
  query: ListTicketsQuery,
  createdById?: string,
): Prisma.TicketWhereInput {
  const where: Prisma.TicketWhereInput = {};

  if (createdById) {
    where.createdById = createdById;
  }
  if (query.status) {
    where.status = query.status;
  }
  if (query.priority) {
    where.priority = query.priority;
  }
  if (query.category) {
    where.category = query.category;
  }
  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  return where;
}

export async function createTicket(input: CreateTicketInput, actor: AuthenticatedUser) {
  const ticket = await prisma.ticket.create({
    data: {
      title: input.title,
      description: input.description,
      category: input.category,
      priority: input.priority,
      status: TicketStatus.OPEN,
      createdById: actor.id,
    },
    include: {
      createdBy: { select: userSummarySelect },
      assignedTo: { select: userSummarySelect },
    },
  });

  eventBus.emitEvent(AppEvent.TICKET_CREATED, {
    ticketId: ticket.id,
    title: ticket.title,
    category: ticket.category,
    priority: ticket.priority,
    actorId: actor.id,
    actorName: actor.name,
  });

  return ticket;
}

export async function listMyTickets(userId: string, query: ListTicketsQuery) {
  const { page, limit, skip } = parsePagination(query.page, query.limit);
  const where = buildTicketWhereClause(query, userId);

  const [tickets, total] = await prisma.$transaction([
    prisma.ticket.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [query.sort]: query.order },
      include: {
        createdBy: { select: userSummarySelect },
        assignedTo: { select: userSummarySelect },
        _count: { select: { comments: true } },
      },
    }),
    prisma.ticket.count({ where }),
  ]);

  return {
    tickets,
    meta: buildPaginationMeta(total, page, limit),
  };
}

export async function listAllTickets(query: ListTicketsQuery) {
  const { page, limit, skip } = parsePagination(query.page, query.limit);
  const where = buildTicketWhereClause(query);

  const [tickets, total] = await prisma.$transaction([
    prisma.ticket.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [query.sort]: query.order },
      include: {
        createdBy: { select: userSummarySelect },
        assignedTo: { select: userSummarySelect },
        _count: { select: { comments: true } },
      },
    }),
    prisma.ticket.count({ where }),
  ]);

  return {
    tickets,
    meta: buildPaginationMeta(total, page, limit),
  };
}

export async function getTicketById(ticketId: string, actor: AuthenticatedUser) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      createdBy: { select: userSummarySelect },
      assignedTo: { select: userSummarySelect },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: userSummarySelect },
        },
      },
    },
  });

  if (!ticket) {
    throw new ApiError(404, 'Ticket not found');
  }

  if (actor.role !== Role.ADMIN && ticket.createdById !== actor.id) {
    throw new ApiError(403, 'You do not have permission to view this ticket');
  }

  return ticket;
}

export async function updateOwnTicket(
  ticketId: string,
  input: UpdateTicketInput,
  actor: AuthenticatedUser,
) {
  const existing = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!existing) {
    throw new ApiError(404, 'Ticket not found');
  }

  if (existing.createdById !== actor.id) {
    throw new ApiError(403, 'You can only edit your own tickets');
  }

  if (existing.status !== TicketStatus.OPEN) {
    throw new ApiError(400, 'Tickets can only be edited while status is OPEN');
  }

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
    },
    include: {
      createdBy: { select: userSummarySelect },
      assignedTo: { select: userSummarySelect },
    },
  });

  eventBus.emitEvent(AppEvent.TICKET_UPDATED, {
    ticketId: updated.id,
    title: updated.title,
    updatedFields: Object.keys(input),
    actorId: actor.id,
    actorName: actor.name,
  });

  return updated;
}

export async function deleteOwnTicket(ticketId: string, actor: AuthenticatedUser) {
  const existing = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!existing) {
    throw new ApiError(404, 'Ticket not found');
  }

  if (existing.createdById !== actor.id) {
    throw new ApiError(403, 'You can only delete your own tickets');
  }

  if (existing.status !== TicketStatus.OPEN) {
    throw new ApiError(400, 'Tickets can only be deleted while status is OPEN');
  }

  await prisma.ticket.delete({
    where: { id: ticketId },
  });

  return { id: ticketId };
}

export async function adminDeleteTicket(ticketId: string) {
  const existing = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true },
  });

  if (!existing) {
    throw new ApiError(404, 'Ticket not found');
  }

  await prisma.ticket.delete({
    where: { id: ticketId },
  });

  return { id: ticketId };
}

export async function updateTicketStatus(
  ticketId: string,
  input: UpdateStatusInput,
  actor: AuthenticatedUser,
) {
  const existing = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!existing) {
    throw new ApiError(404, 'Ticket not found');
  }

  const allowedNext = ALLOWED_STATUS_TRANSITIONS[existing.status];
  if (!allowedNext.includes(input.status)) {
    throw new ApiError(
      400,
      `Invalid status transition from ${existing.status} to ${input.status}`,
    );
  }

  const now = new Date();
  const isResolving = input.status === TicketStatus.RESOLVED;
  const isReopening =
    existing.status === TicketStatus.RESOLVED && input.status === TicketStatus.IN_PROGRESS;

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status: input.status,
      ...(isResolving ? { resolvedAt: now } : {}),
      ...(isReopening ? { resolvedAt: null } : {}),
    },
    include: {
      createdBy: { select: userSummarySelect },
      assignedTo: { select: userSummarySelect },
    },
  });

  eventBus.emitEvent(AppEvent.STATUS_CHANGED, {
    ticketId: updated.id,
    title: updated.title,
    oldStatus: existing.status,
    newStatus: updated.status,
    ticketOwnerId: updated.createdById,
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.name,
  });

  if (isResolving) {
    eventBus.emitEvent(AppEvent.TICKET_RESOLVED, {
      ticketId: updated.id,
      title: updated.title,
      ticketOwnerId: updated.createdById,
      actorId: actor.id,
      actorName: actor.name,
      resolvedAt: now.toISOString(),
    });
  }

  return updated;
}

export async function updateTicketPriority(
  ticketId: string,
  input: UpdatePriorityInput,
  actor: AuthenticatedUser,
) {
  const existing = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!existing) {
    throw new ApiError(404, 'Ticket not found');
  }

  if (existing.priority === input.priority) {
    return prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        createdBy: { select: userSummarySelect },
        assignedTo: { select: userSummarySelect },
      },
    });
  }

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: { priority: input.priority },
    include: {
      createdBy: { select: userSummarySelect },
      assignedTo: { select: userSummarySelect },
    },
  });

  eventBus.emitEvent(AppEvent.PRIORITY_CHANGED, {
    ticketId: updated.id,
    title: updated.title,
    oldPriority: existing.priority,
    newPriority: updated.priority,
    ticketOwnerId: updated.createdById,
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.name,
  });

  return updated;
}

export async function assignTicket(
  ticketId: string,
  input: AssignTicketInput,
  actor: AuthenticatedUser,
) {
  const existing = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!existing) {
    throw new ApiError(404, 'Ticket not found');
  }

  let assigneeName: string | null = null;
  if (input.assignedToId) {
    const assignee = await prisma.user.findUnique({
      where: { id: input.assignedToId },
      select: { id: true, name: true, role: true, isActive: true },
    });

    if (!assignee || !assignee.isActive || assignee.role !== Role.ADMIN) {
      throw new ApiError(400, 'Assignee must be an active ADMIN user');
    }
    assigneeName = assignee.name;
  }

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: { assignedToId: input.assignedToId },
    include: {
      createdBy: { select: userSummarySelect },
      assignedTo: { select: userSummarySelect },
    },
  });

  eventBus.emitEvent(AppEvent.TICKET_UPDATED, {
    ticketId: updated.id,
    title: updated.title,
    updatedFields: ['assignedToId'],
    actorId: actor.id,
    actorName: actor.name,
    metadata: {
      assignedToId: input.assignedToId,
      assignedToName: assigneeName,
    },
  });

  return updated;
}
