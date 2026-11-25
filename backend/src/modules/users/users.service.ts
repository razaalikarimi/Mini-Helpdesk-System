import { Role } from '@prisma/client';
import { prisma } from '../../config/db';

export async function listAdmins() {
  return prisma.user.findMany({
    where: { role: Role.ADMIN, isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: { name: 'asc' },
  });
}
