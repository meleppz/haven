# Haven

Haven is a mental-health teleconsultation prototype for Indonesian students and young workers. It lets a user discover licensed experts, book and pay for a session, and attend it by chat or video, all from a mobile app.

This repository is a **working prototype**, not a production system. It is not deployed, and every external integration (payments, OTP, Google sign-in, video, realtime chat) is simulated locally so the full user journey can be demonstrated end to end.

- Client: React Native + Expo (`app/`)
- Server: Node.js + Express + Prisma + SQLite (`server/`)
- UI language: Bahasa Indonesia

## Features

- **Onboarding and authentication.** Register with email or phone and an OTP, sign in with a password, or use a simulated Google account. Optional self-assessment (age, occupation, concerns) after sign-up.
- **Discovery.** Home feed, expert catalog with search and filters, and expert detail pages (about, appointment slots, reviews).
- **Booking.** Pick a slot and consultation mode, optionally book anonymously. Slots are locked atomically and unpaid bookings are held for 15 minutes.
- **Student verification and pricing.** Upload a student document to unlock the 20% student discount. Prices are integer rupiah (for example 150.000 + 20.000 admin fee - 20% = 136.000).
- **Payment.** Simulated gateway with QRIS, virtual account, bank transfer and e-wallet flows, status polling, and a PDF receipt.
- **Consultation.** Session room with a join window, waiting room, simulated video call, chat with a simulated expert, post-session summary and review.
- **Sessions management.** Upcoming sessions, cancel and reschedule with a 48-hour rule, and consultation history.
- **Account.** Profile and statistics, settings, password change, help center, privacy, activity log, and account deletion.
- **Demo menu.** Developer tools for controlling the simulated clock, payments, expert behavior and data reset.

## Project status

Phases 0 to 6 of the build plan are complete: every screen in the design exists and the server implements all business rules. Phase 7, an acceptance run of the seven scenarios on a physical phone, is next. Until then the app has been verified in a browser against the Figma designs, with lint, type checking and the server test suite, but not on a device.

## Tech stack

| Area | Technology |
|---|---|
| Client | Expo SDK 58 (Expo Go), React Native, React 19, TypeScript (strict) |
| Navigation | expo-router (file-based, typed routes) |
| Client state and data | @tanstack/react-query, zustand, expo-secure-store |
| Animation and graphics | react-native-reanimated, react-native-svg |
| Server | Node.js, Express 5, TypeScript |
| Database | SQLite through Prisma 7 (`@prisma/adapter-better-sqlite3`) |
| Validation and auth | zod, JSON Web Tokens, bcryptjs |
| Server tests | vitest, supertest |

## Repository layout

```
app/        Expo client
  src/app/        routes (expo-router)
  src/components/ design-system components (one per Figma component)
  src/features/   feature-specific screens parts and stores
  src/api/        typed API functions and react-query hooks
  src/lib/        fetch client, formatting, validators, generated art
  src/theme/      design tokens and typography
  assets/         fonts, mascot and icon SVGs, payment logos
  scripts/        asset generators
server/     Express API and simulators
  src/services/   entity services (clients, experts, bookings, pricing, ...)
  src/flows/      task services: registration/booking, payment, session
  src/sim/        simulated clock, payment gateway, expert ("Ahli") simulator
  src/routes/     HTTP routes, including /api/dev/* in demo mode
  prisma/         schema, migrations, seed
  test/           vitest suites
docs/       Product and technical specification, design PDFs
```

Business logic lives on the server and uses a simulated clock. The app only displays what the server decides (prices, join windows, hold expiry, penalties, masking). All times are WIB (UTC+7).

## Getting started

### Prerequisites

- Node.js 22 or later and npm
- Expo Go on a phone (or a browser, for Expo web)
- The computer and the phone on the same network

### 1. Start the server

From `server/`:

```powershell
Copy-Item .env.example .env
npm install
npx prisma generate
npx prisma migrate deploy
npm run db:seed
npm run dev
```

The API listens on `http://0.0.0.0:3000`. Check `http://localhost:3000/api/health`.

Environment variables (`server/.env`):

| Variable | Purpose | Default |
|---|---|---|
| `DATABASE_URL` | SQLite file | `file:./dev.db` |
| `PORT` | HTTP port | `3000` |
| `DEMO_MODE` | Enables `/api/dev/*` simulation controls | `1` in `.env.example` |
| `JWT_SECRET` | Token signing secret (optional) | development value |
| `UNRESPONSIVE_AFTER_SEC` | Seconds before the "expert not responding" prompt | `600` (use `60` for a quick demo) |
| `STUDENT_APPROVE_MS` | Delay of the simulated student approval | `2000` |

### 2. Start the app

From `app/`, using your computer's real Wi-Fi IPv4 address (find it with `ipconfig`). A phone cannot reach `localhost`.

```powershell
npm install
$env:EXPO_PUBLIC_API_URL = "http://192.168.1.10:3000"   # replace with your LAN IP
$env:EXPO_PUBLIC_DEMO_MODE = "1"
npx expo start -c
```

Scan the QR code with Expo Go. If the app reports that the server cannot be reached, check that the IP is a real address (not a placeholder), that the server is running, and that the network does not isolate devices from each other (some campus Wi-Fi does; a phone hotspot works).

## Demo data and simulation

- Demo account: `choso@haven.id` / `haven123`
- OTP code is always `1234`
- The mock Google account is "Putri Demo"
- With `DEMO_MODE=1` on the server and `EXPO_PUBLIC_DEMO_MODE=1` in the app, the `/dev` menu exposes controls to move the simulated clock, mark an invoice paid or failed, approve student verification instantly, start a session in 10 minutes, end a session as the expert, silence the expert, and reset and reseed the database.

Simulated integrations:

| Real-world service | Prototype behavior |
|---|---|
| Payment gateway | Local mock gateway with webhook that is re-verified and idempotent |
| OTP | Fixed code `1234` |
| Google sign-in | Selectable mock accounts |
| Student verification | Auto-approved after about 2 seconds |
| Expert | Server-side "Ahli" simulator replies to chat 2 to 6 seconds after each message |
| Video | Simulated call screen, no real media |
| Realtime chat | Polling every 2 seconds |

End-to-end encryption appears only as interface copy; no real encryption is claimed or implemented.

## Business rules

The rules are implemented on the server, with their IDs (BR-xx, SC-xx, FA-xx) referenced in code comments. The most important:

| Rule | Behavior |
|---|---|
| BR-08 | Atomic slot lock: concurrent bookings of one slot give one success and one conflict |
| BR-09 | Unpaid bookings hold the slot for 15 minutes |
| BR-10 | Price = fee + Rp20.000 admin fee - 20% student discount, in integer rupiah |
| BR-12 | Payment webhook is re-verified and idempotent |
| BR-13 | A session can be joined from 30 minutes before the start until the slot ends |
| BR-15 | Anonymous bookings mask the real identity from the expert |
| BR-18 | Cancel and reschedule are restricted within 48 hours of the session |

The full list and the data model are in [docs/handoff.md](docs/handoff.md).

## Testing and quality

Server (from `server/`):

```powershell
npm test
npm run typecheck
```

Tests run against their own `test.db`, a freezable clock, and with timer-driven simulators disabled.

App (from `app/`):

```powershell
npx tsc --noEmit
npx expo lint
```

Lint runs with strict React Compiler rules.

## Database commands

From `server/`:

```powershell
npm run db:seed      # reseed demo data (wipes the dev database)
npm run db:reset     # drop, migrate and reseed (destructive)
npx prisma migrate dev --name <change>   # after editing schema.prisma
npx prisma generate                      # required after every migration (Prisma 7)
```

## Design assets

Figma is the visual source of truth. Mascot and icon art are exported from Figma as SVG and converted by generator scripts (from `app/`):

```powershell
npm run gen:art
npm run gen:icons
```

Design tokens live in `app/src/theme/tokens.ts`, and components use semantic tokens only.

## Fonts and licensing

The app bundles Qanelas Soft and Qanelas Regular, which are commercial fonts. Keep this repository private or confirm the license before distributing it. Figtree is loaded from `@expo-google-fonts`.

## Documentation

- [docs/handoff.md](docs/handoff.md): full specification (screens, business rules, data model, API, simulation, seed data) and build status
- [CLAUDE.md](CLAUDE.md): working rules for AI-assisted development in this repository
- `docs/*.pdf`: design and presentation deliverables

## Known limitations

- Prototype only: no deployment, no real payments, no real video or push notifications.
- Not yet verified on a physical device (Phase 7).
- Expert-side tooling does not exist; the expert is simulated on the server.
- The bundled fonts require a license for any public distribution.
