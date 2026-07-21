# river

A web-based live chat support tool (Node.js + React) — a customer-facing chat widget plus an agent inbox dashboard, in the spirit of Intercom/Zendesk chat.

Layout follows wireframe direction **1a** — bubble widget + inbox-style dashboard — from the imported Claude Design project.

## What it is

- **Customer widget**: a floating chat bubble that can be embedded on any website. Anonymous visitors (no account needed) fill a short pre-chat form (name/email) and start chatting; their identity is a random id kept in their browser. Position, color, welcome message, and logo are all customizable.
- **Agent dashboard**: staff log in, see a live inbox of conversations, open a thread, reply, assign conversations to themselves, and close/reopen them. Real-time presence (online/offline) is tracked per agent.
- **Team management**: invite/edit/remove agents, organize them into groups, and gate sensitive actions (inviting, editing roles, widget settings) to Owner/Admin roles.
- **Canned replies**: agents can save reusable responses and insert them into a reply by typing `/shortcut`.
- **Internal notes**: agent-only notes on a conversation, with `@Name` mentions that highlight and push a live notification to the mentioned teammate.
- **Auto-away message**: if no agent is currently online, a configurable away message is sent automatically the first time a customer messages.
- Real-time delivery both ways over Socket.io, with everything persisted in Postgres so history survives reloads/reconnects.
- File/image/document attachments (customer → agent and agent → customer), with inline thumbnails for images.
- A built-in emoji picker in both the widget and the dashboard composer.

## Security model (different from a personal E2E chat app)

This is a **support chat tool**, not a personal encrypted messenger — agents fundamentally need to read, search, and act on conversation content, so true end-to-end encryption (where even the server can't read messages) doesn't fit the product. Instead:

- All traffic should run over TLS in production (terminate HTTPS at your load balancer/reverse proxy).
- Agent passwords are hashed with bcrypt.
- A visitor's only credential is a random id generated client-side; a conversation can only be read/written by the matching visitorId or an authenticated agent.
- Attachments are stored on disk behind random, unguessable filenames.

## Stack

- **Backend**: Node.js, TypeScript, Express, Socket.io, PostgreSQL + Prisma
- **Frontend**: React + TypeScript + Vite, Socket.io client, [Hugeicons](https://hugeicons.com/) icon set
- Light/dark theme toggle (persisted per browser), matching an Intercom-style reference design
- Everything used is free/open-source.

## Project layout

```
server/   Express + Socket.io API: agent auth, widget endpoints, agent/inbox endpoints, Prisma schema
web/      React SPA:
  src/widget/   the embeddable customer chat bubble + demo storefront page it sits on
  src/agent/    agent login + dashboard (inbox list, conversation thread, customer info panel)
```

## Running locally

### Option A: Docker Compose (easiest — no local Node/Postgres install needed)

Install [Docker Desktop](https://www.docker.com/products/docker-desktop/), then:

```bash
docker compose up
```

This starts Postgres, runs migrations, and starts both the backend (`:4000`) and frontend (`:5173`).

- `http://localhost:5173/` — demo storefront with the chat widget (customer side)
- `http://localhost:5173/agent/login` — agent dashboard login/register

> If you already run Postgres locally on port 5432, this project's compose file maps its own Postgres to host port `5433` to avoid conflicting — no changes needed on your end.

### Option B: Run natively

#### 1. Database

```bash
createuser river --pwprompt
createdb river -O river
```

#### 2. Backend

```bash
cd server
cp .env.example .env   # fill in DATABASE_URL / JWT_SECRET
npm install
npx prisma migrate dev
npm run dev             # listens on :4000
```

#### 3. Frontend

```bash
cd web
npm install
npm run dev              # listens on :5173
```

## Trying it out

1. Open `http://localhost:5173/` in one tab — click the chat bubble bottom-right and send a message as a customer.
2. Open `http://localhost:5173/agent/login` in another tab (or incognito) — register an agent account, and the new conversation appears live in the inbox.
3. Reply from the dashboard — it shows up instantly in the customer's widget, and vice versa. Try sending a file attachment from either side, and closing the conversation from the customer info panel.

## What's next

- Working hours / staffing schedules, per-agent chat limits (both are visible as UI placeholders in Team → agent details)
- Custom contact attributes, conversation routing/assignment rules based on groups
- Read receipts in the inbox list, sound/desktop notifications for agents
- A real invite flow (email/SMTP) instead of directly creating the teammate's account
- Production hosting: TLS termination, S3-compatible storage for attachments instead of local disk, managed Postgres
- Rate limiting / abuse prevention on the public widget endpoints
