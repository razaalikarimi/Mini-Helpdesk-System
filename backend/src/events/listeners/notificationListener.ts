import { Role } from '@prisma/client';
import { prisma } from '../../config/db';
import { eventBus } from '../eventBus';
import { AppEvent } from '../eventTypes';

async function notifyAllAdmins(
  ticketId: string,
  type: string,
  message: string,
  excludeUserId?: string,
): Promise<void> {
  const admins = await prisma.user.findMany({
    where: {
      role: Role.ADMIN,
      isActive: true,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: { id: true },
  });

  if (admins.length === 0) return;

  await prisma.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      ticketId,
      type,
      message,
    })),
  });
}

async function notifyUser(
  userId: string,
  ticketId: string,
  type: string,
  message: string,
): Promise<void> {
  await prisma.notification.create({
    data: {
      userId,
      ticketId,
      type,
      message,
    },
  });
}

export function registerNotificationListener(): void {
  eventBus.onEvent(AppEvent.TICKET_CREATED, async (payload) => {
    await notifyAllAdmins(
      payload.ticketId,
      AppEvent.TICKET_CREATED,
      `New ticket "${payload.title}" (${payload.priority}) created by ${payload.actorName}`,
      payload.actorId,
    );
  });

  eventBus.onEvent(AppEvent.STATUS_CHANGED, async (payload) => {
    if (payload.actorRole === Role.ADMIN && payload.ticketOwnerId !== payload.actorId) {
      await notifyUser(
        payload.ticketOwnerId,
        payload.ticketId,
        AppEvent.STATUS_CHANGED,
        `Ticket "${payload.title}" status changed from ${payload.oldStatus} to ${payload.newStatus}`,
      );
    }
  });

  eventBus.onEvent(AppEvent.PRIORITY_CHANGED, async (payload) => {
    if (payload.actorRole === Role.ADMIN && payload.ticketOwnerId !== payload.actorId) {
      await notifyUser(
        payload.ticketOwnerId,
        payload.ticketId,
        AppEvent.PRIORITY_CHANGED,
        `Ticket "${payload.title}" priority changed from ${payload.oldPriority} to ${payload.newPriority}`,
      );
    }
  });

  eventBus.onEvent(AppEvent.COMMENT_ADDED, async (payload) => {
    if (payload.actorRole === Role.ADMIN && payload.ticketOwnerId !== payload.actorId) {
      await notifyUser(
        payload.ticketOwnerId,
        payload.ticketId,
        AppEvent.COMMENT_ADDED,
        `${payload.actorName} (Support) commented on "${payload.title}"`,
      );
    } else if (payload.actorRole === Role.USER) {
      await notifyAllAdmins(
        payload.ticketId,
        AppEvent.COMMENT_ADDED,
        `${payload.actorName} commented on ticket "${payload.title}"`,
        payload.actorId,
      );
    }
  });

  eventBus.onEvent(AppEvent.TICKET_RESOLVED, async (payload) => {
    if (payload.ticketOwnerId !== payload.actorId) {
      await notifyUser(
        payload.ticketOwnerId,
        payload.ticketId,
        AppEvent.TICKET_RESOLVED,
        `Your ticket "${payload.title}" has been marked as RESOLVED`,
      );
    }
  });
}
