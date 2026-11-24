import type { TextStyle } from "react-native";

// Headings use Qanelas Soft (files in assets/fonts, loaded in the root layout). Kept behind one token
// so a font swap stays a one-line change (handoff 4.4). Qanelas Regular is used for toast body text.
export const fontFamily = {
  headingBold: "QanelasSoft_Bold",
  headingSemibold: "QanelasSoft_SemiBold",
  bodyAlt: "Qanelas_Regular",
  body: "Figtree_400Regular",
  bodyMedium: "Figtree_500Medium",
  bodySemibold: "Figtree_600SemiBold",
  bodyBold: "Figtree_700Bold",
} as const;

export const typography = {
  display: { fontFamily: fontFamily.headingBold, fontSize: 42, lineHeight: 52 },
  h1: { fontFamily: fontFamily.headingBold, fontSize: 32, lineHeight: 40 },
  h2: { fontFamily: fontFamily.headingSemibold, fontSize: 24, lineHeight: 30 },
  h3: { fontFamily: fontFamily.headingSemibold, fontSize: 20, lineHeight: 25 },
  title: { fontFamily: fontFamily.bodySemibold, fontSize: 18, lineHeight: 24 },
  bodyM: { fontFamily: fontFamily.body, fontSize: 16, lineHeight: 24 },
  bodyS: { fontFamily: fontFamily.body, fontSize: 14, lineHeight: 21 },
  bodyXs: { fontFamily: fontFamily.body, fontSize: 12, lineHeight: 18 },
  label: { fontFamily: fontFamily.bodySemibold, fontSize: 14, lineHeight: 20 },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
