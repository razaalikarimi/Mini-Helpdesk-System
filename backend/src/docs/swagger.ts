import { JsonObject } from 'swagger-ui-express';

export const swaggerSpec: JsonObject = {
  openapi: '3.0.3',
  info: {
    title: 'Mini Helpdesk System API',
    version: '1.0.0',
    description:
      'Production-grade REST API for the Mini Helpdesk System featuring JWT authentication, RBAC, event-driven activity logging & notifications, and admin analytics.',
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1 Base URL',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [{ BearerAuth: [] }],
  tags: [
    { name: 'Auth', description: 'Authentication and current user' },
    { name: 'Tickets', description: 'User ticket operations' },
    { name: 'Admin Tickets', description: 'Admin ticket management' },
    { name: 'Comments', description: 'Ticket discussion thread' },
    { name: 'Activity & Notifications', description: 'Audit logs and user notifications' },
    { name: 'Dashboard', description: 'Admin analytics' },
  ],
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new USER account',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Alice Johnson' },
                  email: { type: 'string', format: 'email', example: 'alice@example.com' },
                  password: { type: 'string', example: 'SecurePass1' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Registration successful' },
          '409': { description: 'Email already exists' },
          '422': { description: 'Validation failed' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Authenticate and receive JWT access token',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'alice@helpdesk.local' },
                  password: { type: 'string', example: 'UserPass123!' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Login successful' },
          '401': { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get authenticated user profile',
        responses: {
          '200': { description: 'User profile' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/tickets': {
      post: {
        tags: ['Tickets'],
        summary: 'Create a new support ticket',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'description'],
                properties: {
                  title: { type: 'string', example: 'Cannot export invoice PDF' },
                  description: {
                    type: 'string',
                    example: 'Clicking Export PDF on Billing page returns a 500 error.',
                  },
                  category: {
                    type: 'string',
                    enum: ['BUG', 'FEATURE', 'BILLING', 'ACCOUNT', 'GENERAL', 'OTHER'],
                  },
                  priority: {
                    type: 'string',
                    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
                  },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Ticket created' } },
      },
    },
    '/tickets/my': {
      get: {
        tags: ['Tickets'],
        summary: 'List tickets created by the authenticated user',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'priority', in: 'query', schema: { type: 'string' } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Paginated list of user tickets' } },
      },
    },
    '/tickets/{id}': {
      get: {
        tags: ['Tickets'],
        summary: 'Get ticket details and comments (owner or admin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Ticket details' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Not found' },
        },
      },
      patch: {
        tags: ['Tickets'],
        summary: 'Update own ticket while status is OPEN',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Ticket updated' } },
      },
      delete: {
        tags: ['Tickets'],
        summary: 'Delete own ticket while status is OPEN',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Ticket deleted' } },
      },
    },
    '/tickets/{ticketId}/comments': {
      post: {
        tags: ['Comments'],
        summary: 'Add comment to ticket (owner or admin)',
        parameters: [
          { name: 'ticketId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['message'],
                properties: { message: { type: 'string' } },
              },
            },
          },
        },
        responses: { '201': { description: 'Comment added' } },
      },
      get: {
        tags: ['Comments'],
        summary: 'List paginated comments for a ticket',
        parameters: [
          { name: 'ticketId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Comments list' } },
      },
    },
    '/tickets/{id}/activity': {
      get: {
        tags: ['Activity & Notifications'],
        summary: 'Get activity timeline for a ticket (owner or admin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Activity logs' } },
      },
    },
    '/admin/tickets': {
      get: {
        tags: ['Admin Tickets'],
        summary: 'List all tickets with filters, search, sorting, pagination (ADMIN)',
        responses: { '200': { description: 'All tickets' }, '403': { description: 'Forbidden' } },
      },
    },
    '/admin/tickets/{id}/status': {
      patch: {
        tags: ['Admin Tickets'],
        summary: 'Transition ticket status (ADMIN)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: {
                    type: 'string',
                    enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Status updated' },
          '400': { description: 'Invalid transition' },
        },
      },
    },
    '/admin/tickets/{id}/priority': {
      patch: {
        tags: ['Admin Tickets'],
        summary: 'Update ticket priority (ADMIN)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Priority updated' } },
      },
    },
    '/admin/tickets/{id}/assign': {
      patch: {
        tags: ['Admin Tickets'],
        summary: 'Assign ticket to an admin (ADMIN)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Ticket assigned' } },
      },
    },
    '/notifications': {
      get: {
        tags: ['Activity & Notifications'],
        summary: 'Get own notifications',
        responses: { '200': { description: 'Notifications list' } },
      },
    },
    '/notifications/{id}/read': {
      patch: {
        tags: ['Activity & Notifications'],
        summary: 'Mark notification as read',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Marked as read' } },
      },
    },
    '/notifications/read-all': {
      patch: {
        tags: ['Activity & Notifications'],
        summary: 'Mark all own notifications as read',
        responses: { '200': { description: 'All marked as read' } },
      },
    },
    '/admin/dashboard/stats': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get helpdesk KPIs and chart breakdowns (ADMIN)',
        responses: { '200': { description: 'Dashboard stats' } },
      },
    },
  },
};
