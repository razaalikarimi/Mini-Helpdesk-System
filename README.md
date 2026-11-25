# Mini Helpdesk System

A production-grade, full-stack **Mini Helpdesk & Support Ticketing System** built with **Node.js, Express, TypeScript, PostgreSQL, Prisma, Next.js (App Router), and Tailwind CSS**. Designed with strict layered architecture, typed event-driven workflows, RBAC & ownership enforcement, and comprehensive integration testing.

---

## 1. Project Overview & Features

- **Role-Based Access Control (RBAC)**:
  - **Users (`USER`)**: Register, log in, create tickets, filter/search/paginate their own tickets, edit or delete tickets while `OPEN`, comment on non-closed tickets, view ticket activity timelines, and manage in-app notifications.
  - **Admins (`ADMIN`)**: Access all tickets with multi-criteria filtering & sorting, enforce valid status transitions (`OPEN → IN_PROGRESS → RESOLVED → CLOSED`, plus reopening `RESOLVED → IN_PROGRESS`), update priorities, assign tickets to admins, reply to users, and monitor KPIs & charts on the Admin Operations Console.
- **Event-Driven Architecture**: Decoupled, strongly typed `EventBus` handling `ActivityLog` auditing, in-app `Notification` fan-out, and non-blocking email dispatch.
- **Security Hardening**: Helmet, strict CORS whitelist, `hpp`, JSON body size limits (`100kb`), rate limiting (stricter on `/auth/*`), `bcrypt` (12 salt rounds), generic login error messages (no user enumeration), and privilege-escalation prevention on registration.
- **Interactive API Docs**: Swagger UI at `/api/docs` + exportable Postman collection in [`docs/postman_collection.json`](docs/postman_collection.json).

---

## 2. Tech Stack & Rationale

| Layer | Technology | Why It Was Chosen |
| :--- | :--- | :--- |
| **Backend** | Node.js + Express + TypeScript | Mature ecosystem, fast async I/O, strict compile-time type safety (`noImplicitAny`, `strictNullChecks`). |
| **Database & ORM** | PostgreSQL + Prisma ORM | ACID transactions, relational integrity, enum & index support, and type-safe generated queries. |
| **Validation** | Zod | Single-source runtime validation for `body`, `params`, `query`, and startup environment variables. |
| **Authentication** | JWT + `bcryptjs` | Stateless bearer auth for horizontal API scaling; bcrypt (12 rounds) resists brute-force attacks. |
| **Frontend** | Next.js (App Router) + Tailwind CSS | Server-ready routing + Edge middleware protection, fast responsive UI, Recharts analytics. |
| **Forms & UX** | React Hook Form + Zod + `react-hot-toast` | Zero-boilerplate schema-driven form validation and instant user feedback. |
| **Testing** | Jest + Supertest | End-to-end HTTP integration tests against an isolated PostgreSQL test database. |
| **DevOps** | Docker + Docker Compose | Reproducible multi-stage builds and single-command local orchestration (`docker compose up --build`). |

---

## 3. Architecture & Folder Structure

```mermaid
flowchart LR
    Client["Next.js App Router (Web)"] -->|HTTPS + JWT| API["Express.js REST API (/api/v1)"]
    API --> MW["Security & Auth Middlewares\n(Helmet, CORS, RateLimit, JWT, RBAC, Zod)"]
    MW --> Ctrl["Thin Controllers"]
    Ctrl --> Svc["Domain Services\n(Business Rules & Transactions)"]
    Svc --> Prisma["Prisma ORM"]
    Prisma --> PG[("PostgreSQL")]
    Svc -.->|emitEvent| Bus["Typed EventBus\n(Singleton EventEmitter)"]
    Bus --> L1["activityLogListener"]
    Bus --> L2["notificationListener"]
    Bus --> L3["emailListener (Nodemailer)"]
    L1 --> Prisma
    L2 --> Prisma
```

### Monorepo Layout

```text
├── backend/
│   ├── prisma/              # schema.prisma, migrations/, seed.ts
│   ├── src/
│   │   ├── config/          # Zod env validation, Prisma client, Pino logger
│   │   ├── modules/         # auth, users, tickets, comments, activity, dashboard
│   │   ├── events/          # eventBus.ts, eventTypes.ts, listeners/
│   │   ├── middlewares/     # auth, rbac, validate, errorHandler, rateLimiter, notFound
│   │   ├── utils/           # ApiError, ApiResponse, asyncHandler, jwt, pagination
│   │   ├── docs/            # Swagger/OpenAPI specification
│   │   ├── app.ts           # Express app & middleware pipeline
│   │   └── server.ts        # HTTP server & graceful shutdown
│   ├── tests/               # Jest + Supertest integration tests
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js App Router pages (/login, /register, /dashboard, /tickets/*, /admin/*)
│   │   ├── components/      # Reusable UI (Badge, Table, Pagination, Modal, FormInput, Skeleton, Navbar)
│   │   ├── lib/             # Axios instance with JWT/401 interceptors, AuthProvider
│   │   └── middleware.ts    # Edge route & role protection
│   └── Dockerfile
├── docs/                    # ER/architecture Mermaid diagrams + Postman collection
└── docker-compose.yml
```

**Layered Architecture**: Every module strictly follows `Route → Controller → Service → Prisma`. Controllers only extract validated request inputs and format responses via `sendResponse()`; all business rules, ownership checks, and database transactions live in services.

---

## 4. Database Design & ER Diagram

```mermaid
erDiagram
    User ||--o{ Ticket : "creates"
    User ||--o{ Ticket : "assigned to"
    User ||--o{ Comment : "writes"
    User ||--o{ ActivityLog : "performs"
    User ||--o{ Notification : "receives"
    Ticket ||--o{ Comment : "has (CASCADE)"
    Ticket ||--o{ ActivityLog : "tracks (SET NULL)"
    Ticket ||--o{ Notification : "triggers (CASCADE)"
```

### Key Design Decisions
- **Normalization**: `User`, `Ticket`, `Comment`, `ActivityLog`, and `Notification` are normalized to 3NF. `ActivityLog.metadata` uses PostgreSQL `Json` to store event-specific diffs (`oldStatus`/`newStatus`, `updatedFields`) without sparse nullable columns.
- **Indexes**:
  - `Ticket(status)`, `Ticket(priority)`, `Ticket(createdById)` optimize filtered list queries and user dashboards.
  - `Comment(ticketId)` and `ActivityLog(ticketId)` accelerate ticket detail timelines.
  - `Notification(userId, isRead)` composite index makes unread count and notification dropdown queries instant.
- **Enums**: `Role`, `TicketCategory`, `TicketPriority`, and `TicketStatus` are native PostgreSQL enums enforced at both DB and Zod layers.
- **Cascade Rules**:
  - Deleting an `OPEN` ticket cascades to `Comment` and `Notification` (`onDelete: Cascade`), while `ActivityLog.ticketId` uses `onDelete: SetNull` to preserve audit history.
  - `User` relations use `Restrict` on created tickets/comments so audit trails are never silently orphaned.

---

## 5. Event-Driven Workflow

```mermaid
sequenceDiagram
    participant U as Admin
    participant S as Ticket Service
    participant DB as PostgreSQL
    participant B as EventBus
    participant A as activityLogListener
    participant N as notificationListener
    participant E as emailListener

    U->>S: PATCH /admin/tickets/:id/status (RESOLVED)
    S->>DB: Update status + resolvedAt
    S->>B: emitEvent(STATUS_CHANGED) & emitEvent(TICKET_RESOLVED)
    S-->>U: 200 OK
    par Async Error-Isolated Listeners
        B->>A: Insert ActivityLog rows
        B->>N: Notify ticket owner
        B->>E: Dispatch email (non-blocking)
    end
```

- **Why `EventEmitter`?** For a single-node service, a typed singleton `EventBus` decouples domain services from side effects (auditing, notifications, email) with zero external infrastructure overhead. Every listener is wrapped in `Promise.resolve().then(...).catch(...)` so listener failures are logged and never crash HTTP requests.
- **Limitations**: `EventEmitter` is in-memory and non-durable — if the process crashes mid-listener, in-flight events are lost, and events don't cross horizontal replicas.
- **Production Evolution**: Replace `EventBus.emitEvent()` with a **Transactional Outbox** table + **BullMQ (Redis)** or **Kafka/RabbitMQ** workers for guaranteed at-least-once delivery, retries with exponential backoff, and dead-letter queues.

---

## 6. Setup & Deployment Instructions

### Option A: One-Command Docker Setup (Recommended)
```bash
docker compose up --build
```
This starts PostgreSQL (with healthcheck + persistent volume), runs `prisma migrate deploy` + `prisma db seed`, and launches:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Swagger Docs**: http://localhost:5000/api/docs

### Option B: Local Development
1. **Database**: Ensure PostgreSQL is running and create databases `helpdesk_db` and `helpdesk_test_db`.
2. **Backend**:
   ```bash
   cd backend
   cp .env.example .env
   npm install
   npx prisma migrate deploy
   npx prisma db seed
   npm run dev
   ```
3. **Frontend**:
   ```bash
   cd frontend
   cp .env.example .env.local
   npm install
   npm run dev
   ```

### Cloud Deployment Guide
- **Database (Neon / Supabase)**: Provision a PostgreSQL database and copy the pooled/direct `DATABASE_URL`.
- **Backend (Render / Railway)**:
  - Root directory: `backend`
  - Build command: `npm ci && npx prisma generate && npm run build`
  - Start command: `npx prisma migrate deploy && npm start`
  - Set `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`, and `CORS_ORIGIN=https://your-vercel-app.vercel.app`.
- **Frontend (Vercel)**:
  - Root directory: `frontend`
  - Set `NEXT_PUBLIC_API_URL=https://your-api-url.onrender.com/api/v1`.

---

## 7. Environment Variables

| Variable | App | Description | Example |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Backend | Runtime environment | `development` / `production` |
| `PORT` | Backend | HTTP server port | `5000` |
| `DATABASE_URL` | Backend | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/helpdesk_db` |
| `JWT_SECRET` | Backend | Signing secret (min 32 chars) | `super-secret-64-char-key...` |
| `JWT_EXPIRES_IN` | Backend | Access token TTL | `7d` |
| `CORS_ORIGIN` | Backend | Allowed frontend origin(s) | `http://localhost:3000` |
| `RATE_LIMIT_MAX` | Backend | General requests per window | `100` |
| `AUTH_RATE_LIMIT_MAX` | Backend | Auth requests per window | `15` |
| `NEXT_PUBLIC_API_URL` | Frontend | Backend API v1 base URL | `http://localhost:5000/api/v1` |

---

## 8. Seeded Credentials & Sample Data

Running `npx prisma db seed` creates 3 users and 5 realistic tickets across all statuses and priorities:

| Role | Name | Email | Password |
| :--- | :--- | :--- | :--- |
| **ADMIN** | Sarah Connor | `admin@helpdesk.local` | `AdminPass123!` |
| **USER** | Alice Johnson | `alice@helpdesk.local` | `UserPass123!` |
| **USER** | Bob Smith | `bob@helpdesk.local` | `UserPass123!` |

---

## 9. API Documentation

- **Swagger UI**: `http://localhost:5000/api/docs`
- **Health Check**: `GET http://localhost:5000/health`
- **Postman Collection**: Import [`docs/postman_collection.json`](docs/postman_collection.json) into Postman.

---

## 10. Security Measures Implemented

1. **Privilege Escalation Prevention**: `POST /api/v1/auth/register` ignores any client-supplied `role` and always assigns `Role.USER`.
2. **User Enumeration Prevention**: Login returns a generic `"Invalid email or password"` `401` response regardless of whether the email exists.
3. **Password Policy & Hashing**: Enforced via Zod (min 8 chars, uppercase, lowercase, digit) and hashed with `bcrypt` (`12` rounds); `passwordHash` is never selected or returned.
4. **HTTP & Transport Hardening**: `helmet()`, strict `cors()` origin whitelist, `hpp()` parameter pollution protection, `100kb` payload limit, and tiered `express-rate-limit`.
5. **RBAC + Ownership**: `authorize(Role.ADMIN)` protects `/admin/*`; ticket/comment/activity services verify `ticket.createdById === actor.id` for non-admins.

---

## 11. Design Decisions & Trade-offs

- **JWT in `localStorage` + Cookie Mirror**: Storing the JWT in `localStorage` for Axios + mirroring `helpdesk_token` and `helpdesk_role` in cookies enables Next.js Edge `middleware.ts` to protect `/admin` and `/dashboard` before page hydration. In a high-security deployment, migrating to `HttpOnly; Secure; SameSite=Strict` cookies issued by the backend eliminates XSS token theft.
- **Offset Pagination vs Cursor Pagination**: Offset pagination (`page`, `limit`, `totalPages`) was chosen for admin/user data tables where jumping to page numbers is expected.

---

## 12. Challenges Faced & Solutions

- **Express v5 TypeScript `req.params` Typing**: `@types/express@5` types `req.params[key]` as `string | string[]`. We normalized validated UUID params cleanly in controllers and updated the `validate` middleware to accept `ZodTypeAny` so `.refine()` schemas compile without type friction.
- **Deterministic Async Event Testing**: Because `EventEmitter` listeners execute asynchronously after HTTP responses return, `EventBus.flush()` tracks in-flight listener promises so Jest integration tests and graceful shutdown can await listener completion deterministically without flaky `setTimeout` delays.

---

## 13. Future Improvements

- **BullMQ + Redis** for durable, retryable background jobs and email queues.
- **WebSockets / Server-Sent Events (SSE)** for real-time notification bell updates.
- **Refresh Token Rotation** with short-lived 15-minute access tokens and token revocation.
- **S3/R2 File Attachments** via pre-signed upload URLs.
- **SLA Timers & Escalation Rules** for `URGENT` and `HIGH` priority tickets.

---

## 14. Interview Q&A

1. **Why did you separate Controllers and Services?**
   Thin controllers handle HTTP concerns (status codes, `req`/`res`), while services encapsulate pure business logic (status transitions, ownership rules, transactions), making services reusable and easy to unit-test.
2. **How do you prevent privilege escalation during registration?**
   `registerSchema` only accepts `name`, `email`, and `password`, and `registerUser()` hardcodes `role: Role.USER`. Admin accounts are provisioned only via controlled seed/CLI scripts.
3. **Why return `403` vs `404` on unauthorized ticket access?**
   When a ticket doesn't exist, we return `404`. When it exists but belongs to another user, returning `403` clearly signals an authorization failure (while multi-tenant B2B systems sometimes return `404` to hide resource existence).
4. **How does your status transition state machine work?**
   A `Record<TicketStatus, TicketStatus[]>` map defines legal transitions (`OPEN → IN_PROGRESS → RESOLVED → CLOSED`, plus `RESOLVED → IN_PROGRESS`). Any other transition throws `ApiError(400)`.
5. **What happens to `resolvedAt` when an admin reopens a ticket?**
   Transitioning to `RESOLVED` sets `resolvedAt = new Date()`. Reopening (`RESOLVED → IN_PROGRESS`) explicitly clears `resolvedAt = null` so average resolution time metrics remain accurate.
6. **Why use `prisma.$transaction` on paginated queries?**
   Running `findMany` and `count` inside `prisma.$transaction([...])` executes both in a consistent snapshot and reduces round-trip latency.
7. **How do you ensure event listeners never crash an API request?**
   `EventBus.onEvent` wraps every listener in `Promise.resolve().then(...).catch(...)`, logging errors with Pino without propagating unhandled rejections.
8. **How would you scale this event system across multiple API instances?**
   Persist domain events in an Outbox table within the same DB transaction as the ticket write, then publish to Redis/BullMQ or Kafka so any worker replica can process notifications idempotently.
9. **Why did you index `(userId, isRead)` on `Notification`?**
   The navbar bell queries unread notifications per user on every navigation (`WHERE userId = ? AND isRead = false`). A composite index satisfies both the filter and count without a full table scan.
10. **How does rate limiting differ between auth and general routes?**
    Auth routes (`/login`, `/register`) use a stricter `15 req / 15 min` limit to mitigate credential stuffing and brute-force attacks, while general API routes allow `100 req / 15 min`.
11. **How does Next.js protect `/admin` routes?**
    Both `src/middleware.ts` (Edge middleware checking role cookie before rendering) and client-side `useEffect` guards in `/admin` pages redirect non-admins to `/dashboard`.
12. **How is graceful shutdown handled?**
    On `SIGINT`/`SIGTERM`, `server.ts` stops accepting new HTTP connections, awaits `eventBus.flush()` so pending audit logs/notifications finish writing, and disconnects Prisma cleanly.
