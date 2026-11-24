import { LinearGradient } from "expo-linear-gradient";
import { useState, type ReactNode } from "react";
import { Image, Modal, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { MascotName } from "@/lib/art";
import { colors, gradients, layout, radius, shadow } from "@/theme";
import { Mascot } from "./Art";
import { Button } from "./Button";
import { Text } from "./Text";

// Header: gradient band, "‹" back, title in text.brand, optional right action (handoff 4.7).
export function Header({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient {...gradients.header} style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View style={styles.headerSide}>
        {onBack ? (
          <Pressable accessibilityLabel="Kembali" hitSlop={8} onPress={onBack} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text.brand} />
          </Pressable>
        ) : null}
      </View>
      <Text variant="h3" color={colors.text.brand} style={{ flex: 1 }} numberOfLines={1}>
        {title}
      </Text>
      <View style={[styles.headerSide, { alignItems: "flex-end" }]}>{right}</View>
    </LinearGradient>
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

// BottomSheet modal: drag handle, mascot, title, body, one CTA (handoff 4.7, M4 p.89).
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
};

export function BottomSheet({ visible, onClose, title, body, mascot, ctaLabel, onCta, secondaryLabel, onSecondary, danger }: SheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Tutup" />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <View style={styles.handle} />
        {mascot ? <Mascot name={mascot} size={120} /> : null}
        <Text variant="title" color={colors.text.brandStrong} style={{ textAlign: "center" }}>
          {title}
        </Text>
        {body ? (
          <Text variant="bodyXs" color={colors.text.secondary} style={{ textAlign: "center" }}>
            {body}
          </Text>
        ) : null}
        <View style={{ alignSelf: "stretch", gap: 12, marginTop: 8 }}>
          <Button label={ctaLabel} onPress={onCta} variant={danger ? "danger" : "primary"} />
          {secondaryLabel ? <Button label={secondaryLabel} onPress={onSecondary} variant={danger ? "dangerOutline" : "outline"} /> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: layout.pagePadding, paddingBottom: 12, gap: 4 },
  headerSide: { minWidth: layout.minTouch, justifyContent: "center" },
  iconBtn: { width: layout.minTouch, height: layout.minTouch, alignItems: "center", justifyContent: "center", marginLeft: -12 },
  stat: { flex: 1, alignSelf: "stretch", backgroundColor: colors.surface.dateBar, borderRadius: radius.toast, padding: 12, alignItems: "center", justifyContent: "center", gap: 4, ...shadow.card },
  accordion: { backgroundColor: colors.surface.card, borderRadius: radius.card, ...shadow.card },
  accordionHead: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, minHeight: layout.minTouch },
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    backgroundColor: colors.surface.card,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: "center",
    gap: 12,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border.default, marginBottom: 4 },
});
