import { palette } from "./tokens";

// Approximate; check Figma (§4.3).
export const gradients = {
  header: { colors: [palette.secondary[100], palette.primary[50]] as const, start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  hero: { colors: [palette.primary[200], palette.secondary[50]] as const, start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } },
} as const;
