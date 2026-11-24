// Haven design tokens (handoff §4.2-4.5).
// Primitives are the Figma variables (Haven - IMK, "Design System Haven", node 629:841).
// Figma names the white Neutral/50; here it is neutral[0] to match the handoff's naming.

export const palette = {
  primary: { 50: "#F5FAFF", 100: "#C6E5FF", 200: "#98D0FE", 300: "#71BDFB", 400: "#51ACF7", 500: "#399EF0", 600: "#278FE4", 700: "#1A7FD1", 800: "#116AB2", 900: "#0A487A" },
  secondary: { 50: "#FFFCF5", 100: "#FFEFC6", 200: "#FEE198", 300: "#FBD471", 400: "#F7C851", 500: "#F0BC39", 600: "#E4AF27", 700: "#D19E1A", 800: "#B28411", 900: "#7A5A0A" },
  neutral: { 0: "#FFFFFF", 100: "#F7FAFD", 200: "#EFF4F9", 300: "#E4ECF2", 400: "#CBD5DD", 500: "#BAC4CD", 600: "#A7B0B8", 700: "#9099A0", 800: "#7A8187", 900: "#2E3337" },
  danger: { 50: "#FFF5F5", 100: "#FFC8C6", 200: "#FD9C98", 300: "#FA7571", 400: "#F55651", 500: "#EC3E38", 600: "#DE2C26", 700: "#C71F19", 800: "#A0140F", 900: "#5C0A07" },
  warning: { 50: "#FFFAF5", 100: "#FFE3C6", 200: "#FDCC98", 300: "#FAB871", 400: "#F5A651", 500: "#EC9538", 600: "#DE8526", 700: "#C77319", 800: "#A05A0F", 900: "#5C3307" },
  success: { 50: "#F5FFF8", 100: "#C6FFDA", 200: "#98FDBC", 300: "#71FAA1", 400: "#51F58A", 500: "#38EC77", 600: "#26DE67", 700: "#19C756", 800: "#0FA042", 900: "#075C25" },
  info: { 50: "#F5FDFF", 100: "#C6F4FF", 200: "#98EBFD", 300: "#71E1FA", 400: "#51D7F5", 500: "#38CBEC", 600: "#26BCDE", 700: "#19A7C7", 800: "#0F86A0", 900: "#074C5C" },
} as const;

const p = palette;

// Semantic tokens: components use these only, never raw hex or primitives (§4.3).
export const colors = {
  action: {
    primary: p.primary[700],
    primaryPressed: p.primary[900],
    tonalBg: p.primary[100],
    tonalFg: p.primary[700],
    secondary: p.secondary[300],
    secondaryPressed: p.secondary[700],
    danger: p.danger[600],
    dangerPressed: p.danger[900],
    disabled: "#B5AC9A", // Figma "Lofi/700"
  },
  text: {
    primary: p.neutral[900],
    secondary: p.neutral[800],
    placeholder: "#ACACAC", // Figma field placeholder (not a palette step)
    label: p.neutral[600],
    onAction: "#FFFDF5", // Figma "Secondary-Yellow/0": text on blue / red fills
    onSecondary: "#1C1917", // text on yellow and disabled fills
    chipSelected: p.primary[50],
    specialty: p.primary[600],
    dayLabel: p.neutral[800],
    daySelected: p.primary[800],
    brand: p.primary[700],
    brandStrong: p.primary[900],
    onPrimary: p.neutral[0],
    highlight: p.secondary[800],
    highlightStrong: p.secondary[700], // "Konsultasi dalam 7 hari" (Figma secondary-700)
    error: p.danger[800],
    section: p.primary[800], // Phase 4 section titles, card titles, price rows ("Ahli", "Rincian Pembayaran")
    muted: "#8B9195", // license line on the booking expert card (not a palette step)
    accent: p.secondary[500], // "Unggah Dokumen" file button
    methodHint: "rgba(17,106,178,0.7)", // "Bank BCA" under a payment method (primary-800 at 70%)
    success: p.success[800], // "file attached" on L31
    danger: p.danger[700], // "Dimulai dalam 10 menit" on the session card
    meta: p.neutral[700], // dates and "Mode : …" on history cards
    bubbleTime: p.neutral[100], // time inside the expert's (dark) chat bubble
    caption: "rgba(46,51,55,0.5)", // small helper under a settings toggle (neutral-900 at 50%)
  },
  surface: {
    page: p.neutral[0],
    sheet: "#FAFAFA", // Beranda body and the expert-detail sheet
    card: p.neutral[0],
    muted: p.neutral[100],
    priceTag: p.secondary[100],
    dateBar: p.secondary[200], // Figma Kalender bar
    daySelected: p.neutral[300],
    header: p.neutral[300], // Figma page header band (under its blurred blobs)
    payBar: p.secondary[200], // sticky "Total / Bayar" footer on Pembayaran
    qr: p.neutral[0], // QR codes always sit on white
    call: p.primary[900], // call control buttons (L23/L24)
    callOff: p.neutral[800], // a control that is switched off (camera off, mic muted)
    callBar: "rgba(250,250,250,0.5)", // translucent control bar on the video call
    callStage: p.primary[900], // behind the expert feed / camera preview
    bubbleExpert: p.primary[900], // chat: expert bubble
    bubbleClient: p.neutral[300], // chat: client bubble
    banner: p.secondary[300], // "Konsultasi dimulai 10 menit lagi" pill
    flipButton: "rgba(26,127,209,0.36)", // camera-flip button over a preview (primary-700 at 36%)
    crisis: p.danger[50], // "Butuh bantuan darurat?" card
    statTile: "rgba(254,225,152,0.8)", // Profil stat tiles (secondary-200 at 80%)
    connecting: "rgba(10,72,122,0.35)", // dim over the expert feed while "Menghubungkan…" (primary-900 at 35%)
  },
  border: {
    divider: p.neutral[400], // "Rincian Pembayaran" rule
    dividerSoft: "rgba(47,111,166,0.2)", // rule inside the toggle / radio cards
    selected: p.primary[500], // selected payment method card
    field: p.neutral[400], // "Unggah Dokumen" file field
    success: p.success[800], // file field once a document is attached
    crisis: p.danger[200],
    faqAnswer: "rgba(17,106,178,0.4)", // rule left of an open FAQ answer (primary-800 at 40%)
    default: p.neutral[300],
    focus: p.secondary[300],
    error: p.danger[600],
  },
  nav: { bg: p.primary[900], active: p.secondary[300], inactive: p.neutral[700] },
  rating: { star: p.secondary[500] },
  badge: { verified: p.primary[700] },
  status: {
    activeBg: p.success[800], activeFg: p.neutral[0],
    doneBg: p.primary[900], doneFg: p.neutral[0],
  },
  toast: {
    info: { bg: p.neutral[0], title: p.primary[900] },
    danger: { bg: p.danger[50], title: p.danger[700] },
    success: { bg: p.success[50], title: p.success[900] },
  },
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, "3xl": 36, "4xl": 42, "5xl": 48, "6xl": 64 } as const;

// Radius is estimated from the hi-fi (§4.5): verify in Figma.
// control/card/toast measured from Figma (12 / 12 / 8); sheet is still estimated.
export const radius = { control: 12, card: 12, toast: 8, day: 10, sheet: 20, full: 999 } as const;

export const layout = { pagePadding: 16, minTouch: 44 } as const;

export const shadow = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
} as const;
