# Haven

Mental-health teleconsultation prototype for Indonesian students and young workers. React Native + Expo client app (`app/`), local Express + Prisma + SQLite server (`server/`). Not deployed; every external integration (payments, OTP, Google login, video, realtime chat) is simulated.

## Read this first

**[docs/handoff.md](docs/handoff.md) is the full spec** (screens §6, business rules §7, data model §8, API §9, simulation §10, seed §11, phases §12, decided conflicts §13). Re-read the relevant section before building any screen or rule. Design PDFs live beside it in `docs/`.

**Start with its "Build status" section at the top**: Phases 0–3 are done (server is complete; the app has auth, assessment, Beranda, catalog, expert detail), **Phase 4 is next**. That section lists what exists, the traps already hit (typed-route quirks, Figma export quirks, lint rules), and which Figma links to ask the user for before each phase.

## Key rules

- **Phases:** build in the order of handoff §12 (Phase 0 to 7). Each phase ends runnable; summarize what works. **Do not commit or push unless the user asks**: they write their own commit messages. After finishing a phase, update the "Build status" section of `docs/handoff.md`.
- **Source precedence:** Figma (via MCP) decides layout and visuals, then the M4 PDF. The handoff decides behavior, rules, states, and anything Figma doesn't show. Conflicts are already resolved in §13; don't re-litigate them silently.
- **Ask the user before:** changing the stack, adding a paid or cloud service, dropping a screen, deviating visibly from the hi-fi, or adding the crisis-resources entry (§13).
- **Stack (fixed):** Expo (Expo Go only, no custom native modules), TypeScript strict, expo-router; server is Node + Express + Prisma + SQLite. Client app only; the expert side is a server-side "Ahli simulator". No real encryption claims outside UI copy.
- **Language:** all UI copy is Bahasa Indonesia, informal "kamu" voice, quoted strings verbatim. Code identifiers in English (glossary: Appendix B). Errors never blame the user.
- **Design system:** semantic tokens only in components, never raw hex or primitives. Tokens come from Figma variables (`app/src/theme/tokens.ts`); handoff §4.2 hex values are the fallback. One Figma component maps to one RN component with variants as props; screens only compose them. Qanelas Soft sits behind one font token (Nunito fallback). Touch targets >= 44, page padding 16, safe areas via `react-native-safe-area-context`.
- **States:** every data screen needs loading (skeleton), empty (mascot + one line), and error (retry) states, even if the hi-fi shows one.
- **Assets:** never hand-draw the mascot. Use clearly labeled placeholders until exported from Figma (names in §4.8).
- **Business logic lives on the server and uses the simulated clock** (`clock.now()`, never `new Date()` in business logic). Money is integer rupiah. Times are WIB. Reference SC/FA/BR IDs in comments where a rule is implemented.
- **Critical rules:** BR-08 atomic slot lock (one 201, one 409, with a test), BR-10 pricing (150.000 + 20.000 - 20% = 136.000), BR-12 payment webhook re-verify and idempotency, BR-13 session gate, BR-15 anonymous masking.

## Repo layout

- `app/`: Expo project. Routes are in `app/src/app/` (this template's convention); other code in `app/src/{theme,components,features,api,lib}`; assets in `app/assets/`. Read `app/AGENTS.md` before touching Expo APIs (SDK 58: docs must be fetched, don't trust memory).
- `server/`: Express + Prisma (`prisma/`, `src/{services,flows,sim,routes}`), `db:reset`, `dev`, `test`.
- `shared/`: optional zod schemas; duplicate instead of fighting Metro.
- `docs/`: handoff, PDFs, exported design assets.

## Commands

- App (from `app/`): `npx expo start`, `npx expo install <pkg>` (always, never `npm add`), `npx tsc --noEmit`, `npx expo lint`.
- Server (from `server/`): `npm run dev`, `npm run db:reset`, `npm test`.
- Phone networking: set `EXPO_PUBLIC_API_URL=http://<LAN-IP>:3000`; server binds `0.0.0.0`. `EXPO_PUBLIC_DEMO_MODE=1` and `DEMO_MODE=1` enable the dev menu and simulations.
- Run typecheck and lint before declaring any task done. Lint uses strict React Compiler rules (no `setState` in effects, no `ref.current` in render).
- Server tests: `npm test` in `server/` (89 tests). Regenerate Figma art with `npm run gen:art` / `npm run gen:icons` in `app/` (see handoff "Assets").
- Figma: file key `Kc2HLkoteXoZwBK2BgCGtk`. Export mascots/icons as **SVG** (PNG bakes in a black frame background).
