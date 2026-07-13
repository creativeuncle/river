# river

A web-based, end-to-end encrypted chat app (Signal Protocol) built with Node.js — the foundation for a future iOS/Android/desktop client family.

## Security model

- **True E2E encryption** via the Signal Protocol (X3DH key agreement + Double Ratchet), using [`@privacyresearch/libsignal-protocol-typescript`](https://github.com/privacyresearchgroup/libsignal-protocol-typescript) in the browser.
- Private identity keys, prekeys, and session state are generated and stored **only in the browser's IndexedDB** — they are never sent to the server.
- The server only ever stores/relays **opaque ciphertext**: encrypted message envelopes and encrypted file blobs. It cannot decrypt chat content, even under compulsion or a breach.
- File transfers: each file gets a fresh random AES-256-GCM key, generated client-side. The file ciphertext is uploaded to the server; the AES key itself is delivered to the recipient only inside a Signal-encrypted chat message. The server never sees the key, so it never sees file contents.
- Passwords are hashed with bcrypt for account login — this is separate from (and does not weaken) the E2E identity keys.

## Stack

- **Backend**: Node.js, TypeScript, Express, Socket.io (real-time relay), PostgreSQL + Prisma
- **Frontend**: React + TypeScript + Vite, Socket.io client, Signal Protocol client library, Web Crypto API (AES-GCM) for files
- Everything used is free/open-source. No paid service is required to develop or self-host.

## Project layout

```
server/   Express + Socket.io API, Prisma schema, auth, key exchange, message relay, file storage
web/      React SPA: register/login, username search, chat UI, client-side crypto
```

## Running locally

### Option A: Docker Compose (easiest — no local Node/Postgres install needed)

Just install [Docker Desktop](https://www.docker.com/products/docker-desktop/), then:

```bash
docker compose up
```

This starts Postgres, runs the migrations, and starts both the backend (`:4000`) and frontend (`:5173`). Open `http://localhost:5173`.

### Option B: Run natively

#### 1. Database

```bash
# requires a running PostgreSQL instance
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

Open two browser sessions (or profiles), register two different usernames, search for one from the other, and start chatting.

## What's implemented

- Username-based registration/login (JWT sessions)
- Signal Protocol identity generation, prekey publishing/consumption, and X3DH session establishment
- Real-time encrypted messaging over Socket.io, with offline delivery fallback (messages persist encrypted and are fetched on reconnect)
- Encrypted file/image/video/document transfer (no file-type allowlist needed server-side — content is opaque ciphertext regardless of original format: zip, pdf, psd, ai, eps, svg, images, video, etc.)

## Known limitations / what's next

This is a foundation, not a finished product. Before any real users touch it:

- **Identity verification UI**: Signal's "safety numbers" (fingerprint comparison) aren't exposed yet — currently trust-on-first-use only, so a MITM on first contact wouldn't be caught by a user.
- **Multi-device**: one Signal identity per username right now; Signal's real multi-device story (linked devices) is more involved.
- **Groups**: 1:1 chat only so far.
- **Push notifications, read receipts, typing indicators (UI), message deletion/expiry**: not built yet.
- **Production hosting**: needs TLS termination, object storage (S3-compatible) instead of local disk for files at scale, and a managed Postgres instance.
- **Rate limiting / abuse prevention** on auth and upload endpoints isn't in place yet.
- Mobile (iOS/Android) and desktop (Windows/macOS) clients would reuse the same backend and Signal Protocol approach, via native libsignal bindings or React Native.
