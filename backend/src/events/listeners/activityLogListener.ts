import { Prisma } from '@prisma/client';
import { prisma } from '../../config/db';
import { eventBus } from '../eventBus';
import { AppEvent } from '../eventTypes';

async function recordActivity(
  ticketId: string,
  actorId: string,
  eventType: AppEvent,
  metadata: Prisma.InputJsonValue,
): Promise<void> {
  await prisma.activityLog.create({
    data: {
      ticketId,
      actorId,
      eventType,
      metadata,
    },
  });
}

export function registerActivityLogListener(): void {
  eventBus.onEvent(AppEvent.TICKET_CREATED, async (payload) => {
    await recordActivity(payload.ticketId, payload.actorId, AppEvent.TICKET_CREATED, {
      title: payload.title,
      category: payload.category,
      priority: payload.priority,
      actorName: payload.actorName,
    });
  });

  eventBus.onEvent(AppEvent.TICKET_UPDATED, async (payload) => {
    await recordActivity(payload.ticketId, payload.actorId, AppEvent.TICKET_UPDATED, {
      title: payload.title,
      updatedFields: payload.updatedFields,
      actorName: payload.actorName,
      ...(payload.metadata ? (payload.metadata as Prisma.InputJsonObject) : {}),
    });
  });

  eventBus.onEvent(AppEvent.STATUS_CHANGED, async (payload) => {
    await recordActivity(payload.ticketId, payload.actorId, AppEvent.STATUS_CHANGED, {
      oldStatus: payload.oldStatus,
      newStatus: payload.newStatus,
      actorName: payload.actorName,
    });
  });

  eventBus.onEvent(AppEvent.PRIORITY_CHANGED, async (payload) => {
    await recordActivity(payload.ticketId, payload.actorId, AppEvent.PRIORITY_CHANGED, {
      oldPriority: payload.oldPriority,
      newPriority: payload.newPriority,
      actorName: payload.actorName,
    });
  });

  eventBus.onEvent(AppEvent.COMMENT_ADDED, async (payload) => {
    await recordActivity(payload.ticketId, payload.actorId, AppEvent.COMMENT_ADDED, {
      commentId: payload.commentId,
      actorName: payload.actorName,
    });
  });

  eventBus.onEvent(AppEvent.TICKET_RESOLVED, async (payload) => {
    await recordActivity(payload.ticketId, payload.actorId, AppEvent.TICKET_RESOLVED, {
      resolvedAt: payload.resolvedAt,
      actorName: payload.actorName,
    });
  });
}
