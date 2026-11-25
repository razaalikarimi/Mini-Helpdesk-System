import { prisma } from '../src/config/db';
import { eventBus } from '../src/events/eventBus';

export async function resetDatabase(): Promise<void> {
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.activityLog.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.ticket.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

beforeAll(async () => {
  await prisma.$connect();
});

afterEach(async () => {
  await eventBus.flush();
});

afterAll(async () => {
  await eventBus.flush();
  await prisma.$disconnect();
});
