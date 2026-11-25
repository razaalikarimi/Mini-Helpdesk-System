import { Role, TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';

export enum AppEvent {
  TICKET_CREATED = 'TICKET_CREATED',
  TICKET_UPDATED = 'TICKET_UPDATED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  PRIORITY_CHANGED = 'PRIORITY_CHANGED',
  COMMENT_ADDED = 'COMMENT_ADDED',
  TICKET_RESOLVED = 'TICKET_RESOLVED',
}

export interface TicketCreatedPayload {
  ticketId: string;
  title: string;
  category: TicketCategory;
  priority: TicketPriority;
  actorId: string;
  actorName: string;
}

export interface TicketUpdatedPayload {
  ticketId: string;
  title: string;
  updatedFields: string[];
  actorId: string;
  actorName: string;
  metadata?: Record<string, unknown>;
}

export interface StatusChangedPayload {
  ticketId: string;
  title: string;
  oldStatus: TicketStatus;
  newStatus: TicketStatus;
  ticketOwnerId: string;
  actorId: string;
  actorRole: Role;
  actorName: string;
}

export interface PriorityChangedPayload {
  ticketId: string;
  title: string;
  oldPriority: TicketPriority;
  newPriority: TicketPriority;
  ticketOwnerId: string;
  actorId: string;
  actorRole: Role;
  actorName: string;
}

export interface CommentAddedPayload {
  ticketId: string;
  title: string;
  commentId: string;
  ticketOwnerId: string;
  actorId: string;
  actorRole: Role;
  actorName: string;
}

export interface TicketResolvedPayload {
  ticketId: string;
  title: string;
  ticketOwnerId: string;
  actorId: string;
  actorName: string;
  resolvedAt: string;
}

export interface EventPayloads {
  [AppEvent.TICKET_CREATED]: TicketCreatedPayload;
  [AppEvent.TICKET_UPDATED]: TicketUpdatedPayload;
  [AppEvent.STATUS_CHANGED]: StatusChangedPayload;
  [AppEvent.PRIORITY_CHANGED]: PriorityChangedPayload;
  [AppEvent.COMMENT_ADDED]: CommentAddedPayload;
  [AppEvent.TICKET_RESOLVED]: TicketResolvedPayload;
}
