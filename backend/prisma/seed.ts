import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role, TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Seeding Mini Helpdesk database...');

  const adminPasswordHash = await bcrypt.hash('AdminPass123!', 12);
  const userPasswordHash = await bcrypt.hash('UserPass123!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@helpdesk.local' },
    update: {},
    create: {
      name: 'Sarah Connor (Admin)',
      email: 'admin@helpdesk.local',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  const alice = await prisma.user.upsert({
    where: { email: 'alice@helpdesk.local' },
    update: {},
    create: {
      name: 'Alice Johnson',
      email: 'alice@helpdesk.local',
      passwordHash: userPasswordHash,
      role: Role.USER,
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@helpdesk.local' },
    update: {},
    create: {
      name: 'Bob Smith',
      email: 'bob@helpdesk.local',
      passwordHash: userPasswordHash,
      role: Role.USER,
    },
  });

  const existingTickets = await prisma.ticket.count();
  if (existingTickets > 0) {
    console.log('Database already contains tickets, skipping sample ticket seed.');
    return;
  }

  const now = new Date();
  const daysAgo = (days: number): Date => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const ticket1 = await prisma.ticket.create({
    data: {
      title: 'Unable to export monthly billing invoice as PDF',
      description:
        'When clicking "Download PDF" on the Billing History page, the spinner hangs and returns a 500 Internal Server Error.',
      category: TicketCategory.BILLING,
      priority: TicketPriority.URGENT,
      status: TicketStatus.IN_PROGRESS,
      createdById: alice.id,
      assignedToId: admin.id,
      createdAt: daysAgo(3),
    },
  });

  const ticket2 = await prisma.ticket.create({
    data: {
      title: 'Add dark mode toggle to user preferences',
      description:
        'It would be great to have a persistent dark mode toggle in the top navigation bar for late-night support shifts.',
      category: TicketCategory.FEATURE,
      priority: TicketPriority.LOW,
      status: TicketStatus.OPEN,
      createdById: alice.id,
      createdAt: daysAgo(2),
    },
  });

  const ticket3 = await prisma.ticket.create({
    data: {
      title: '2FA verification code delayed by 5 minutes',
      description:
        'SMS one-time passcodes are arriving after the 3-minute expiration window, locking me out of my account.',
      category: TicketCategory.ACCOUNT,
      priority: TicketPriority.HIGH,
      status: TicketStatus.RESOLVED,
      createdById: bob.id,
      assignedToId: admin.id,
      createdAt: daysAgo(4),
      resolvedAt: daysAgo(3),
    },
  });

  const ticket4 = await prisma.ticket.create({
    data: {
      title: 'Dashboard charts overlap on 375px mobile viewport',
      description:
        'On iPhone SE width, the right edge of the priority bar chart clips outside its card container.',
      category: TicketCategory.BUG,
      priority: TicketPriority.MEDIUM,
      status: TicketStatus.OPEN,
      createdById: bob.id,
      createdAt: daysAgo(1),
    },
  });

  await prisma.ticket.create({
    data: {
      title: 'Update company VAT number on annual plan',
      description:
        'We recently registered a new EU VAT ID and need it reflected on upcoming quarterly statements.',
      category: TicketCategory.GENERAL,
      priority: TicketPriority.MEDIUM,
      status: TicketStatus.CLOSED,
      createdById: alice.id,
      assignedToId: admin.id,
      createdAt: daysAgo(6),
      resolvedAt: daysAgo(5),
    },
  });

  await prisma.comment.createMany({
    data: [
      {
        ticketId: ticket1.id,
        userId: admin.id,
        message: 'We reproduced the PDF rendering timeout and are deploying a patch today.',
      },
      {
        ticketId: ticket1.id,
        userId: alice.id,
        message: 'Thanks! Please let me know once the fix is live.',
      },
      {
        ticketId: ticket3.id,
        userId: admin.id,
        message: 'Switched SMS carrier route to low-latency provider. Please test again.',
      },
    ],
  });

  await prisma.activityLog.createMany({
    data: [
      {
        ticketId: ticket1.id,
        actorId: alice.id,
        eventType: 'TICKET_CREATED',
        metadata: { title: ticket1.title, priority: ticket1.priority, actorName: alice.name },
      },
      {
        ticketId: ticket1.id,
        actorId: admin.id,
        eventType: 'STATUS_CHANGED',
        metadata: { oldStatus: 'OPEN', newStatus: 'IN_PROGRESS', actorName: admin.name },
      },
      {
        ticketId: ticket3.id,
        actorId: admin.id,
        eventType: 'TICKET_RESOLVED',
        metadata: { actorName: admin.name },
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: alice.id,
        ticketId: ticket1.id,
        type: 'STATUS_CHANGED',
        message: `Ticket "${ticket1.title}" status changed from OPEN to IN_PROGRESS`,
      },
      {
        userId: admin.id,
        ticketId: ticket2.id,
        type: 'TICKET_CREATED',
        message: `New ticket "${ticket2.title}" (LOW) created by ${alice.name}`,
      },
      {
        userId: admin.id,
        ticketId: ticket4.id,
        type: 'TICKET_CREATED',
        message: `New ticket "${ticket4.title}" (MEDIUM) created by ${bob.name}`,
      },
    ],
  });

  console.log('Seed completed: 1 admin, 2 users, 5 sample tickets.');
}

main()
  .catch((error) => {
    console.error('Seed error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
