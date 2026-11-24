import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { SvgXml } from "react-native-svg";
import type { Mode } from "@/api/experts";
import type { PayMethod, Pricing } from "@/api/bookings";
import { Backdrop, ExpertPhoto, Mascot, RatingLine, SelectMark, Text, Toggle, VerifiedBadge, type Blob } from "@/components";
import { paymentLogos } from "@/lib/assets";
import { rupiah } from "@/lib/format";
import { uiIcons } from "@/lib/ui-icons";
import { colors, fontFamily, palette, radius, shadow } from "@/theme";

// Pieces shared by L82 Pemesanan, L31 Verifikasi and L83 Pembayaran (Figma L13-L16).

/** Qanelas Soft SemiBold 20, primary-800 ("Ahli", "Tanggal Konsultasi", "Rincian Pembayaran"). */
export const SectionTitle = ({ children }: { children: string }) => (
  <Text variant="h3" color={colors.text.section} style={{ lineHeight: 30, letterSpacing: -0.4 }}>
    {children}
  </Text>
);

/** White radius-12 card with the Figma drop shadow; `pad` follows the frame (16/12 or 16/16). */
export const PanelCard = ({ children, style }: { children: ReactNode; style?: object }) => <View style={[styles.panel, style]}>{children}</View>;

const Divider = ({ soft }: { soft?: boolean }) => <View style={{ height: 1, alignSelf: "stretch", backgroundColor: soft ? colors.border.dividerSoft : colors.border.divider }} />;

const cardTitle = { fontFamily: fontFamily.bodySemibold, fontSize: 18, lineHeight: 24, letterSpacing: -0.36 } as const;

// 72px square photo crop (Figma "Frame 2608880").
const Photo = ({ expert }: { expert: { name: string; photoUrl: string | null } }) => (
  <View style={{ width: 72, height: 72, overflow: "hidden" }}>
    <ExpertPhoto expert={expert} size={72} />
  </View>
);

/** L13 "Ahli": photo, name + verified badge, license line, rating. */
export function ExpertBookingCard({ expert }: { expert: { name: string; photoUrl: string | null; verified: boolean; licenseLabel: string; licenseNo: string; ratingAvg: number; ratingCount: number } }) {
  return (
    <PanelCard style={{ padding: 16, borderRadius: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
        <Photo expert={expert} />
        <View style={{ flex: 1, gap: 8 }}>
          <View style={{ gap: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text color={colors.text.brandStrong} numberOfLines={1} style={[cardTitle, { flexShrink: 1 }]}>
                {expert.name}
              </Text>
              {expert.verified ? <VerifiedBadge /> : null}
            </View>
            <Text variant="bodyM" color={colors.text.muted} numberOfLines={1} style={{ lineHeight: 19 }}>
              No. {expert.licenseLabel}: {expert.licenseNo}
            </Text>
          </View>
          <RatingLine avg={expert.ratingAvg} count={expert.ratingCount} size={16} align="flex-start" />
        </View>
      </View>
    </PanelCard>
  );
}

export const MODE_FULL_LABEL: Record<Mode, string> = { CHAT: "Obrolan Chat", VOICE: "Panggilan Suara", VIDEO: "Panggilan Video" };

/** L15 "Detail Pesanan": photo, name, mode, and "Anonim" when on. */
export function OrderCard({ expert, mode, anonymous }: { expert: { name: string; photoUrl: string | null }; mode: Mode; anonymous: boolean }) {
  return (
    <PanelCard style={{ padding: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <Photo expert={expert} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text color={colors.text.brandStrong} numberOfLines={1} style={cardTitle}>
            {expert.name}
          </Text>
          <IconLine icon={mode === "CHAT" ? uiIcons.chatBoldBlue : mode === "VIDEO" ? uiIcons.videoBoldBlue : null} label={MODE_FULL_LABEL[mode]} />
          {anonymous ? <IconLine icon={uiIcons.userMinusBold} label="Anonim" /> : null}
        </View>
      </View>
    </PanelCard>
  );
}

function IconLine({ icon, label }: { icon: string | null; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      {icon ? <SvgXml xml={icon} width={20} height={20} /> : <Ionicons name="call" size={18} color={colors.text.brandStrong} style={{ width: 20, textAlign: "center" }} />}
      <Text variant="bodyM" color={colors.text.brandStrong} style={{ lineHeight: 20, letterSpacing: -0.32 }}>
        {label}
      </Text>
    </View>
  );
}

/** L13 "Konsultasi Anonim" card: title + toggle, soft rule, caption. */
export function ToggleCard({ title, caption, value, onChange }: { title: string; caption: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <PanelCard style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Text color={colors.text.section} style={[cardTitle, { flex: 1 }]}>
          {title}
        </Text>
        <Toggle value={value} onValueChange={onChange} accessibilityLabel={title} />
      </View>
      <Divider soft />
      <Text variant="bodyM" color={colors.text.secondary} style={{ letterSpacing: -0.32, lineHeight: 19 }}>
        {caption}
      </Text>
    </PanelCard>
  );
}

// Promo card blobs (Figma "Frame 2608809" Ellipse 179 primary-200 / Ellipse 180 secondary-200, blur 74).
const PROMO_BLOBS: Blob[] = [
  { color: palette.primary[200], cx: -49.6, cy: -49.2, rx: 159.1, ry: 111.4, blur: 74 },
  { color: palette.secondary[200], cx: 366.8, cy: 141.4, rx: 144.7, ry: 87.3, blur: 74 },
];

/** L13/L14 student banner: mascot holding the KTM, right-aligned bold copy, graduation cap. */
export function StudentBanner({ title, bottomFlat }: { title: string; bottomFlat?: boolean }) {
  return (
    <View style={[styles.banner, bottomFlat && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
      <Backdrop blobs={PROMO_BLOBS} size={{ w: 360, h: 172 }} />
      <View style={styles.bannerMascot} pointerEvents="none">
        <Mascot name="student" size={238.5} />
      </View>
      <Text color={colors.text.brandStrong} style={styles.bannerText}>
        {title}
      </Text>
      <View style={styles.cap} pointerEvents="none">
        <SvgXml xml={uiIcons.gradCap} width={42} height={36} />
      </View>
    </View>
  );
}

/** L13 promo card: banner + "Gunakan Promo Mahasiswa" toggle bar. */
export function PromoCard({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={[{ borderRadius: radius.card }, shadow.card]}>
      <StudentBanner title={"Kamu Mahasiswa?\nJangan lupa aktifkan\ndiskon khusus!"} bottomFlat />
      <View style={styles.promoBar}>
        <Text variant="bodyM" color={colors.text.section} style={{ flex: 1, fontFamily: fontFamily.bodySemibold, letterSpacing: -0.32 }}>
          Gunakan Promo Mahasiswa
        </Text>
        <Toggle value={value} onValueChange={onChange} accessibilityLabel="Gunakan Promo Mahasiswa" />
      </View>
    </View>
  );
}

/** L15/L16 "Rincian Pembayaran" (BR-10 values from the server). */
export function PriceBreakdown({ pricing }: { pricing: Pricing }) {
  return (
    <PanelCard style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
      <PriceRow label="Biaya Konsultasi" value={rupiah(pricing.tarif)} />
      <PriceRow label="Biaya Administrasi" value={rupiah(pricing.adminFee)} />
      {pricing.discount > 0 ? <PriceRow label="Diskon Mahasiswa 20%" value={`- ${rupiah(pricing.discount)}`} color={colors.text.highlightStrong} /> : null}
      <Divider />
      <View style={{ flexDirection: "row" }}>
        <Text color={colors.text.section} style={[cardTitle, { flex: 1, lineHeight: 27 }]}>
          Total
        </Text>
        <Text color={colors.text.section} style={[cardTitle, { lineHeight: 27 }]}>
          {rupiah(pricing.total)}
        </Text>
      </View>
    </PanelCard>
  );
}

function PriceRow({ label, value, color = colors.text.section }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flexDirection: "row" }}>
      <Text variant="bodyM" color={color} style={{ flex: 1, fontFamily: fontFamily.bodyMedium, letterSpacing: -0.32 }}>
        {label}
      </Text>
      <Text variant="bodyM" color={color} style={{ letterSpacing: -0.32, textAlign: "right" }}>
        {value}
      </Text>
    </View>
  );
}

const LOGO_H = 14;
const Logo = ({ src, w }: { src: number; w: number }) => <Image source={src} style={{ width: w, height: LOGO_H }} contentFit="contain" />;
const Lainnya = () => (
  <Text color={colors.text.brandStrong} style={{ fontSize: 13, lineHeight: 15, letterSpacing: -0.26 }}>
    + Lainnya
  </Text>
);

// Logo rows under each method, as in Figma L15.
function methodExtra(method: PayMethod): ReactNode {
  const extras: Record<PayMethod, ReactNode> = {
  BANK_TRANSFER: (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Text color={colors.text.methodHint} style={{ fontSize: 13, lineHeight: 15, letterSpacing: -0.26, width: 62 }}>
        Bank BCA
      </Text>
      <SvgXml xml={uiIcons.arrangeCircle} width={18} height={18} />
    </View>
  ),
  QRIS: (
    <View style={styles.logos}>
      <Logo src={paymentLogos.gopay} w={55} />
      <Logo src={paymentLogos.ovo} w={45} />
      <Logo src={paymentLogos.bca} w={44.5} />
      <Lainnya />
    </View>
  ),
  VIRTUAL_ACCOUNT: null,
  EWALLET: (
    <View style={styles.logos}>
      <Logo src={paymentLogos.dana} w={49} />
      <Logo src={paymentLogos.gopay} w={55} />
      <Logo src={paymentLogos.ovo} w={45} />
      <Lainnya />
    </View>
  ),
  };
  return extras[method];
}

/** L15 "Metode Pembayaran" radio card. Selected: 2px primary-500 border and the checked mark. */
export function MethodCard({ method, label, selected, onPress }: { method: PayMethod; label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.method, { borderColor: selected ? colors.border.selected : "transparent" }]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", minHeight: 30 }}>
        <Text color={colors.text.section} style={[cardTitle, { flex: 1, lineHeight: 30 }]}>
          {label}
        </Text>
        <View style={{ width: 24, height: 24, alignItems: "center", justifyContent: "center" }}>
          {selected ? <SelectMark selected /> : <SvgXml xml={uiIcons.payRadioOff} width={24} height={24} />}
        </View>
      </View>
      {methodExtra(method)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: colors.surface.card, borderRadius: radius.card, ...shadow.card },
  banner: { height: 172, borderRadius: radius.card, overflow: "hidden", backgroundColor: colors.surface.card },
  bannerMascot: { position: "absolute", left: -36.3, top: -23.7 },
  bannerText: { position: "absolute", right: 15, top: 17, fontFamily: fontFamily.bodyBold, fontSize: 18, lineHeight: 18, letterSpacing: -0.36, textAlign: "right" },
  cap: { position: "absolute", right: 17, top: 91.2 },
  promoBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    minHeight: 45,
    backgroundColor: colors.surface.card,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  logos: { flexDirection: "row", alignItems: "center", gap: 6 },
  method: { backgroundColor: colors.surface.card, borderRadius: radius.card, borderWidth: 2, paddingHorizontal: 14, paddingVertical: 10, gap: 8, ...shadow.card },
});
