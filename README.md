# Haven (prototype)

Spec: [docs/handoff.md](docs/handoff.md). Agent guidance: [CLAUDE.md](CLAUDE.md).

## Run

Server (from `server/`; create `.env` from `.env.example` first):

```
npm install
npx prisma generate
npx prisma migrate deploy   # creates dev.db from the committed migrations
npm run db:seed             # demo data (wipes the dev DB)
npm run dev                 # http://0.0.0.0:3000/api/health
npm test                    # vitest, uses its own test.db
```

`npm run db:reset` = `prisma migrate reset --force` + seed (drops and rebuilds the dev DB).
After changing `prisma/schema.prisma`: `npx prisma migrate dev --name <change>` then `npx prisma generate`.

Demo login (seeded): `choso@haven.id` / `haven123`. OTP is always `1234`. The mock Google account is "Putri Demo".

With `DEMO_MODE=1` the server exposes simulation controls under `/api/dev/*` (clock, reset and reseed, pay or fail an
invoice, verify student, start a session in 10 minutes, end as expert, silence the expert). They are the backend of the
app's dev menu.

App (from `app/`):

```
npm install
set EXPO_PUBLIC_API_URL=http://<LAN-IP>:3000   (PowerShell: $env:EXPO_PUBLIC_API_URL="http://<LAN-IP>:3000")
set EXPO_PUBLIC_DEMO_MODE=1                    (PowerShell: $env:EXPO_PUBLIC_DEMO_MODE="1")
npx expo start
```

Scan the QR with Expo Go. With demo mode on, the home screen links to the component gallery (`/dev/components`).
