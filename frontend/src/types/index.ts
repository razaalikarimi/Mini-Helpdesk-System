export type Role = 'USER' | 'ADMIN';

export type TicketCategory = 'BUG' | 'FEATURE' | 'BILLING' | 'ACCOUNT' | 'GENERAL' | 'OTHER';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive?: boolean;
  createdAt?: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdById: string;
  assignedToId: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: User;
  assignedTo: User | null;
  comments?: Comment[];
  _count?: { comments: number };
}

export interface Comment {
  id: string;
  ticketId: string;
  userId: string;
  message: string;
  createdAt: string;
  updatedAt: string;
  user: User;
}

export interface ActivityLog {
  id: string;
  ticketId: string | null;
  actorId: string;
  eventType: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  actor: User;
}

export interface NotificationItem {
  id: string;
  userId: string;
  ticketId: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  ticket?: {
    id: string;
    title: string;
    status: TicketStatus;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export interface DashboardStats {
  totalTickets: number;
  byStatus: Record<TicketStatus, number>;
  byPriority: Record<TicketPriority, number>;
  byCategory: Record<TicketCategory, number>;
  ticketsLast7Days: { date: string; count: number }[];
  avgResolutionTimeHours: number;
}
