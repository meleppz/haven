# Haven (prototype)

Spec: [docs/handoff.md](docs/handoff.md). Agent guidance: [CLAUDE.md](CLAUDE.md).

## Run

Server (from `server/`):

```
npm install
npx prisma generate
npx prisma migrate dev     # creates dev.db
npm run dev                # http://0.0.0.0:3000/api/health
npm test
```

`npm run db:reset` runs `prisma migrate reset --force` (drops and reseeds the dev DB).

App (from `app/`):

```
npm install
set EXPO_PUBLIC_API_URL=http://<LAN-IP>:3000   (PowerShell: $env:EXPO_PUBLIC_API_URL="http://<LAN-IP>:3000")
set EXPO_PUBLIC_DEMO_MODE=1                    (PowerShell: $env:EXPO_PUBLIC_DEMO_MODE="1")
npx expo start
```

Scan the QR with Expo Go. With demo mode on, the home screen links to the component gallery (`/dev/components`).
