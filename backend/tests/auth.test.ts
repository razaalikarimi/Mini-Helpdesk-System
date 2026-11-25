import request from 'supertest';
import app from '../src/app';
import { resetDatabase } from './setup';

describe('Auth & RBAC Security', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('registers a new user with USER role even if ADMIN role is injected', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Alice Tester',
      email: 'alice.test@helpdesk.local',
      password: 'Password123',
      role: 'ADMIN',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('USER');
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('rejects duplicate email registration with 409', async () => {
    await request(app).post('/api/v1/auth/register').send({
      name: 'Alice Tester',
      email: 'alice.dup@helpdesk.local',
      password: 'Password123',
    });

    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Alice Duplicate',
      email: 'alice.dup@helpdesk.local',
      password: 'Password123',
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('rejects weak passwords with 422', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Weak User',
      email: 'weak@helpdesk.local',
      password: 'weak',
    });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('logs in with valid credentials and returns /me without passwordHash', async () => {
    await request(app).post('/api/v1/auth/register').send({
      name: 'Login User',
      email: 'login@helpdesk.local',
      password: 'Password123',
    });

    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'login@helpdesk.local',
      password: 'Password123',
    });

    expect(loginRes.status).toBe(200);
    const token = loginRes.body.data.accessToken as string;

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.email).toBe('login@helpdesk.local');
    expect(meRes.body.data.passwordHash).toBeUndefined();
  });

  it('returns generic 401 error for wrong password or unknown email', async () => {
    await request(app).post('/api/v1/auth/register').send({
      name: 'Login User',
      email: 'real@helpdesk.local',
      password: 'Password123',
    });

    const wrongPass = await request(app).post('/api/v1/auth/login').send({
      email: 'real@helpdesk.local',
      password: 'WrongPassword1',
    });

    const unknownEmail = await request(app).post('/api/v1/auth/login').send({
      email: 'nobody@helpdesk.local',
      password: 'Password123',
    });

    expect(wrongPass.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPass.body.message).toBe('Invalid email or password');
    expect(unknownEmail.body.message).toBe('Invalid email or password');
  });
});
