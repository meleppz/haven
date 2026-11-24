import { useState, type ReactNode } from "react";
import { Image, Modal, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";
import type { MascotName } from "@/lib/art";
import { uiIcons } from "@/lib/ui-icons";
import { colors, fontFamily, layout, palette, radius, shadow } from "@/theme";
import { Mascot } from "./Art";
import { Backdrop, type Blob } from "./Backdrop";
import { Button } from "./Button";
import { Text } from "./Text";

// Figma page header (L13/L14/L15/L16 "Frame 2608803"): neutral-300 band under two blurred blobs (primary-200 top-left,
// secondary-200 right), "‹" arrow-left 24 and a Qanelas Soft Bold 24 title in primary-900.
const HEADER_BLOBS: Blob[] = [
  { color: palette.primary[200], cx: 46, cy: -89.5, rx: 215, ry: 150.5, blur: 100 },
  { color: palette.secondary[200], cx: 362.5, cy: 43, rx: 195.5, ry: 118, blur: 100 },
];

// Tab pages (Ruang Konsultasi, Chat): white band, Ellipse 178 primary-200 top-left / Ellipse 177 secondary-200 right.
const TAB_HEADER_BLOBS: Blob[] = [
  { color: palette.primary[200], cx: 28, cy: -14.5, rx: 215, ry: 150.5, blur: 100 },
  { color: palette.secondary[200], cx: 344.5, cy: 118, rx: 195.5, ry: 118, blur: 100 },
];

export function Header({ title, onBack, right, variant = "page" }: { title: string; onBack?: () => void; right?: ReactNode; variant?: "page" | "tab" }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + (variant === "tab" ? 8 : 11) }]}>
      <Backdrop blobs={variant === "tab" ? TAB_HEADER_BLOBS : HEADER_BLOBS} base={variant === "tab" ? colors.surface.card : colors.surface.header} size={{ w: 390, h: 102 }} />
      {onBack ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Kembali" hitSlop={10} onPress={onBack} style={styles.iconBtn}>
          <SvgXml xml={uiIcons.arrowLeft} width={24} height={24} />
        </Pressable>
      ) : null}
      <Text variant="h2" color={colors.text.brandStrong} style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      {right ? <View style={{ alignItems: "flex-end" }}>{right}</View> : null}
    </View>
  );
}

export function Avatar({ name, uri, size = 48 }: { name: string; uri?: string; size?: number }) {
  const initials = name
    .replace(/^dr\.\s*/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.action.tonalBg, alignItems: "center", justifyContent: "center" }}>
      <Text variant="label" color={colors.action.tonalFg} style={{ fontSize: size * 0.36 }}>
        {initials}
      </Text>
    </View>
  );
}

// Figma StatTile: secondary-200 fill, radius 8, p12, bold primary-800 value (24) over a 14px neutral-800 label.
export function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="h2" color={colors.text.brand} style={{ fontFamily: "Figtree_700Bold", letterSpacing: -1.2, textAlign: "center" }}>
        {value}
      </Text>
      <Text variant="bodyS" color={colors.text.dayLabel} style={{ textAlign: "center", letterSpacing: -0.28 }}>
        {label}
      </Text>
    </View>
  );
}

export function Accordion({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.accordion}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={styles.accordionHead}>
        <Text variant="label" style={{ flex: 1 }}>
          {title}
        </Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={20} color={colors.text.brand} />
      </Pressable>
      {open ? <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>{children}</View> : null}
    </View>
  );
}

// BottomSheet modal (Figma "Modal" component, DS board 700:807): 70x4 handle, 140px mascot, 24px Figtree SemiBold title in
// primary-900, 16px neutral-800 body, then ONE auto-width button centred under the text. A second button (only used where
// the handoff needs a way out, e.g. the penalty warning) sits under the first.
// Built on RN Modal (no extra native deps); swap for @gorhom/bottom-sheet if gestures are needed.
type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  body?: string;
  mascot?: MascotName;
  ctaLabel: string;
  onCta: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  danger?: boolean;
  loading?: boolean;
};

export function BottomSheet({ visible, onClose, title, body, mascot, ctaLabel, onCta, secondaryLabel, onSecondary, danger, loading }: SheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Tutup" />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 40 }]}>
        <View style={styles.handle} />
        <View style={styles.sheetBody}>
          {mascot ? <Mascot name={mascot} size={140} /> : null}
          <View style={{ gap: 12, alignSelf: "stretch" }}>
            <Text color={colors.text.brandStrong} style={styles.sheetTitle}>
              {title}
            </Text>
            {body ? (
              <Text variant="bodyM" color={colors.text.secondary} style={styles.sheetText}>
                {body}
              </Text>
            ) : null}
          </View>
          <View style={{ alignItems: "center", gap: 8 }}>
            <Button label={ctaLabel} onPress={onCta} loading={loading} variant={danger ? "danger" : "primary"} style={{ alignSelf: "center", paddingHorizontal: 16 }} />
            {secondaryLabel ? <Button label={secondaryLabel} onPress={onSecondary} variant={danger ? "dangerOutline" : "outline"} style={{ alignSelf: "center", paddingHorizontal: 16 }} /> : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: layout.pagePadding, paddingBottom: 11, gap: 8, overflow: "hidden" },
  headerTitle: { flex: 1, fontFamily: fontFamily.headingBold, fontSize: 24, lineHeight: 36, letterSpacing: -0.48 },
  iconBtn: { width: 24, height: 36, alignItems: "center", justifyContent: "center" },
  stat: { flex: 1, alignSelf: "stretch", backgroundColor: colors.surface.dateBar, borderRadius: radius.toast, padding: 12, alignItems: "center", justifyContent: "center", gap: 4, ...shadow.card },
  accordion: { backgroundColor: colors.surface.card, borderRadius: radius.card, ...shadow.card },
  accordionHead: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, minHeight: layout.minTouch },
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    backgroundColor: colors.surface.card,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: 24,
    paddingTop: 8,
    alignItems: "center",
  },
  handle: { width: 70, height: 4, borderRadius: 2, backgroundColor: colors.border.divider },
  sheetBody: { alignSelf: "stretch", alignItems: "center", gap: 16, marginTop: 30 },
  sheetTitle: { fontFamily: fontFamily.bodySemibold, fontSize: 24, lineHeight: 28, letterSpacing: -0.48, textAlign: "center" },
  sheetText: { textAlign: "center", lineHeight: 20, letterSpacing: -0.32 },
});
