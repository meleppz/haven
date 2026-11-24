# Haven — Build Handoff for Claude Code

> **What you're building:** a working, demo-able prototype of **Haven**, a mental-health teleconsultation app for Indonesian university students and young workers. It is a **React Native + Expo** app with a **simple local backend** (REST API + SQLite). It is **not deployed**. Every external integration (payments, OTP, Google login, video, real-time chat) is **simulated**.
>
> **Where the design comes from:** two decks made by the same team (ITB, class K02):
> 1. **`K02_T06_M4_Haven.pdf`** (II3131 Interaksi Manusia Komputer, Milestones 1–4) covers research, personas, user tasks, low-fi to hi-fi screens, and the **design system**. Together with Figma, this is the **UI source of truth**.
> 2. **`K02_T05_Deliv2_Presentasi_Haven.pdf`** (II3120 Layanan Sistem & Teknologi Informasi, Deliverables 1–2) covers service decomposition, service candidates SC-01…SC-13, SoaML service contracts S1–S6, and sequence diagrams. This is the **behavior/business-rule source of truth**.
>
> **Figma (hi-fi):** https://www.figma.com/design/Kc2HLkoteXoZwBK2BgCGtk/Haven---IMK?node-id=655-9
> **The user will connect a Figma MCP server for the frontend work. Figma is the primary visual source.** The design descriptions in §4 and §6 tell you *what each screen must do* and give you a fallback when a frame is unclear or missing. See "Working with Figma MCP" in §0.

---

## 0. How to work with this document

- **Put the PDFs in the repo** at `docs/` (ask the user to drop them in if they're missing). The screen specs below cite PDF page numbers, so open those pages when you need visual detail.
- **Precedence when sources disagree:** **Figma (via MCP)** decides layout and visuals, then the M4 PDF if a frame isn't available. **This document** decides behavior, rules, states, and anything Figma doesn't show (loading/empty/error states, validation, navigation targets). Known conflicts are already resolved in §13. Follow those resolutions, and don't re-litigate them silently.
- **Build in the phases in §12.** Each phase must end in a runnable state. If git is set up, commit at each phase boundary. At the end of each phase, summarize what works and continue.
- **Ask the user before you:** change the stack, add a paid or cloud service, drop a screen, or deviate visibly from the hi-fi layout.
- **The user is the team's design lead.** Visual fidelity to Figma matters. When unsure about a visual detail, check Figma (or the PDF page) rather than improvising.

### Working with Figma MCP
- **Tokens first.** Before building screens, read the file's variables/styles (colors, text styles, spacing, effects) and generate `app/src/theme/tokens.ts` from them. The sampled hex values in §4.2 are only a fallback; replace them with the Figma values and note any that differ noticeably.
- **Find frames by screen code.** Frames should be named with the codes used here (e.g. `L51 – Detail Psikolog`). If a frame can't be found, ask the user for its link or to select it, rather than guessing from the PDF.
- **Translate, don't paste.** Figma MCP output is usually web code (React/HTML + Tailwind/CSS). Rebuild it as React Native components using the theme tokens and the shared components from §4.7. Don't hardcode values the MCP returns when a token exists for them.
- **Components map 1:1.** Match each Figma component (Button, Chip, Field, Modal, Navbar, Toast) to one RN component with variants as props, built once in Phase 0. Screens should only compose those.
- **Assets.** Export the mascot poses, feature icons, logos, and images through the MCP when it supports asset export, into `app/assets/` with the names in §4.8. Otherwise, ask the user to export them.
- **Figma shows one state; you build all of them.** Pressed, disabled, loading, empty, error, keyboard-open, and long-text cases come from §6 and §7, not from the frame.
- **Check each screen against its frame** after building it (spacing, type styles, colors, radius), and list any intentional deviations (e.g. §13 decisions) in the phase summary.

- **Language:** all UI copy is **Bahasa Indonesia** and uses the informal, warm "kamu" voice. Quoted strings in this doc are the intended copy, so use them verbatim. Write code identifiers in English. Appendix B maps Indonesian domain terms to English names.

---

## 1. Product summary

**Haven: "Ruang Telekonsultasi Mental yang Aman dan Empatik."** Haven helps users find a licensed psychologist or psychiatrist, book a session that fits their schedule and budget, pay quickly, and consult privately by video, voice, or chat, with an optional **anonymous mode**.

### Personas (M4 deck p.10–11)
- **Putri, 19, university student.** Anxious, struggling to sleep, on a tight budget, afraid of stigma, and doesn't know where to start. Needs a **student discount**, privacy, and a gentle first step.
- **Ana, 27, corporate worker.** Burned out, and clinic hours clash with her job. Needs **evening/weekend slots** and **fast booking**.

### Pain points → what the app must do (p.7, p.12–13, p.26–27)
| Pain point | Feature (functionality ID) |
|---|---|
| M1 No time | Filter slots by time (evening/weekend), earliest-slot view, online sessions (F3.1, F3.2, F5.1) |
| M2 Too expensive | Price-range filter, **student discount 20%** via student verification (F4.1) |
| M3 Can't find a fitting psychologist | Initial assessment → recommendations (F2.1, F2.2) |
| M4 No transparency | Profile with license number, verified badge, rating, and reviews, all within 1 tap (F2.3–F2.5) |
| M5 Fear of data leaks | Explicit **"Terenkripsi End-to-End"** notice before and during sessions (F6.1) |
| M6 Stigma | **Anonymous mode**: per booking, plus a default in Settings (F5.2) |
| M7 Complicated registration/payment | Short booking flow, QRIS payment (F3.3, F4.2) |
| M8 No comfortable place to talk | Real-time chat during sessions, post-session notes and advice (F5.3, F5.4) |
| FAQ/help | Profile page with FAQ and helpdesk (F7.1) |

### Measurable usability goals (p.28): use these as acceptance hints
- Full booking flow takes **≤ 5 steps and ≤ 10 minutes**.
- Recommendations appear after **≤ 3 assessment steps**.
- License, rating, and reviews are reachable in **1 tap** from the catalog.
- Price filtering works **without opening each profile**.
- Anonymous mode is **1 toggle**, and it never blocks the main booking flow.

### UX goals (p.29)
Praktis & Fleksibel · Yakin & Sesuai · Transparansi · Terjangkau · Diterima & Didengar · Terlindungi · Kemudahan.

---

## 2. Fixed scope decisions

| Area | Decision |
|---|---|
| App | **React Native + Expo**, TypeScript (strict), **expo-router**. Must run in **Expo Go**: no custom native modules. |
| Backend | **Node.js + TypeScript + Express + Prisma + SQLite**, runs locally on the dev machine. |
| Who uses the app | **Client (Klien) app only.** The expert (Ahli) side is played by a server-side **"Ahli simulator"** (§10). There is no admin panel. |
| Payments | Simulated payment gateway inside the server (§10). No real money. |
| OTP | Simulated. The code is always `1234` in demo mode. |
| Google sign-in | Simulated, using a mock account picker. |
| Video/voice call | The user's own camera is real (expo-camera preview). The expert's feed is a placeholder. No WebRTC. |
| Chat | Real persistence via REST plus polling. The expert's replies come from the Ahli simulator. |
| E2E encryption | **UI only** (badges and a consent record). Do not claim real encryption anywhere outside the UI copy. |
| Push notifications | Out of scope. Use in-app toasts only. |
| Deployment | Out of scope. |

### Suggested libraries (all Expo Go compatible; use the latest stable versions)
`expo-router`, `expo-font`, `@expo-google-fonts/figtree` (and `@expo-google-fonts/nunito` as the heading fallback, see §4.4), `expo-linear-gradient`, `expo-camera`, `expo-secure-store`, `expo-document-picker`, `expo-print` + `expo-sharing` (receipt), `react-native-view-shot` (save QR), `react-native-svg` + `react-native-qrcode-svg`, `@gorhom/bottom-sheet` (with `react-native-reanimated` + `react-native-gesture-handler`), `@tanstack/react-query`, `zustand`, `react-hook-form` + `zod`, `date-fns` (with the `id` locale), and a pure-JS range slider (e.g. `@ptomasroos/react-native-multi-slider`). Icons: export from Figma as SVG (preferred), or fall back to `@expo/vector-icons` **Ionicons**, which has the outline/filled pairs the navbar needs.

Server: `express`, `prisma`, `zod`, `bcryptjs`, `jsonwebtoken` (or opaque tokens), `vitest` + `supertest`.

---

## 3. Repo layout and dev setup

```
haven/
├─ app/                      # Expo app (expo-router)
│  ├─ app/                   # routes (see §5)
│  ├─ src/
│  │  ├─ theme/              # tokens.ts, typography.ts, gradients.ts
│  │  ├─ components/         # design-system components (§4.7)
│  │  ├─ features/           # auth, assessment, experts, booking, payment, session, profile
│  │  ├─ api/                # typed client + react-query hooks
│  │  └─ lib/                # formatters (Rp, dates WIB), storage, constants
│  └─ assets/                # fonts/, mascot/, images/, icons/
├─ server/
│  ├─ prisma/                # schema.prisma, seed.ts
│  └─ src/
│     ├─ services/           # one module per service candidate (§9): auth, experts, schedule, clients,
│     │                      #   bookings, payments-gateway, transactions, session-comm, notes, reviews
│     ├─ flows/              # task services: registration-flow (SC-11), payment-flow (SC-12), session-flow (SC-13)
│     ├─ sim/                # mock gateway, ahli simulator, clock
│     ├─ routes/             # HTTP layer
│     └─ index.ts
├─ shared/                   # zod schemas + TS types used by app and server (optional; see note)
└─ docs/                     # the two PDFs + this handoff + exported design assets
```

- **Why `services/` and `flows/`:** this mirrors the service design in the LSTI deck. Entity/utility services own data, and task services (SC-11/12/13) own the Haven-specific rules and orchestration. It is a **single Express process** (the deck itself concludes no microservices are needed, p.23), but the code boundaries should match. Reference SC/FA IDs in comments where a rule is implemented.
- **The Expo project already exists in `app/`** (created with `create-expo-app`, default template). Keep the template's folder convention: if routes live in `app/src/app/` rather than `app/app/`, put routes there and the other `src/` folders above beside them. Read the template's generated `AGENTS.md` for Expo-specific guidance.
- **`shared/`** is nice to have for validation that runs on both sides. If the Metro monorepo setup becomes painful, duplicate the zod schemas instead of fighting it.
- **Scripts:** `server`: `dev`, `db:reset` (migrate + seed), `test`. `app`: `start`. Add a root README with the run steps.
- **Networking gotcha:** a phone running Expo Go can't reach `localhost`. Use `EXPO_PUBLIC_API_URL=http://<LAN-IP>:3000`. The Android emulator uses `10.0.2.2`, and the iOS simulator can use `localhost`. Bind the server to `0.0.0.0`.
- **Demo flag:** `EXPO_PUBLIC_DEMO_MODE=1` enables the dev menu and the simulation buttons (§10).

---

## 4. Design system (M4 deck p.85–89)

### 4.1 Theme, metaphor, voice
- **Theme:** *Ruang Aman yang Tenang* (a calm, safe space). **Metaphor:** *Ruang berlindung yang teduh* (a shaded shelter).
- **Visual feel:** soft cream/white surfaces, gentle yellow-to-light-blue gradients in headers, a deep-blue primary for actions, a navy navbar with a yellow active state, rounded shapes, and a friendly **cloud mascot**.
- **Voice:** warm, non-judgmental, "kamu". Error messages never blame the user (e.g. "Kodenya belum cocok, coba cek lagi ya" rather than "Kode salah").

### 4.2 Color primitives
Each scale has 10 steps, light → dark. The deck doesn't print hex values, so these were **sampled from the rendered slide and are accurate to within a few RGB units**. **Use the Figma variables via MCP as the real values**; this table is the fallback and a sanity check.

| Scale | 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 |
|---|---|---|---|---|---|---|---|---|---|---|
| primary (blue) | #F5FAFE | #C6E6FF | #98D1FE | #71BDFB | #50ACF7 | #399EF0 | #278FE4 | #1A7FD1 | #126AB2 | #0A4879 |
| secondary (yellow) | #FFFCF5 | #FEEFC6 | #FDE198 | #FBD371 | #F6C751 | #F1BC3A | #E4AE27 | #D09E19 | #B28512 | #7A590A |
| neutral | #FFFFFF | #F6FAFD | #EFF4F8 | #E4EBF1 | #CBD5DE | #BAC4CD | #A7B0B9 | #9099A0 | #7A8187 | #2E3337 |
| danger | #FFF5F4 | #FFC7C6 | #FE9C99 | #FA7471 | #F55652 | #EB3E38 | #DE2D27 | #C7201A | #9F140F | #5B0A07 |
| warning | #FFFAF6 | #FEE3C6 | #FECC99 | #FBB871 | #F4A651 | #EC9538 | #DE8625 | #C77319 | #9F5A0F | #5C3307 |
| success | #F5FFF7 | #C7FFDA | #98FCBC | #71FAA2 | #52F58A | #39EC77 | #26DD67 | #19C756 | #0FA041 | #075C25 |
| info | #F5FDFF | #C6F5FF | #98EBFD | #71E1F9 | #51D6F5 | #38CBEC | #26BCDD | #18A7C7 | #0E869F | #074C5C |

### 4.3 Semantic tokens
Components must use **semantic tokens only**, never raw hex or primitives. These mappings were derived by sampling the component slides.

| Token | Value | Used for |
|---|---|---|
| `action.primary` | primary-700 | Main CTA fill, selected chip, toggle on, links |
| `action.primary.pressed` | primary-900 | Pressed CTA |
| `action.primary.tonal` | primary-100 bg + primary-700 text/border | Tonal/secondary-emphasis button |
| `action.secondary` | secondary-300 | Yellow button |
| `action.secondary.pressed` | secondary-700 | |
| `action.danger` | danger-600 | "Keluar", "Batalkan Jadwal", end-call |
| `action.danger.pressed` | danger-900 | |
| `action.disabled` | ≈ #B4AC9A (sampled; verify) | Disabled button fill |
| `text.primary` | neutral-900 | Body text |
| `text.secondary` | neutral-800 | Captions, meta |
| `text.placeholder` | neutral-600 | Input placeholders |
| `text.brand` | primary-700 | Screen and section titles ("Masuk", "Jelajahi Fitur Haven") |
| `text.brandStrong` | primary-900 | Hero titles ("Selamat datang di Haven!", "Pembayaran Berhasil!") |
| `text.onPrimary` | neutral-0 | Text on blue |
| `text.highlight` | secondary-700/800 | e.g. "Konsultasi dalam 7 hari", discount row |
| `surface.page` | neutral-0 | Screen background (under the gradients) |
| `surface.card` | neutral-0 + shadow | Cards |
| `surface.muted` | neutral-100 | Inactive tab track, muted blocks |
| `surface.priceTag` | secondary-100 | Price pill on expert cards |
| `border.default` | neutral-300 | Inputs, outline chips, dividers |
| `border.focus` | secondary-300 | Focused input |
| `border.error` | danger-600 | Input error; error text danger-700, 12px |
| `nav.bg` | primary-900 | Bottom navbar |
| `nav.active` | secondary-300 | Active icon (filled) and label |
| `nav.inactive` | neutral-400 | Inactive icon (outline) and label |
| `rating.star` | secondary-500 | Stars and score |
| `badge.verified` | primary-700 | Check badge beside the expert's name |
| `status.active` | success-700 bg, white text | "Aktif" chat status |
| `status.done` | primary-900 bg, white text | "Selesai" chat status |
| `toast.info` | neutral-0 bg, title primary-900 | "10 menit lagi ada konsultasi!" |
| `toast.danger` | danger-50 bg, title danger-700 | |
| `toast.success` | success-50 bg, title success-900 | |

**Gradients** (approximate; check Figma): *header* = soft diagonal from secondary-100 (top-left) to primary-50/100 (right). *Hero screens* (auth top half, assessment intro and finish, payment success, session finished) = primary-200/300 at the top fading to a cream/secondary-100 tone at the bottom. Use `expo-linear-gradient`.

**Contrast note:** white on primary-700 is about 4.2:1, which passes for large or semibold text. Keep CTA labels semibold at ≥14px. For small white text, use primary-800/900 instead.

### 4.4 Typography
| Style | Font | Weight | Size |
|---|---|---|---|
| display | Qanelas Soft | Bold | 42 |
| h1 | Qanelas Soft | Bold | 32 |
| h2 | Qanelas Soft | Semibold | 24 |
| h3 | Qanelas Soft | Semibold | 20 |
| title | Figtree | Semibold | 18 |
| body-m | Figtree | Regular | 16 |
| body-s | Figtree | Regular | 14 |
| body-xs | Figtree | Regular | 12 |

- Figtree comes in Regular, Medium, Semibold, and Bold. Use Medium/Semibold for labels and buttons.
- Line height isn't specified. Use about 1.25× for headings and 1.5× for body.
- **Qanelas Soft is a commercial font.** If the team has the font files, put them in `assets/fonts/`. Otherwise, use **Nunito** (Bold/SemiBold) as the fallback and tell the user. Keep the font family behind one token so swapping is a one-line change.

### 4.5 Spacing, radius, elevation, layout
- **Spacing scale:** 4, 8, 12, 16, 24, 32, 36, 42, 48, 64.
- **Radius** (not specified; estimated from the hi-fi, so verify in Figma): button/input 10, card 12–16, bottom sheet top 20, chip/pill full.
- **Shadow** (Figma: X0 Y4 Blur12 Spread0, #000 at 12%): `shadowColor:#000, shadowOffset:{width:0,height:4}, shadowOpacity:0.12, shadowRadius:6, elevation:3`. On newer RN with the New Architecture, `boxShadow: '0 4px 12px rgba(0,0,0,0.12)'` also works.
- **Layout grid:** mobile, 4 columns. The top row of 47px (status bar) and bottom row of 34px (home indicator) correspond to **safe areas**, so use `react-native-safe-area-context`. Page horizontal padding is 16.
- **Touch targets** must be ≥ 44×44.

### 4.6 Icons (p.88)
Outline by default and **filled when active**. The core set is: hospital/plus (Ruang Konsultasi), search, user, home, chat bubble, chevron-right, and chevron-left. The navbar uses: Beranda=home, Cari=search, Ruang Konsultasi=hospital, Pesan=chat, Profil=user. Feature icons on Beranda are colorful illustrated icons, so export them from Figma as PNG/SVG.

### 4.7 Components to build first
Show them all on a `/dev/components` gallery screen (demo mode only).

- **Button**: variants `primary | primaryTonal | outline | secondary(yellow) | danger | dangerOutline`; states default/pressed/disabled/loading; sizes md (full-width CTA) and sm (card CTA such as "Lihat Profil").
- **Chip**: outline (unselected) and filled primary (selected); sizes md and sm; single- and multi-select groups.
- **TextField / PasswordField / SearchField / TextArea**: label above, placeholder, focus border yellow, error state with a red border and a "* message" below.
- **Toggle, Radio, Checkbox.**
- **SegmentedTabs**: pill track ("About / Appointment / Review").
- **DateNavigator + WeekStrip**: a "‹ Senin, 12 Januari 2025 ›" bar on a secondary-100 background, plus a row of 6 days (Sen–Sab). The selected day gets a highlighted pill.
- **SlotChip**: "14.00-15.00"; available/selected/disabled.
- **Card, ExpertCard (catalog), ExpertMiniCard (home carousel), SessionCard, HistoryCard, ChatListItem, StatTile** (e.g. "100+ / Jam Konseling"), **RatingStars**, **Avatar**, **Badge** (verified check, Aktif/Selesai, "Terenkripsi End-to-End · Anonim", timer pill).
- **PromoBanner**: mascot + text + toggle/CTA. **QuickAccessTile**: illustrated icon + label.
- **BottomSheet modal**: drag handle, mascot illustration, title (primary-900, semibold), body (body-xs, secondary text), one primary CTA. See the four examples on p.89.
- **Toast**: mascot thumbnail, title, body, "Now" timestamp; info/danger/success.
- **Header**: gradient band, "‹" back button, title in `text.brand`, optional right action.
- **ProgressDashes**: the breadcrumb in multi-step forms. Short horizontal dashes at the top center, with the current step in secondary-400 and the others faint.
- **BottomNavbar**: 5 tabs (§5).
- **Accordion**: FAQ.

### 4.8 Mascot and image assets
The mascot is a **soft blue cloud with a yellow two-leaf sprout (red bud) on top**, round black eyes, and a simple smile. **Don't try to draw it in code.** Export these from Figma (via MCP if possible, otherwise ask the user) into `app/assets/mascot/` (PNG @2x/@3x or SVG):

| File | Pose | Used on |
|---|---|---|
| `mascot-wave.png` | Arms up, happy | Masuk, Daftar, Asesmen intro, Asesmen selesai, Beranda assessment banner |
| `mascot-celebrate.png` | Arms up, sparkles, blush | Pembayaran Berhasil, Konsultasi Selesai |
| `mascot-peek.png` | Peeking from a corner | Ruang Tunggu (camera preview corner) |
| `mascot-student.png` | Holding a student ID card, graduation cap | Promo banner (Pemesanan), Verifikasi Mahasiswa banner |
| `mascot-happy-small.png` | Content | Modal "Status mahasiswamu sudah terverifikasi!", toasts |
| `mascot-sad.png` | Worried | Modal "Kamu belum terverifikasi sebagai mahasiswa" |
| `mascot-confused.png` | Question marks | Modal "Keluar dari aplikasi Haven?" |
| `mascot-annoyed.png` | Frowning, red mark | Sheet "[Nama] tidak merespon?" |

Also needed: the Beranda feature icons (8), expert photos (or use initials avatars), the "Informasi Lainnya" banner image, payment logos (BCA, QRIS, GoPay, OVO, DANA), and the app logo. Until the real assets arrive, use **clearly labeled placeholders**, not hand-drawn imitations.

---

## 5. Information architecture and navigation

**Bottom tabs** (navbar visible): **Beranda** (L42) · **Cari** (L52) · **Ruang Konsultasi** (L22.1) · **Pesan** (L91.1) · **Profil** (L84).
Everything else is a stack screen with no navbar.

### Screen inventory
"M4 p." is the page in the M4 deck: *concept* = hi-fi screens with design principles, *map* = lo-fi→hi-fi change notes. "M2 p." is the original component and behavior description.

| Code | Screen | Route | M4 p. (concept / map) | M2 p. |
|---|---|---|---|---|
| L81.1 | Masuk (Login) | `/(auth)/login` | 91 / 106 | 41 |
| L81.2 | Daftar (Register) | `/(auth)/register` | 91 / 107 | 41 |
| L81.3 | Konfirmasi OTP | `/(auth)/otp` | 92 / 108 | 42 |
| L81.4 | Nama Pengguna | `/(auth)/name` | 92 / 109 | 42 |
| L81.5 | Password | `/(auth)/password` | 92 / 110 | 42 |
| L41.1 | Asesmen – Intro | `/assessment` | 93 / 111 | 43 |
| L41.2 | Asesmen – Usia | `/assessment/age` | 93 / 112 | 43 |
| L41.3 | Asesmen – Pekerjaan | `/assessment/occupation` | 93 / 113 | 43 |
| L41.4 | Asesmen – Permasalahan | `/assessment/concerns` | 94 / 114 | 44 |
| L41.5 | Asesmen – Selesai | `/assessment/done` | 94 / 115 | 44 |
| L42 | Beranda | `/(tabs)/index` | 95 / 116 | 45 |
| L52 | Katalog Layanan + Filter sheet | `/(tabs)/search` | 96 / 120 | 46–47 |
| L51 | Detail Psikolog | `/experts/[id]` | 97 / 117–119 | 48–49 |
| L82 | Pemesanan | `/booking/[expertId]` | 98 / 121 | 50 |
| L31 | Verifikasi Status Mahasiswa | `/student-verification` | 99 / 122 | 51 |
| L83.1 | Pembayaran | `/payment/[bookingId]` | 100 / 123 | 52 |
| L83.2 | Menunggu Pembayaran (QRIS) | `/payment/[bookingId]/pending` | 100 / 124 | 52 |
| L83.3 | Pembayaran Berhasil | `/payment/[bookingId]/success` | 100 / 125 | 52 |
| L22.1 | Ruang Konsultasi | `/(tabs)/sessions` | 101 / 126 | 53–54 |
| L22.2 | Ruang Tunggu | `/session/[bookingId]/waiting` | 101 / 127 | 55 |
| L22.3 | Video Call Room | `/session/[bookingId]/call` | 102 / 128 | 56–57 |
| L91.1 | List Chat (Pesan) | `/(tabs)/messages` | 102 / 132 | 58 |
| L91.2 | Chat Room | `/session/[bookingId]/chat` | 104 / 133–134 | 59–60 |
| L53.1 | Sesi Selesai + Ulasan | `/session/[bookingId]/done` | 103 / 129 | 61 |
| L53.2 | Detail Konsultasi | `/history/[bookingId]` | 103 / 130 | 62 |
| L84 | Profil (called L16 in M2) | `/(tabs)/profile` | 105 / 135 | — |
| L71 | Pengaturan | `/settings` (+ stub subpages) | 105 / 131 | 63 |
| — | Dev menu, component gallery | `/dev`, `/dev/components` | — | — |

### Main flows (M2 navigation diagram, p.40)
1. **Onboarding:** Daftar → OTP → Nama → Password → Asesmen intro → (Usia → Pekerjaan → Permasalahan → Selesai) *or* "Nanti Aja" → Beranda.
2. **Login:** Masuk → Beranda. (Only right after registration do users land on Asesmen intro.)
3. **Find and book:** Beranda/Cari → Detail Psikolog → Pemesanan → (optional Verifikasi Mahasiswa → back to Pemesanan) → Pembayaran → Menunggu Pembayaran → Pembayaran Berhasil → Beranda or Ruang Konsultasi.
4. **Attend:** Ruang Konsultasi → Ruang Tunggu → Video Call ⇄ Chat Room → Sesi Selesai → Detail Konsultasi / Booking Lagi (→ Cari) / Beranda.
5. **History:** Ruang Konsultasi "Riwayat" or Pesan → Detail Konsultasi / Chat Room (read-only).
6. **Account:** Profil → Pengaturan (gear icon) → toggles / Keluar.

**Route guard:** unauthenticated → `/(auth)/login`. Store the token in `expo-secure-store` and restore the session on launch.

---

## 6. Screen specs

Layouts are listed **top → bottom**. The "→" symbol marks the API call or navigation. Every data screen needs **loading** (skeletons), **empty** (mascot + one-line copy), and **error** (retry) states, even where the hi-fi doesn't show them.

### 6.1 Auth

**L81.1 Masuk.** Hero gradient top half with `mascot-wave` and title "Masuk" (h1, `text.brand`). Fields: "Email/No. Telepon", "Password". Primary "Masuk", outline "Masuk dengan Google", footer "Belum punya akun? **Daftar**" (link → L81.2).
→ `POST /auth/login`. Invalid credentials: an inline error under the password field, "Email/nomor atau password belum cocok."
"Masuk dengan Google" opens a mock account picker sheet showing the demo Google account → `POST /auth/google`.

**L81.2 Daftar.** Same hero with title "Daftar". One field, "Email/No. Telepon". Primary "Daftar", outline "Daftar dengan Google", footer "Sudah punya akun? **Masuk**".
Validation: valid email **or** an Indonesian phone number (`08…`/`+62…`, 10–14 digits). → `POST /auth/register/start` → L81.3.

**L81.3 / L81.4 / L81.5: registration steps.** Each has a back chevron at the top-left and **ProgressDashes (3 steps)** at the top center. Content sits on a light gradient with a full-width "Lanjut" CTA above the keyboard.
- **OTP:** title "Masukkan Kode OTP" (the hi-fi has a typo, "Masukan"). Caption "Silakan cek email/SMS terbaru", 4 code boxes with auto-advance, "Belum menerima kode OTP? **Kirim Ulang (59)**" with a 60-second countdown (the link is disabled until it reaches 0). → `POST /auth/register/verify-otp`. Demo code: `1234`. In demo mode, show a toast "Kode demo: 1234".
- **Nama:** title "Siapa Nama Kamu?", field "Nama" (required, 2–50 characters).
- **Password:** title "Tentukan Password untuk Akun Havenmu", fields "Password" and "Konfirmasi Password" (min 8 characters, must match). → `POST /auth/register/complete` (creates the account and returns a token) → L41.1.

### 6.2 Initial assessment (UT4.1, FA-04)
**L41.1 Intro:** full gradient, title "Selamat datang di Haven!" (`text.brandStrong`), `mascot-wave`, caption "Akunmu berhasil dibuat. Lakukan asesmen singkat supaya Haven bisa menyesuaikan layanan terbaik untukmu!" Primary "Lakukan Asesmen 2 Menit", outline "Nanti Aja" (skip → Beranda; the assessment banner then stays on Beranda). **No progress dashes on this screen** (deliberate M4 change).

**L41.2 Usia:** "Berapa Usiamu?", numeric field "Usia", helper "Pastikan usia sesuai dengan kartu identitas.", "Lanjut". Valid range 13–100.
**L41.3 Pekerjaan:** "Apa Pekerjaanmu?", text field "Pekerjaan" (required). Free text, but also offer quick-pick chips "Mahasiswa" and "Pekerja" above the field. This is an addition; it makes the recommendation rule (§7, BR-04) reliable.
**L41.4 Permasalahan:** "Apa yang kamu rasakan?" multi-select chips: **Frustrasi, Lelah, Butuh Teman Cerita, Overwhelmed, Panik, Sulit Bersosialisasi, Kesulitan Akademik, Beban Kerja Tinggi** (at least 1 required). TextArea "Deskripsikan Permasalahanmu (opsional)" (≤ 500 characters). "Lanjut" → `PUT /me/assessment`.
**L41.5 Selesai:** title "Terima Kasih sudah Berbagi", `mascot-wave`, caption "Ayo mulai bercerita dan temukan ruang amanmu dengan bantuan Haven!", primary "Masuk ke Haven" → Beranda.

ProgressDashes span 3 steps (Usia, Pekerjaan, Permasalahan). Back is always allowed and keeps answers.

### 6.3 L42 Beranda (UT4.2)
1. **Header** (gradient): avatar, "Halo" (caption), user name (title), SearchField "Cari…" (tapping it → Cari tab with the search input focused).
2. **"Jelajahi Fitur Haven"**: a 4×2 grid of QuickAccessTiles. The hi-fi doesn't define the targets, so this mapping is an assumption:
   | Tile | Action |
   |---|---|
   | Bisa hari ini | Cari, with `availableToday=true` |
   | Ahli 24/7 | Cari, with chip "Konsultasi 24/7" on |
   | Promo | Cari, with chip "Promo Mahasiswa" on |
   | Khusus mahasiswa | L31 Verifikasi Mahasiswa (or the "verified" modal if already verified) |
   | Cari ahli | Cari |
   | Rating tertinggi | Cari, sorted by rating |
   | Riwayat konsultasi | Ruang Konsultasi tab, scrolled to Riwayat |
   | Bantuan | Profil, scrolled to FAQ |
3. **Assessment banner** (only if the assessment isn't done): `mascot-wave`, "Cek kesehatan mental supaya Haven bisa menyesuaikan layanan terbaik untukmu", button "Lakukan Asesmen 2 Menit" → L41.2.
4. **"Jadwal Konsultasi"**: the next upcoming paid session. "Konsultasi dengan {nama}", a relative label in `text.highlight` ("Konsultasi dalam 7 hari" / "Dimulai dalam 10 menit"), and the date/time on the right ("10 Jan, 8.00 WIB"). Tap → Ruang Konsultasi. Hide the section if there is none.
5. **"Butuh Psikolog Sekarang?"** with the subtitle "Rekomendasi terbaik sesuai kondisi kamu!": a horizontal carousel of ExpertMiniCards (photo, name + verified badge, ★ rating (count), up to 2 specialty tags, "Lihat Profil" → L51). Data: `GET /recommendations`.
6. **"Informasi Lainnya"**: banner card with image, "Cek kesehatan mentalmu dalam 5 menit", yellow button "Cek Sekarang" → assessment.
7. Navbar.

**Toast:** while the app is open and a paid session starts within 10 minutes, show the info toast "10 menit lagi ada konsultasi!" once per session.

### 6.4 L52 Katalog Layanan "Layanan Tersedia" (UT5.2, UT1.1, UT2.1)
- Header: title "Layanan Tersedia", SearchField "Cari…" (matches name and specialty), and a square filter icon button → Filter sheet.
- Quick filter chips (toggle, horizontal scroll): **"Konsultasi 24/7"**, **"Jadwal Terdekat"** (sorts by earliest available slot), **"Promo Mahasiswa"**.
- **ExpertCard** list: photo, name + verified badge, specialties joined by " | " ("Kecanduan | Keluarga"), mode icons ("Chat", "Video Call"), ★ "4.5 (200)", **"Jadwal Terdekat"** with the 3 nearest dates that have free slots as small chips ("Okt 11"; tap → L51 Appointment tab with that date preselected), price pill **"Rp300.000/sesi (1 jam)"** (`surface.priceTag`), primary sm button "Lihat Profil".
- **Filter bottom sheet** (title "Filter"), all chips:
  - **Kategori:** Semua · Psikolog · Psikiater
  - **Urutkan Berdasarkan:** Harga tertinggi · Harga terendah · Lama pengalaman · Rating
  - **Spesialisasi** (multi): Semua · ADHD · Autisme · Keluarga · Gender · Pernikahan · Tumbuh Kembang · Emosi · Adiksi · Anak
  - **Harga per Sesi:** a range slider from Rp50.000 to Rp2.000.000+, with the selected range shown live in `text.brand` ("Rp200.000 - Rp1.200.000")
  - **Pengalaman:** Semua · 1-2 thn · 2-5 thn · > 5 thn
  - **Waktu** (added; see §13 #4): Semua · Pagi · Siang · Malam · Akhir Pekan
  - CTA **"Lihat Layanan Tersedia"** applies the filters and closes the sheet. Show the active filter count on the filter icon.
→ `GET /experts?q=&category=&specialties=&minPrice=&maxPrice=&experience=&timeOfDay=&weekend=&sort=&chips=`

### 6.5 L51 Detail Psikolog (UT5.1–5.3)
- Large photo header on a gradient, "‹ Kembali" at the top-left.
- A white sheet overlaps the photo: **name + verified badge**, then the license number **"No. STR: 0417-21-2-1"** (label by expert type, see §13 #6). Make the license line tappable: a small sheet explains "Nomor ini dapat dicek di situs resmi {KTKI/HIMPSI}" (M3 feedback: make the license more prominent and verifiable).
- **SegmentedTabs: About · Appointment · Review.**
  - **About:** "Spesialisasi" chips (tap a chip → tooltip sheet with a one-line explanation, per M3 feedback), "Pengalaman" StatTiles on secondary-100: "100+ Jam Konseling", "3+ Tahun Pengalaman", "60+ Klien Terbantu".
  - **Appointment:** available modes (Chat / Video Call / Panggilan Suara with icons), price **"300rb" per sesi (1 jam)**, "Jadwal Konsultasi" DateNavigator + WeekStrip, "Slot Tersedia" SlotChips for the selected date. A selected slot carries over to Pemesanan.
  - **Review:** big "★ 4.5 /5.0", "200 reviews", review cards ("Anonymous", relative date, 5 stars, text), paginated.
- Floating primary CTA **"Pesan Konsultasi"** → L82 (with the selected date/slot if any).
→ `GET /experts/:id`, `GET /experts/:id/slots?date=YYYY-MM-DD`, `GET /experts/:id/reviews?cursor=`

### 6.6 L82 Pemesanan (UT8.2, S1 `validasiFormulirPendaftaran` + `pesanSlotKonsultasi`)
Scrolling form, header "‹ Pemesanan":
1. **"Ahli"** card: photo, name + badge, "No. STR …", ★ rating (count).
2. **"Tanggal Konsultasi"**: DateNavigator + WeekStrip.
3. **"Slot Tersedia"**: SlotChips. Selected = filled primary.
4. **"Konsultasi Anonim"** toggle, with the caption "Konsultasi anonim menjaga identitasmu demi kenyamananmu saat berkonsultasi". The default comes from Settings (BR-14).
5. **Promo card** (`mascot-student`): "Kamu Mahasiswa? Jangan lupa aktifkan diskon khusus!" + toggle "Gunakan Promo Mahasiswa".
   - If the user is **not verified** and turns it on, show the bottom sheet `mascot-sad` "Kamu belum terverifikasi sebagai mahasiswa", body "Verifikasi status mahasiswa hanya 5 menit untuk mendapatkan promo menarik", CTA "Verifikasi Status Mahasiswa" → L31. The toggle stays off until verification succeeds.
   - If verified, it turns on. If the "Gunakan Promo Mahasiswa Otomatis" setting is on, it starts on.
6. **"Mode Konsultasi yang Dipilih"**: radio list **Obrolan Chat / Panggilan Suara / Panggilan Video**. Only the expert's supported modes are enabled.
7. **"Deskripsi Singkat Masalah"**: TextArea, placeholder "Ceritakan masalahmu dengan singkat" (optional, ≤ 500 characters; prefilled from the assessment description if present).
8. CTA **"Pesan Konsultasi"** → `POST /bookings`.
   - **201** → L83.1.
   - **409 `SLOT_CONFLICT`** → danger toast "Slot ini baru saja dipesan orang lain. Silakan pilih slot lain.", refresh the slots, clear the selection.
   - **422** → inline field errors.

### 6.7 L31 Verifikasi Status Mahasiswa (UT3.1, FA-17)
Header "‹ Verifikasi Status Mahasiswa". Banner (`mascot-student`) "Aktifkan diskon khusus Mahasiswa & dapatkan potongan 20%!". Body: "Untuk proses verifikasi diskon mahasiswa, diperlukan bukti sebagai bagian dari Universitas (KTM, Transkrip, atau Jadwal Kuliah). Untuk perihal keamanan, baca **Syarat dan Ketentuan Haven.**"
Fields: "Nama", "Asal Universitas", "Bukti Pengguna Bagian dari Universitas" (hint "KTM, Transkrip, atau Jadwal Kuliah") with an outline button "Unggah Dokumen" and the hint "Unggah 1 dokumen, maksimal 10 MB." (jpg/png/pdf; show the file name after picking). Checkbox "Dengan ini saya menyetujui **S&K Haven.**" (required). CTA "Verifikasi Status".
→ `POST /me/student-verification` (multipart). On success, show the sheet `mascot-happy-small` "Status mahasiswamu sudah terverifikasi!", body "Kamu bisa menikmati promo mahasiswa sekarang.", CTA "Kembali ke Halaman Pemesanan" (or "Kembali" if not opened from booking).
**If already verified when opened:** show a verified state (badge + university + verified date) instead of the form. **Verification is done only once.**

### 6.8 Payment (UT8.3, S2/S3)
**L83.1 Pembayaran.** Header "‹ Pembayaran".
- **"Detail Pesanan"** card: photo, name, mode ("Panggilan Video"), "Anonim" if on.
- **"Rincian Pembayaran"** (example values from the hi-fi; real values come from BR-10): "Biaya Konsultasi Rp150.000", "Biaya Administrasi Rp20.000", "Diskon Mahasiswa 20% −Rp34.000" (in `text.highlight`; only if applied), divider, **"Total Rp136.000"**.
- **"Metode Pembayaran"** radio cards with logos: **Transfer Bank** (Bank BCA), **QRIS** (gopay, OVO, BCA + Lainnya), **Virtual Account Billing**, **E-Wallet** (DANA, gopay, OVO + Lainnya).
- **Sticky footer** on secondary-100: "Total Rp136.000", "Hemat Rp34.000", primary "Bayar" (disabled until a method is chosen).
→ `GET /bookings/:id/payment-summary`, then on "Bayar" → `POST /bookings/:id/invoice {method}` → L83.2.

**L83.2 Menunggu Pembayaran.** "Rincian Pembayaran" recap. For **QRIS**: QRIS logo, a QR rendered from the invoice payload, **"Selesaikan pembayaran dalam 15:00"** (bold countdown from `expiresAt`), primary "Unduh Kode QR" (view-shot → share/save), outline "Ganti Metode Pembayaran" (→ L83.1, cancels the invoice). For **other methods**, the same layout shows the method's destination instead of a QR: a VA number with a copy button, the bank account to transfer to, or an e-wallet "Buka aplikasi" stub.
- Poll `GET /payments/:invoiceRef` every 3s. **PAID** → L83.3. **EXPIRED** → sheet "Waktu pembayaran habis" + "Pilih Slot Lagi" (the slot was released, BR-09). **FAILED** → danger toast, stay on the screen.
- **Demo mode:** add a discreet dev strip at the bottom: "Simulasikan: Berhasil | Gagal" → `POST /dev/gateway/:invoiceRef/pay {outcome}`.

**L83.3 Pembayaran Berhasil.** Full gradient, "Pembayaran Berhasil!" (`text.brandStrong`), `mascot-celebrate`, caption "Terima kasih telah menyelesaikan transaksi! Jadwal konsultasi telah tercatat." Primary "Unduh Bukti Pembayaran" (expo-print PDF receipt → share), outline "Kembali ke Beranda". Also add a text link "Lihat Jadwal" → Ruang Konsultasi (from the M2 navigation diagram).

### 6.9 L22.1 Ruang Konsultasi (tab)
- Title "Ruang Konsultasi". DateNavigator + WeekStrip; days with sessions get a dot. Tapping a day filters the upcoming list to that day. "Semua" is the default.
- **Upcoming session cards:** "Konsultasi dengan Nadia, M.Psi.", date and time "23 November 2026, 23.00-24.00", mode icon + label, "Anonim" with a user icon.
  - **Within the join window (BR-13):** primary sm "Masuk ke Ruang Konsultasi" and a red caption "Dimulai dalam 10 menit" (or "Sedang berlangsung").
  - **Otherwise:** danger "Batalkan Jadwal" + danger-outline "Ganti Jadwal" (rules in BR-18).
- **"Riwayat Terbaru"**: SearchField "Cari…" plus HistoryCards (photo, date "28/08/2026", name, "Mode : Obrolan Chat", primary sm "Lihat Detail" → L53.2) and a **"Lihat semua"** link.
- Entering a session → `POST /bookings/:id/join`:
  - **Video** → L22.2.
  - **Voice** → L22.2 with the camera off by default; the call screen shows the expert's avatar instead of video.
  - **Chat** → straight to L91.2 (assumption: no camera preview for chat sessions).

### 6.10 L22.2 Ruang Tunggu
- Header: "‹" (leave the waiting room), "Ruang Tunggu {nama}", a small lock icon + "Terenkripsi End-to-End · Anonim" (drop "· Anonim" if not anonymous), and a yellow pill "Konsultasi dimulai **10 menit** lagi" (live). M3 feedback: make the E2E badge **larger and more prominent** than the lo-fi.
- A large rounded **camera preview** (expo-camera, front camera) with a flip-camera button at the top-left and `mascot-peek` at the top-right corner. Bottom overlay: camera toggle and mic toggle.
- Primary "Masuk Ruang Konsultasi" → `POST /sessions/:bookingId/consent {e2eAccepted:true}` (only the first time; FA-26) → L22.3.
- If camera permission is denied: show the placeholder "Kamera tidak aktif" plus a button to open settings. The user can still enter.

### 6.11 L22.3 Video Call Room
- Header overlay: expert name, "Terenkripsi End-to-End · Anonim", a timer pill (mm:ss since join).
- Full-bleed **expert feed placeholder**: the expert's photo, blurred and dimmed, with "Menghubungkan…" for 2–4s and then "connected" (just the photo). The user's **self-view** appears as a picture-in-picture at the bottom-right, with a flip button.
- Control bar (rounded, translucent): camera · mic · **chat** (→ L91.2) · "…" (sheet: "Info Sesi", "Laporkan Masalah") · **end** (red).
- End → confirmation sheet "Akhiri sesi sekarang?" with danger "Akhiri Sesi" / outline "Lanjutkan" → `POST /sessions/:bookingId/end` → L53.1.
- If the server closes the session (the expert ended it, or time ran out), show the toast "Sesi telah diakhiri oleh {nama}" → L53.1.

### 6.12 L91.1 Pesan (List Chat)
Title "Chat", SearchField "Cari…", list items: avatar, name (`text.brand`), last-message preview, time ("20:20"), status badge **Aktif** (success) / **Selesai** (navy). Tap → L91.2. Empty state: mascot + "Belum ada percakapan. Chat akan muncul setelah kamu memulai sesi."
→ `GET /me/chats`

### 6.13 L91.2 Chat Room
- Header (gradient): "‹", avatar, name, "Online", a small "Terenkripsi End-to-End · Anonim" label, timer pill (session time remaining or elapsed).
- **M3 feedback:** when the session is a video session, show a clear **"Kembali ke Video Call"** pill/button under the header.
- Bubbles: the expert's messages are on the left (primary-700 bubble, white text, avatar). The user's are on the right (neutral-100/primary-50 bubble, dark text). Each shows its time, and user bubbles show a single check (sent) or double check (read).
- Composer: emoji button, "Ketik pesanmu…", paperclip (attachment: pick an image and send it as an image bubble; if that's too costly, show the toast "Segera hadir"), round primary send button.
- Messages: `POST /sessions/:bookingId/messages`, poll `GET /sessions/:bookingId/messages?after=<id>` every 2s while the screen is focused.
- **Inactivity sheet (BR-19):** `mascot-annoyed`, title "**{Nama} tidak merespon?**", body "Kamu bisa melaporkan masalah ini dan konsultasi bisa dilanjutkan di lain waktu.", primary "Laporkan Ketidaktanggapan" → `POST /sessions/:bookingId/report-unresponsive` → toast "Laporan terkirim".
- If the session is **SELESAI**: read-only, with the composer replaced by a banner "Sesi telah berakhir" + "Lihat Ringkasan".

### 6.14 L53.1 Sesi Selesai + Ulasan (UT5.3)
Full gradient, "Konsultasi Selesai!", `mascot-celebrate`, caption "Terima kasih sudah berani bercerita!", primary sm "Lihat Ringkasan Konsultasi" (→ L53.2), 5-star input, TextArea "Tuliskan ulasan…", primary "Booking Lagi" (→ Cari tab), tonal "Kembali ke Beranda".
**Both bottom buttons submit the review first if a star rating was chosen** (`POST /bookings/:id/review`). Leaving the rating empty skips the review; reviews are optional.

### 6.15 L53.2 Detail Konsultasi (UT10.1, S6)
Header "‹ Detail Konsultasi". Key-value list: "Konselor : Nadia, M.Psi.", "Durasi : 30 menit" (actual duration), "Tanggal : 28/08/2026", "Mode : Chat". Then "**Ringkasan Masalah :**" with a paragraph, "**Saran Konselor :**" with a paragraph, and an outline "Booking Lagi". If the notes aren't ready: "Catatan dari konselor sedang disiapkan."
→ `GET /bookings/:id` (includes notes)

### 6.16 L84 Profil (UT8.4, F7.1)
- Gradient header: "‹ Profil" title and a **gear icon** (→ L71). Avatar, name ("Choso Kamo"), "@username".
- 3 StatTiles: "**10x** Riwayat Konsultasi", "**3** Histori Psikolog" (distinct experts), "**67** Hari Bergabung".
- **"Pertanyaan yang Sering Ditanyakan (FAQ)"** accordion:
  - "Apakah privasi saya aman dengan Haven?" Answer: write a short, honest one about anonymous mode and encrypted sessions. This is a prototype, so keep it general.
  - "Apakah saya dapat membatalkan atau mengubah jadwal konsultasi?" Answer: "Kamu dapat membatalkan atau mengubah jadwal konsultasi paling tidak 2x24 jam sebelum jadwal seharusnya. Jika kurang dari 2x24 jam, jadwal tidak bisa dipindahkan dan pembatalan konsultasi akan mengalami denda."
  - "Apa metode pembayaran yang diterima?" Answer: QRIS, Transfer Bank (BCA), Virtual Account, E-Wallet (DANA, GoPay, OVO).
- Primary "Hubungi Helpdesk" (a simple contact form → `POST /support/tickets`), outline "Laporkan Masalah" (same form, different type).
→ `GET /me`, `GET /me/stats`

### 6.17 L71 Pengaturan (UT7.1)
Header "‹ Pengaturan". Grouped list cards:
- **Profil:** "Edit Informasi Personal" (name, username, **display name for anonymous mode**), "Ganti Kata Sandi".
- **Aplikasi:** "Notifikasi" (stub), "Pusat Bantuan" (→ FAQ), "Tentang Haven" (stub page with mascot and version), toggle **"Gunakan Promo Mahasiswa Otomatis"**.
- **Privasi dan Keamanan:** "Privasi dan Keamanan" (stub), "Aktivitas Akun" (stub list of recent logins), toggle **"Aktifkan Mode Anonim"** with the caption "Berlaku otomatis untuk semua konsultasi berikutnya".
- Danger full-width **"Keluar"** → sheet `mascot-confused` "Keluar dari aplikasi Haven?", body "Kamu perlu masuk kembali dengan akunmu jika ingin mengakses fitur-fitur di Haven.", CTA "Keluar" → clear the token → L81.1.

Stub pages show the header, the mascot, and "Fitur ini segera hadir." → `PATCH /me/settings`, `PATCH /me`, `POST /me/password`

---

## 7. Business rules (single source of truth)

IDs in brackets refer to the LSTI deck: FA = filtered action, SC = service candidate, S = SoaML service contract.

- **BR-01 Login required.** The user must be authenticated before booking a slot. [S1 term 1]
- **BR-02 Registration.** Email or phone, then OTP (simulated), then name, then password. Google sign-in is mocked. [FA-01..03]
- **BR-03 Assessment.** Optional and skippable. It stores age, occupation, concern categories, and the optional description, and can be retaken; the latest one wins. [FA-04]
- **BR-04 Recommendation** [FA-06, SC-11 `susunRekomendasiAhli`]. Map concerns to specialties (editable constant):
  | Concern | Specialties |
  |---|---|
  | Frustrasi | Emosi |
  | Lelah | Emosi, Krisis Quarter-Life |
  | Butuh Teman Cerita | Emosi, Keluarga |
  | Overwhelmed | Emosi, Krisis Quarter-Life |
  | Panik | Emosi |
  | Sulit Bersosialisasi | Emosi, Autisme |
  | Kesulitan Akademik | Krisis Quarter-Life, ADHD |
  | Beban Kerja Tinggi | Krisis Quarter-Life, Emosi |

  Score = `10 × (number of matched specialties) + ratingAvg + (has a free slot within 48h ? 2 : 0) + (occupation looks like a student AND tarif ≤ Rp300.000 ? 2 : 0)`. Return the top 5. With no assessment, return the top-rated experts that have slots this week.
- **BR-05 Catalog filtering** [FA-07, FA-09].
  - Price applies to `tarif`. Experience buckets are 1–2, 2–5, and >5 years. Specialty matching is *any-of*.
  - Time of day: Pagi 06:00–11:59, Siang 12:00–17:59, Malam 18:00–23:59. Akhir Pekan is Saturday/Sunday. An expert matches if they have **at least one free future slot** in that window within the next 14 days.
  - "Konsultasi 24/7" = experts flagged `available24x7`.
  - "Jadwal Terdekat" = sort by earliest free slot.
  - "Promo Mahasiswa" = experts flagged `acceptsStudentPromo` (default true).
  - "Bisa hari ini" = has a free slot today.
- **BR-06 Slot visibility.** Only future slots with status `AVAILABLE` are shown. All times are **WIB (Asia/Jakarta)**. Slots last 60 minutes. [FA-08]
- **BR-07 Booking validation** [FA-10, SC-11 `validasiFormulirPendaftaran`, S1 term 2]. `expertId`, `slotId`, and `mode ∈ expert.modes` are required. `description` is ≤ 500 characters. `usePromo=true` requires a verified student, otherwise 422 `PROMO_NOT_ELIGIBLE`. The slot must belong to the expert and be in the future. Validate **before** saving any data.
- **BR-08 Atomic slot lock** [FA-12, FA-13, FA-14; S1 term 3; **this is the "prototype function" called out in the LSTI deck, p.39**].
  - In **one DB transaction**: conditionally update `Slot SET status='LOCKED' WHERE id=? AND status='AVAILABLE'`. If 0 rows changed → **409 `SLOT_CONFLICT`**. Otherwise create the Booking.
  - With Prisma, use `updateMany` with a status condition inside `$transaction` and check `count`.
  - Two concurrent requests for the same slot must produce exactly one 201 and one 409. Write a test for it.
- **BR-09 Unpaid hold** (assumption). A new booking is `AWAITING_PAYMENT` with `holdExpiresAt = now + 15 min`, matching the QR countdown. A sweeper (run on each request, or on an interval) sets expired bookings to `EXPIRED` and releases the slot back to `AVAILABLE`.
- **BR-10 Pricing** [FA-16, FA-18, SC-12 "Menghitung Total Biaya"]. `subtotal = tarif + ADMIN_FEE (Rp20.000)`, `discount = round(0.20 × subtotal)` if `usePromo` and the student is verified (else 0), `total = subtotal − discount`. Example: 150.000 + 20.000 = 170.000, minus 34.000 = **136.000**, which matches the hi-fi. Keep `ADMIN_FEE` and `STUDENT_DISCOUNT_RATE` as constants. Money is stored as **integer rupiah**.
- **BR-11 Student verification** [FA-17]. Name, university, a document (≤ 10 MB, jpg/png/pdf), and accepted S&K are required. Simulated approval: the status goes `PENDING` → `VERIFIED` after about 2s (or instantly through the dev menu). It is done once and persists, and L31 shows the verified state afterwards.
- **BR-12 Payment** [FA-19..25, S2, S3].
  - Creating an invoice calls the mock gateway, which returns `invoiceRef`, a method-specific `destination` (QR payload / VA number / account / deeplink), and `expiresAt`.
  - The client pays **outside Haven**. In the simulation, that's the dev "pay" action.
  - The gateway sends a **callback** to Haven's webhook. Haven then **re-verifies** the status with the gateway (S3 term 3) and only then, in one transaction: saves the Transaction, sets the Booking to `PAID`, and issues a receipt number.
  - **On failure, nothing changes** (S2 term 3). Callbacks must be **idempotent**.
- **BR-13 Session entry gate** [FA-27, FA-28, SC-13 `bukaSesiKonsultasi`, S4 terms 1 & 4]. Allowed only when the caller owns the booking, the booking is `PAID` (or already `IN_SESSION`), and `now ∈ [start − 30 min, end]`. Otherwise **403** with `code: NOT_OWNER | NOT_PAID | TOO_EARLY | ENDED`. The app shows the join button only inside the window, but the server is the authority.
- **BR-14 Consent and anonymity preference** [FA-26]. Before entering, record `e2eAcceptedAt` once per booking. `anonymous` is set per booking at booking time, and its default comes from the `defaultAnonymous` setting.
- **BR-15 Anonymous masking** [FA-29..31, S5 terms 1–2].
  - The profile forwarded to the expert (`GET /sessions/:id/client-profile`, the expert-side view used by the simulator and shown in the dev menu) contains: display name, age, occupation, assessment categories, and the booking description.
  - **If anonymous:** the display name is `client.displayName ?? "Anonim"`, and the real name, email, phone, and university are removed.
  - Experts can only fetch this for a booking that is scheduled and paid.
- **BR-16 Closing a session** [FA-35..37, S5]. A session closes when the user ends it, when the Ahli simulator ends it, or automatically at slot end. On close: status `COMPLETED`, `endedAt` saved, `durationMinutes` computed, room closed, and the **expert's notes** (summary + advice) saved and visible to the client.
- **BR-17 Reviews** [FA-38, FA-39, S6 term 2]. One per completed booking. Rating 1–5 is required to submit; text is optional (≤ 500 characters). Update `expert.ratingAvg` and `ratingCount` in the same transaction. Public review cards always show the author as **"Anonymous"**.
- **BR-18 Cancel and reschedule** (from the FAQ). If **≥ 48h** before start: cancel frees the slot (simulated refund, status `CANCELLED`), and reschedule moves to another free slot of the same expert (lock the new slot atomically, then release the old one). If **< 48h**: reschedule is disabled with an explanation; cancel is allowed after a warning sheet "Pembatalan kurang dari 2x24 jam akan dikenakan denda" (record `penaltyApplied: true`; no real money).
- **BR-19 Chat inactivity.** If the user's latest message has had no expert reply for `UNRESPONSIVE_AFTER_SEC` (default **60s** in demo, configurable), show the inactivity sheet once per gap. Reports are stored.
- **BR-20 Reminder toast.** While the app is open, show the toast once when a paid session is ≤ 10 minutes away.
- **BR-21 Settings.** `autoStudentPromo` pre-enables the promo toggle at booking (only if verified). `defaultAnonymous` pre-enables the anonymous toggle.
- **BR-22 Server time.** All time-window decisions are made on the server using the **simulated clock** (§10). Responses include `serverNow` so the app can render countdowns without trusting the device clock.

**Booking status machine:** `AWAITING_PAYMENT → PAID → IN_SESSION → COMPLETED`, plus `AWAITING_PAYMENT → EXPIRED` and `PAID → CANCELLED`.

---

## 8. Data model (Prisma sketch)

This is a sketch: adjust names and types as needed, but keep the concepts.

```prisma
enum ExpertType   { PSIKOLOG PSIKIATER }
enum Mode         { CHAT VOICE VIDEO }
enum SlotStatus   { AVAILABLE LOCKED }
enum BookingStatus{ AWAITING_PAYMENT PAID IN_SESSION COMPLETED CANCELLED EXPIRED }
enum StudentStatus{ NONE PENDING VERIFIED }
enum PayMethod    { QRIS BANK_TRANSFER VIRTUAL_ACCOUNT EWALLET }
enum InvoiceStatus{ PENDING PAID FAILED EXPIRED CANCELLED }
enum Sender       { CLIENT EXPERT SYSTEM }

model User {            // SC-01 account + credentials
  id String @id @default(cuid())
  email String? @unique
  phone String? @unique
  passwordHash String
  googleSub String? @unique
  createdAt DateTime @default(now())
  client Client?
}

model Client {          // SC-04 client data
  id String @id @default(cuid())
  userId String @unique
  name String
  username String @unique
  displayName String?           // used when anonymous
  avatarUrl String?
  age Int?
  occupation String?
  concerns String?              // JSON array of concern labels
  concernNote String?
  assessmentDoneAt DateTime?
  studentStatus StudentStatus @default(NONE)
  university String?
  studentProofPath String?
  studentVerifiedAt DateTime?
  defaultAnonymous Boolean @default(false)
  autoStudentPromo Boolean @default(false)
}

model Expert {          // SC-02
  id String @id @default(cuid())
  type ExpertType
  name String                    // "Nadia, M.Psi."
  licenseNo String               // STR (psikiater) / SIPP (psikolog)
  photoUrl String?
  bio String?
  specialties String             // JSON array
  modes String                   // JSON array of Mode
  tarif Int                      // rupiah per 60-min session
  yearsExperience Int
  counselingHours Int
  clientsHelped Int
  ratingAvg Float @default(0)
  ratingCount Int @default(0)
  available24x7 Boolean @default(false)
  acceptsStudentPromo Boolean @default(true)
}

model Slot {            // SC-03
  id String @id @default(cuid())
  expertId String
  startAt DateTime
  endAt DateTime
  status SlotStatus @default(AVAILABLE)
  @@unique([expertId, startAt])
  @@index([expertId, startAt, status])
}

model Booking {         // SC-05 "Pendaftaran"
  id String @id @default(cuid())
  clientId String
  expertId String
  slotId String @unique
  mode Mode
  anonymous Boolean
  description String?
  usePromo Boolean
  status BookingStatus @default(AWAITING_PAYMENT)
  holdExpiresAt DateTime?
  e2eAcceptedAt DateTime?
  joinedAt DateTime?
  endedAt DateTime?
  durationMinutes Int?
  penaltyApplied Boolean @default(false)
  createdAt DateTime @default(now())
}

model Invoice {         // SC-06 (mock gateway side)
  ref String @id
  bookingId String
  method PayMethod
  amount Int
  destination String             // QR payload / VA no / etc.
  status InvoiceStatus @default(PENDING)
  expiresAt DateTime
}

model Transaction {     // SC-07
  id String @id @default(cuid())
  bookingId String @unique
  invoiceRef String @unique
  method PayMethod
  tarif Int
  adminFee Int
  discount Int
  total Int
  paidAt DateTime
  receiptNo String @unique
}

model Message {         // SC-08
  id Int @id @default(autoincrement())
  bookingId String
  sender Sender
  body String?
  imagePath String?
  readAt DateTime?
  createdAt DateTime @default(now())
}

model SessionNote {     // SC-09
  bookingId String @id
  summary String                 // "Ringkasan Masalah"
  advice String                  // "Saran Konselor"
  createdAt DateTime @default(now())
}

model Review {          // SC-10
  id String @id @default(cuid())
  bookingId String @unique
  expertId String
  rating Int
  text String?
  createdAt DateTime @default(now())
}

model Report {          // unresponsive reports + support tickets
  id String @id @default(cuid())
  clientId String
  bookingId String?
  type String                    // UNRESPONSIVE | HELPDESK | PROBLEM
  body String?
  createdAt DateTime @default(now())
}
```

SQLite has no native enums or arrays in older Prisma setups. If needed, store them as strings or JSON strings and validate with zod at the boundary.

---

## 9. API contract

- Base URL: `/api`. JSON everywhere, except the student proof upload (multipart).
- Auth: `Authorization: Bearer <token>`.
- Errors: `{ "error": { "code": "SLOT_CONFLICT", "message": "…", "fields"?: { … } } }`, with HTTP 400/401/403/404/409/422.
- Every response includes the header `x-server-now` (ISO). Lists use `?cursor=`.

| Method & path | Purpose | Service mapping (LSTI) |
|---|---|---|
| `POST /auth/register/start` `{identifier}` | Start registration and send the OTP (demo returns `devCode`) | S1 `aksesLayanan`, SC-01 |
| `POST /auth/register/verify-otp` `{identifier, code}` | Returns `registrationToken` | SC-01 |
| `POST /auth/register/complete` `{registrationToken, name, password}` | Creates User and Client, returns `token` | FA-01, FA-03 |
| `POST /auth/login` `{identifier, password}` | Returns `token` | FA-02, FA-03 |
| `POST /auth/google` `{mockAccountId}` | Mock sign-in | SC-01 |
| `GET /me` · `PATCH /me` · `POST /me/password` | Profile | SC-04 |
| `PUT /me/assessment` | Save the assessment | FA-04 |
| `GET /me/stats` | Counts for the Profil tiles | SC-05 |
| `PATCH /me/settings` `{defaultAnonymous?, autoStudentPromo?}` | Settings | SC-04 |
| `POST /me/student-verification` (multipart) · `GET /me/student-verification` | Student verification | FA-17, SC-04 |
| `GET /recommendations` | Top experts for the user | S1 `susunRekomendasiAhli`, SC-11 + SC-02 |
| `GET /experts` (filters, §6.4) | Catalog | FA-05, FA-07 |
| `GET /experts/:id` | Detail (incl. stats, nearest dates) | FA-05 |
| `GET /experts/:id/slots?date=&timeOfDay=` | Free slots | FA-08, FA-09 |
| `GET /experts/:id/reviews` | Reviews | SC-10 |
| `POST /bookings` `{expertId, slotId, mode, anonymous, usePromo, description}` | Validate + atomic lock + create | S1 `validasiFormulirPendaftaran` + `pesanSlotKonsultasi`, FA-10..14 |
| `GET /me/bookings?scope=upcoming\|history&q=` | Lists for Ruang Konsultasi | FA-15 |
| `GET /bookings/:id` | Detail incl. notes | FA-15, S6 `ambilCatatanSaran` |
| `POST /bookings/:id/cancel` · `POST /bookings/:id/reschedule {slotId}` | BR-18 | SC-05, SC-03 |
| `GET /bookings/:id/payment-summary` | Price breakdown | S2 `siapkanPembayaran`, FA-16, FA-18 |
| `POST /bookings/:id/invoice` `{method}` | Create an invoice through the mock gateway | S2 `buatTagihanKonsultasi`, S3 `buatTagihan`, FA-19, FA-20 |
| `GET /payments/:invoiceRef` | Poll status | S2 `selesaikanPembayaran` |
| `POST /webhooks/payment` | Callback from the mock gateway → verify → mark paid | S3 `terimaNotifikasi` + `verifikasiStatusPembayaran`, FA-21..25 |
| `GET /payments/:invoiceRef/receipt` | Receipt data | FA-25 |
| `POST /bookings/:id/join` | Gate check, marks `IN_SESSION`, returns `{room, endsAt}` | S4 `bukaSesiKonsultasi`, FA-27, FA-28, FA-32, FA-33 |
| `POST /sessions/:bookingId/consent` `{e2eAccepted}` | Record consent | FA-26 |
| `GET /sessions/:bookingId/messages?after=` · `POST …/messages` | Chat | S4 `teruskanPesan`, FA-34 |
| `POST /sessions/:bookingId/end` | Close + notes | S5 `tutupSesiKonsultasi`, FA-35..37 |
| `GET /sessions/:bookingId/client-profile` | Expert-side view (masked if anonymous) | S5 `teruskanProfilKlien`, FA-29..31 |
| `POST /sessions/:bookingId/report-unresponsive` | BR-19 | — |
| `POST /bookings/:id/review` `{rating, text?}` | Review | S6 `catatUlasanSesi`, FA-38, FA-39 |
| `GET /me/chats` | Chat list | SC-08 |
| `POST /support/tickets` | Helpdesk / report a problem | — |
| `/dev/*` | Simulation controls (§10); **demo mode only** | — |

---

## 10. Simulation layer and demo controls

These run in the server under `server/src/sim/`. They're enabled only when `DEMO_MODE=1`.

- **Clock.** `clock.now()` = real time + `offsetMinutes`. Use it everywhere; never call `new Date()` directly in business logic. `POST /dev/clock {offsetMinutes}` / `{advanceMinutes}`.
- **Mock payment gateway.** An in-process module that owns the `Invoice` table and acts as the external provider. `createInvoice()` returns a method-specific destination: a QRIS payload string, a random 16-digit VA number, "BCA 123-456-7890 a.n. PT Haven Sehat Indonesia", or an e-wallet deeplink text.
  `POST /dev/gateway/:ref/pay {outcome: 'success'|'fail'}` sets the gateway state, then makes an **HTTP call to Haven's own `/webhooks/payment`**. Keeping that boundary real makes S3 visible in the code. Invoices expire at `expiresAt`.
- **Ahli simulator.** It reacts to session events:
  - On `join`: the expert "connects" after 2–4s.
  - On a client chat message: after 2–6s, it replies with a short, empathetic Indonesian line drawn from a small pool, picked by the concern categories where possible. Examples: "Terima kasih sudah cerita, aku dengerin ya.", "Boleh ceritakan lebih lanjut apa yang paling bikin kamu kepikiran?" Keep the pool tasteful and supportive, and never give diagnoses.
  - The `unresponsive` flag stops replies so the BR-19 sheet can be demoed.
  - On close: it writes `SessionNote` from a template, using the description/concerns as the summary plus 2–3 general, gentle self-care suggestions as advice.
  - `POST /dev/sessions/:bookingId/expert-end` ends the session as the expert.
- **OTP.** Always `1234` in demo mode. The response includes `devCode`.
- **Student verification.** Auto-approves after about 2s. `POST /dev/me/verify-student` approves instantly.
- **App dev menu `/dev`.** Open it by long-pressing the Profil avatar, or with a small floating "DEV" button when `EXPO_PUBLIC_DEMO_MODE=1`. Actions:
  - Reset & reseed DB
  - Advance clock +5m / +30m / +1d, reset clock
  - "Buat sesi mulai 10 menit lagi" (creates a PAID booking for the demo user)
  - Simulate payment success/fail for the pending invoice
  - Toggle expert unresponsive
  - End the current session as the expert
  - Verify student instantly
  - Show the expert-side client profile for a booking (demonstrates BR-15)
  - Open `/dev/components`

---

## 11. Seed data

All seeded times are **relative to seed time**, so a fresh seed always demos well.

- **Demo client:** "Choso Kamo", `@almchosokamo`, email `choso@haven.id`, phone `081234567890`, password `haven123`. Age 20, occupation "Mahasiswa", concerns [Overwhelmed, Kesulitan Akademik], **student NOT verified** (so the promo flow can be demoed). Joined 67 days ago.
- **Mock Google account:** "Putri Demo" `putri.demo@gmail.com` (creates a fresh account so onboarding can be shown).
- **Experts** (8; photos are placeholders until exported). Tarif values deliberately span the filter range:
  | Name | Type | License | Specialties | Modes | Tarif | Exp (yrs) | Flags |
  |---|---|---|---|---|---|---|---|
  | Nadia, M.Psi. | Psikolog | 0417-21-2-1 | Adiksi, Keluarga, Gangguan Makan, Krisis Quarter-Life | Chat, Video | 300.000 | 3 | — |
  | Nanami, M.Psi., Psikolog | Psikolog | SIPP sample | ADHD, Autisme, Emosi | Chat, Video | 250.000 | 5 | — |
  | Dewi Lestari, M.Psi., Psikolog | Psikolog | SIPP sample | Emosi, Pernikahan, Keluarga | Video, Voice | 200.000 | 7 | — |
  | Amerta, M.Psi., Psikolog | Psikolog | SIPP sample | Emosi, Gender, Krisis Quarter-Life | Chat, Voice, Video | 150.000 | 2 | available24x7 |
  | Sekar Ayu, M.Psi., Psikolog | Psikolog | SIPP sample | Emosi, Krisis Quarter-Life | Chat, Video | 120.000 | 1 | student-friendly |
  | Bima Prasetya, M.Psi., Psikolog | Psikolog | SIPP sample | Tumbuh Kembang, Anak, ADHD | Video | 350.000 | 9 | — |
  | Yoga Aditya, M.Psi., Psikolog | Psikolog | SIPP sample | Pernikahan, Keluarga | Video, Voice | 450.000 | 6 | weekend slots |
  | dr. Rania Putri, Sp.KJ | Psikiater | STR sample | Adiksi, Emosi, ADHD | Video | 1.200.000 | 10 | — |
- **Slots:** next 14 days, 60-minute blocks. Each expert gets a realistic pattern: mornings, afternoons, evenings 19:00–22:00 (needed for UT1.1), weekends for some, and late-night 22:00–24:00 for the 24/7 expert. Mark about 25% as LOCKED so the calendar looks real.
- **Reviews:** 5–8 per expert, ratings mostly 4–5, short, believable Indonesian texts. Compute `ratingAvg`/`ratingCount` from them, and optionally add a `baseRatingCount` so the cards can show "(200)".
- **Demo client's bookings:**
  1. COMPLETED with Nadia, chat, 30 min, about 2 months ago. Notes — summary: "Merasa galau tentang hubungan dan sering merasa tidak disayang; sulit melepaskan." Advice: "Lebih sayang terhadap diri sendiri. Mulai meminta bantuan orang lain untuk berbicara dengan pasangan terkait masalah ini." Also a review and a short chat transcript.
  2. COMPLETED with Sekar Ayu, chat, about 3 weeks ago, with notes.
  3. **PAID** with Nadia, video, anonymous, **starting 10 minutes after seed**, so the join flow works immediately.
  4. PAID with Amerta, video, starting in about 7 days, so cancel/reschedule can be demoed.

---

## 12. Build plan (phases with acceptance criteria)

**Phase 0: Foundations**
Monorepo, Expo app with expo-router and TypeScript, fonts loaded, **theme tokens generated from the Figma variables** (§4, fallback values in §4.2), safe areas, core components (§4.7) built from their Figma components and shown on `/dev/components`, mascot and icon assets exported. Server skeleton with `/api/health`, Prisma + SQLite, `db:reset`.
✅ The app runs in Expo Go on a real phone, reaches the server over LAN, and the component gallery matches p.88–89.

**Phase 1: Server core**
Schema, seed, clock, auth, experts, slots, recommendations, bookings (BR-07/08/09), pricing (BR-10), mock gateway + webhook (BR-12), session gate (BR-13), messages, end/notes, reviews, masking (BR-15).
✅ `vitest` passes:
- concurrent double booking gives one 201 and one 409
- pricing example = 136.000
- hold expiry releases the slot
- join window boundaries (−31 min → 403, −30 min → OK, after end → 403)
- payment failure changes nothing, and a duplicate callback is idempotent
- the anonymous profile hides the real name and contacts
- a review updates `ratingAvg`

**Phase 2: Auth and assessment screens** (L81.x, L41.x) and the route guard.
✅ A new user can register with OTP 1234, complete or skip the assessment, and land on Beranda. Logout/login works.

**Phase 3: Discover** (tabs shell + navbar, L42, L52 + Filter, L51).
✅ Every filter and sort changes results correctly. License, rating, and reviews are 1 tap from the catalog.

**Phase 4: Book and pay** (L82, L31, L83.1–3).
✅ The booking flow takes ≤ 5 steps. The promo gate works. A slot conflict shows the toast. The QR countdown and expiry work. Simulated pay leads to the success screen and the receipt PDF can be shared.

**Phase 5: Attend** (L22.1, L22.2, L22.3, L91.1, L91.2, L53.1, L53.2).
✅ The seeded session can be joined. Camera preview and flip work. Video ⇄ chat switching keeps the timer. The expert replies. The inactivity sheet appears with the unresponsive flag. Ending leads to the review, notes are visible in Detail, and cancel/reschedule follows BR-18.

**Phase 6: Account and polish** (L84, L71, stubs, toasts, empty/error/loading states, dev menu), then a visual pass against p.91–105 and Figma.
✅ The anonymous default and auto-promo settings propagate to Pemesanan. Logout uses the confirmation sheet.

**Phase 7: Acceptance run.** Walk through the **7 M3 test scenarios** (M4 deck p.66–67) on a device and note any failures:
1. Register + assessment (or skip) → Beranda
2. Find the right psychologist: recommendation/profile, license/badge, rating + reviews
3. Find an evening slot within budget using the filters
4. Book + anonymous + student discount + pay → success
5. Attend: Ruang Konsultasi → waiting room (E2E info) → video → chat → end
6. After the session: rate/review, open the detail, read the advice
7. Turn on anonymous-by-default in Settings

Plus: demonstrate the **S1 double-booking rejection** with two devices, or with the dev menu plus a second account.

---

## 13. Known inconsistencies and decisions already made

| # | Issue in the sources | Decision |
|---|---|---|
| 1 | Nadia's price is "300rb / Rp300.000/sesi" in Catalog and Detail, but "Biaya Konsultasi Rp150.000" in Payment. | Prices are data-driven from `expert.tarif`. The Payment mock values are just an example. |
| 2 | The hi-fi mixes 2025 and 2026 dates; one card says "23.00-23.00". | Use real dates from data; slots are 60 minutes. |
| 3 | M3 planned to move the breadcrumbs to the bottom, but the hi-fi keeps them at the top (lowered below the notch) next to a back button. | Follow the hi-fi: ProgressDashes at the top, below the safe area. |
| 4 | UT1.1/GA-13 require filtering by time (evening/weekend), and the M3 fix list says "add date & time chips", but the hi-fi filter has no time section. | Add a **"Waktu"** chip group to the Filter sheet (§6.4) in the same style. Tell the user. |
| 5 | The M2 chat pop-up had "Laporkan" + "Jeda Sesi"; the hi-fi bottom sheet only has "Laporkan Ketidaktanggapan". | Follow the hi-fi (report only). |
| 6 | The glossary says a Psikolog holds a **SIPP** and a Psikiater an **STR**, but the hi-fi shows "No. STR" for a psychologist. | Label by type: "No. SIPP" for psikolog, "No. STR" for psikiater. **Confirm with the user**; it's a one-line change. |
| 7 | The Profil screen is **L16** in M2 and **L84** in M4. | Use L84. |
| 8 | The LSTI contract says "Total = tarif", but M4 adds "Biaya Administrasi Rp20.000". | Follow M4 (BR-10). |
| 9 | What happens to unpaid bookings isn't specified. | 15-minute hold, then expire and release the slot (BR-09). |
| 10 | Some hex values are sampled, not exact. | Use the Figma variables via MCP; §4.2 is the fallback. |
| 11 | Qanelas Soft licensing. | Use the team's files if available, otherwise fall back to Nunito. |
| 12 | The Beranda quick-access targets aren't defined. | Use the mapping in §6.3. |
| 13 | Chat- and voice-mode entry isn't specified (the waiting room is camera-centric). | Chat goes straight to the Chat Room; voice uses the waiting room with the camera off. |
| 14 | The hi-fi sample review text is placeholder-silly. | Write realistic, respectful seed reviews. |

**Recommended addition (ask the user first):** Haven targets people who may be in distress, and the "Suicidal Thought" specialty appears in the hi-fi. Consider a small, non-intrusive "Butuh bantuan darurat?" entry in Pusat Bantuan/FAQ that points to Indonesian crisis resources. **Don't add it without the user's OK**, since it isn't in the design.

---

## Appendix A: Source page index

**`K02_T06_M4_Haven.pdf`** (136 pages, 16:9)
- **M1 (requirements):** 1–29. Problem & research 2–8 · solution 9 · personas 10–11 · user goals UG1–UG10 12–13 · process flow 14 · scenarios 15–17 · user tasks UT1–UT10 18–25 · functionalities F1.1–F7.1 26–27 · usability goals 28 · UX goals 29
- **M2 (lo-fi):** 30–63. Screen ↔ user-task mapping 31–39 · **navigation diagram 40** · screen descriptions with components and buttons 41–63
- **M3 (lo-fi testing):** 64–83. Method 65 · **test scenarios 66–67** · per-screen findings 68–81 · fix list 82 · results 83
- **M4 (hi-fi):** 84–135. **Design system 85–89** (colors/type 85, type scale 86, spacing/shadow/grid 87, icons/buttons/chips 88, fields/modals/navbar/toasts 89) · Figma link 90 · **hi-fi screens with principles 91–105** · lo-fi → hi-fi change notes 106–135

**`K02_T05_Deliv2_Presentasi_Haven.pdf`** (53 pages)
- **D1:** concern → solution 2–4 · granular actions GA-01..65 and filtering 5–8 · agnostic/non-agnostic 9–10 · service candidates SC-01..13 11–14 · encapsulation (logic, data, I/O per SC) 15–21 · service classification 22–23 · composition layers 24 · sequence diagrams SC-11/12/13 25–27
- **D2:** glossary 29 · BPMN 30–31 · service interfaces S1–S6 32–37 · participant diagram 38 · sequences S1–S6 39–44 · **service contracts with terms S1–S6 45–50** · service architecture 51 · "Prototype" slide 52 (empty; this build fills it)

## Appendix B: Glossary (Indonesian → code)

| UI / domain term | Code name | Note |
|---|---|---|
| Klien / Pasien / Pengguna | `Client` | The app user |
| Ahli (Psikolog / Psikiater) | `Expert` (`type`) | A psychologist can't prescribe; a psychiatrist (Sp.KJ) can |
| Pendaftaran konsultasi | `Booking` | |
| Asesmen awal | `assessment` | Age, occupation, concerns, note |
| Slot jadwal | `Slot` | 60 minutes, WIB |
| Mode konsultasi: Obrolan Chat / Panggilan Suara / Panggilan Video | `Mode.CHAT / VOICE / VIDEO` | |
| Mode anonim | `anonymous`; `displayName` | The glossary calls it `namaTampil` |
| Tagihan | `Invoice` | Owned by the mock gateway |
| Transaksi / Bukti bayar | `Transaction` / `receiptNo` | |
| Lunas | `PAID` | |
| Ruang Konsultasi / Ruang Tunggu | sessions tab / waiting room | |
| Catatan & saran | `SessionNote.summary / advice` | "Ringkasan Masalah" / "Saran Konselor" |
| Ulasan / Rating | `Review` | |
| Diskon/Promo Mahasiswa | `usePromo`, `studentStatus` | 20% |
| Terenkripsi End-to-End | (UI label only) | |

## Appendix C: Formatting helpers
- **Currency:** `Rp150.000` (dot thousands separator, no decimals, no space). Short form on Detail: `300rb`. Write a small formatter rather than relying on `Intl` in Hermes.
- **Dates (WIB, `id` locale):** "Senin, 12 Januari 2025" (date navigator) · "10 Jan, 8.00 WIB" (home card) · "28/08/2026" (history) · "23 November 2026, 23.00-24.00" (session card) · day labels "Sen Sel Rab Kam Jum Sab Min".
- **Relative:** "Dimulai dalam 10 menit", "Konsultasi dalam 7 hari", "Kemarin, 14.00" (review cards; the hi-fi shows the English "Yesterday, 14.60 PM", which is a placeholder).
