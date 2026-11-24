// Static require map for PNG assets (Metro needs literal paths).
// Mascot poses and Beranda feature icons are SVG: see art.ts and the <Mascot /> / <FeatureIcon /> components.
// Mascot poses still missing from Figma: wave, peek. Use labeled placeholders until exported.

export const paymentLogos = {
  qris: require("../../assets/logos/qris.png"),
  bca: require("../../assets/logos/bca.png"),
  gopay: require("../../assets/logos/gopay.png"),
  ovo: require("../../assets/logos/ovo.png"),
  dana: require("../../assets/logos/dana.png"),
} as const;
