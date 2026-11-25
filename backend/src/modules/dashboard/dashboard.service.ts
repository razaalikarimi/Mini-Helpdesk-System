import { TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';
import { prisma } from '../../config/db';

export interface DailyCount {
  date: string;
  count: number;
}

export async function getDashboardStats() {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [
    totalTickets,
    statusGroups,
    priorityGroups,
    categoryGroups,
    recentTickets,
    resolvedTickets,
  ] = await Promise.all([
    prisma.ticket.count(),
    prisma.ticket.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.ticket.groupBy({
      by: ['priority'],
      _count: { _all: true },
    }),
    prisma.ticket.groupBy({
      by: ['category'],
      _count: { _all: true },
    }),
    prisma.ticket.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    }),
    prisma.ticket.findMany({
      where: { resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true },
    }),
  ]);

  const byStatus: Record<TicketStatus, number> = {
    [TicketStatus.OPEN]: 0,
    [TicketStatus.IN_PROGRESS]: 0,
    [TicketStatus.RESOLVED]: 0,
    [TicketStatus.CLOSED]: 0,
  };
  for (const row of statusGroups) {
    byStatus[row.status] = row._count._all;
  }

  const byPriority: Record<TicketPriority, number> = {
    [TicketPriority.LOW]: 0,
    [TicketPriority.MEDIUM]: 0,
    [TicketPriority.HIGH]: 0,
    [TicketPriority.URGENT]: 0,
  };
  for (const row of priorityGroups) {
    byPriority[row.priority] = row._count._all;
  }

  const byCategory: Record<TicketCategory, number> = {
    [TicketCategory.BUG]: 0,
    [TicketCategory.FEATURE]: 0,
    [TicketCategory.BILLING]: 0,
    [TicketCategory.ACCOUNT]: 0,
    [TicketCategory.GENERAL]: 0,
    [TicketCategory.OTHER]: 0,
  };
  for (const row of categoryGroups) {
    byCategory[row.category] = row._count._all;
  }

  // Build continuous 7-day buckets (YYYY-MM-DD)
  const dailyMap = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(sevenDaysAgo.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, 0);
  }
  for (const ticket of recentTickets) {
    const key = ticket.createdAt.toISOString().slice(0, 10);
    if (dailyMap.has(key)) {
      dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
    }
  }
  const ticketsLast7Days: DailyCount[] = Array.from(dailyMap.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  let avgResolutionTimeHours = 0;
  if (resolvedTickets.length > 0) {
    const totalMs = resolvedTickets.reduce((acc, item) => {
      if (!item.resolvedAt) return acc;
      return acc + Math.max(0, item.resolvedAt.getTime() - item.createdAt.getTime());
    }, 0);
    avgResolutionTimeHours = Number((totalMs / resolvedTickets.length / (1000 * 60 * 60)).toFixed(2));
  }

  return {
    totalTickets,
    byStatus,
    byPriority,
    byCategory,
    ticketsLast7Days,
    avgResolutionTimeHours,
  };
}
