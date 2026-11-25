import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';
import { eventBus } from '../src/events/eventBus';
import { resetDatabase } from './setup';

async function createAndLoginUser(name: string, email: string, role: Role = Role.USER) {
  const password = 'Password123!';
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role },
  });

  const loginRes = await request(app).post('/api/v1/auth/login').send({ email, password });
  return {
    user,
    token: loginRes.body.data.accessToken as string,
  };
}

describe('Tickets, RBAC, Ownership, Transitions & Event System', () => {
  let adminToken: string;
  let adminId: string;
  let userAToken: string;
  let userAId: string;
  let userBToken: string;

  beforeEach(async () => {
    await resetDatabase();
    const admin = await createAndLoginUser('Admin User', 'admin@test.local', Role.ADMIN);
    const userA = await createAndLoginUser('User A', 'usera@test.local', Role.USER);
    const userB = await createAndLoginUser('User B', 'userb@test.local', Role.USER);

    adminToken = admin.token;
    adminId = admin.user.id;
    userAToken = userA.token;
    userAId = userA.user.id;
    userBToken = userB.token;
  });

  it('blocks regular USER from accessing admin routes (403)', async () => {
    const ticketsRes = await request(app)
      .get('/api/v1/admin/tickets')
      .set('Authorization', `Bearer ${userAToken}`);

    const statsRes = await request(app)
      .get('/api/v1/admin/dashboard/stats')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(ticketsRes.status).toBe(403);
    expect(statsRes.status).toBe(403);
  });

  it('enforces strict ownership: User B cannot read, edit, delete, or comment on User A ticket', async () => {
    const createRes = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'User A Private Issue',
        description: 'Detailed description of User A private issue.',
        category: 'BUG',
        priority: 'HIGH',
      });

    expect(createRes.status).toBe(201);
    const ticketId = createRes.body.data.id as string;

    const getRes = await request(app)
      .get(`/api/v1/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(getRes.status).toBe(403);

    const patchRes = await request(app)
      .patch(`/api/v1/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ title: 'Hacked Title' });
    expect(patchRes.status).toBe(403);

    const deleteRes = await request(app)
      .delete(`/api/v1/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(deleteRes.status).toBe(403);

    const commentRes = await request(app)
      .post(`/api/v1/tickets/${ticketId}/comments`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ message: 'Intruder comment' });
    expect(commentRes.status).toBe(403);
  });

  it('allows owner to edit/delete OPEN ticket, and blocks edit/delete once IN_PROGRESS', async () => {
    const createRes = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Editable Ticket',
        description: 'This ticket starts as OPEN and can be edited.',
        category: 'GENERAL',
        priority: 'LOW',
      });

    const ticketId = createRes.body.data.id as string;

    // Owner can edit while OPEN
    const editOpenRes = await request(app)
      .patch(`/api/v1/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ title: 'Updated Editable Ticket' });
    expect(editOpenRes.status).toBe(200);
    expect(editOpenRes.body.data.title).toBe('Updated Editable Ticket');

    // Admin moves to IN_PROGRESS
    const progressRes = await request(app)
      .patch(`/api/v1/admin/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'IN_PROGRESS' });
    expect(progressRes.status).toBe(200);

    // Owner cannot edit or delete once IN_PROGRESS
    const editLockedRes = await request(app)
      .patch(`/api/v1/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ title: 'Should Fail' });
    expect(editLockedRes.status).toBe(400);

    const deleteLockedRes = await request(app)
      .delete(`/api/v1/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${userAToken}`);
    expect(deleteLockedRes.status).toBe(400);

    // Create another OPEN ticket and delete it
    const tempRes = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Deletable Ticket',
        description: 'This ticket will be deleted while OPEN.',
      });
    const deleteOpenRes = await request(app)
      .delete(`/api/v1/tickets/${tempRes.body.data.id}`)
      .set('Authorization', `Bearer ${userAToken}`);
    expect(deleteOpenRes.status).toBe(200);
  });

  it('validates status transitions, sets/clears resolvedAt, and blocks user comments on CLOSED tickets', async () => {
    const createRes = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Workflow Test Ticket',
        description: 'Testing full status transition lifecycle.',
      });
    const ticketId = createRes.body.data.id as string;

    // Invalid: OPEN -> RESOLVED
    const invalid1 = await request(app)
      .patch(`/api/v1/admin/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'RESOLVED' });
    expect(invalid1.status).toBe(400);

    // Valid: OPEN -> IN_PROGRESS
    await request(app)
      .patch(`/api/v1/admin/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'IN_PROGRESS' })
      .expect(200);

    // Valid: IN_PROGRESS -> RESOLVED (sets resolvedAt)
    const resolvedRes = await request(app)
      .patch(`/api/v1/admin/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'RESOLVED' });
    expect(resolvedRes.status).toBe(200);
    expect(resolvedRes.body.data.resolvedAt).not.toBeNull();

    // Valid: Reopen RESOLVED -> IN_PROGRESS (clears resolvedAt)
    const reopenRes = await request(app)
      .patch(`/api/v1/admin/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'IN_PROGRESS' });
    expect(reopenRes.status).toBe(200);
    expect(reopenRes.body.data.resolvedAt).toBeNull();

    // Resolve again and close
    await request(app)
      .patch(`/api/v1/admin/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'RESOLVED' })
      .expect(200);

    await request(app)
      .patch(`/api/v1/admin/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CLOSED' })
      .expect(200);

    // User cannot comment on CLOSED ticket
    const closedComment = await request(app)
      .post(`/api/v1/tickets/${ticketId}/comments`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ message: 'Can I still reply?' });
    expect(closedComment.status).toBe(400);

    // Invalid: CLOSED -> OPEN
    const invalidReopen = await request(app)
      .patch(`/api/v1/admin/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'OPEN' });
    expect(invalidReopen.status).toBe(400);
  });

  it('emits events to create ActivityLog and Notification rows asynchronously', async () => {
    const createRes = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Event Driven Ticket',
        description: 'Verifying activity log and notification listeners.',
        priority: 'URGENT',
      });
    const ticketId = createRes.body.data.id as string;

    await eventBus.flush();

    // Admin should have received a TICKET_CREATED notification
    const adminNotifs = await prisma.notification.findMany({ where: { userId: adminId } });
    expect(adminNotifs.length).toBe(1);
    expect(adminNotifs[0].type).toBe('TICKET_CREATED');

    // Admin updates status and adds a comment -> User A receives notifications
    await request(app)
      .patch(`/api/v1/admin/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'IN_PROGRESS' })
      .expect(200);

    await request(app)
      .post(`/api/v1/tickets/${ticketId}/comments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ message: 'Investigating this now.' })
      .expect(201);

    await eventBus.flush();

    const userNotifs = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(userNotifs.status).toBe(200);
    expect(userNotifs.body.data.unreadCount).toBe(2);

    const activityRes = await request(app)
      .get(`/api/v1/tickets/${ticketId}/activity`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(activityRes.status).toBe(200);
    const eventTypes = activityRes.body.data.map(
      (item: { eventType: string }) => item.eventType,
    );
    expect(eventTypes).toContain('TICKET_CREATED');
    expect(eventTypes).toContain('STATUS_CHANGED');
    expect(eventTypes).toContain('COMMENT_ADDED');

    // Mark all read
    await request(app)
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(200);

    const afterRead = await prisma.notification.count({
      where: { userId: userAId, isRead: false },
    });
    expect(afterRead).toBe(0);
  });
});
