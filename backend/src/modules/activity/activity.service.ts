import { Role } from '@prisma/client';
import { prisma } from '../../config/db';
import { AuthenticatedUser } from '../../types/express';
import { ApiError } from '../../utils/ApiError';
import { buildPaginationMeta, parsePagination } from '../../utils/pagination';
import { ListNotificationsQuery } from './activity.validation';

export async function getTicketActivity(ticketId: string, actor: AuthenticatedUser) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, createdById: true },
  });

  if (!ticket) {
    throw new ApiError(404, 'Ticket not found');
  }

  if (actor.role !== Role.ADMIN && ticket.createdById !== actor.id) {
    throw new ApiError(403, 'You do not have permission to view this ticket activity');
  }

  return prisma.activityLog.findMany({
    where: { ticketId },
    orderBy: { createdAt: 'desc' },
    include: {
      actor: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  });
}

export async function listUserNotifications(userId: string, query: ListNotificationsQuery) {
  const { page, limit, skip } = parsePagination(query.page, query.limit);
  const where = {
    userId,
    ...(query.unreadOnly ? { isRead: false } : {}),
  };

  const [notifications, total, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        ticket: {
          select: { id: true, title: true, status: true },
        },
      },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return {
    notifications,
    unreadCount,
    meta: buildPaginationMeta(total, page, limit),
  };
}

export async function markNotificationRead(notificationId: string, userId: string) {
  const existing = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!existing) {
    throw new ApiError(404, 'Notification not found');
  }

  if (existing.userId !== userId) {
    throw new ApiError(403, 'You do not have permission to update this notification');
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
}

export async function markAllNotificationsRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  return { updatedCount: result.count };
}
