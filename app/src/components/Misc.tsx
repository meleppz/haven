import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { MascotName } from "@/lib/art";
import { colors, fontFamily, palette, radius, shadow } from "@/theme";
import { Mascot } from "./Art";
import { Text } from "./Text";

// Figma "Cards": white, radius 12, px16 py24, gap 12, drop shadow.
export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function RatingStars({ rating, count }: { rating: number; count?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Ionicons name="star" size={14} color={colors.rating.star} />
      <Text variant="bodyS" color={colors.rating.star} style={{ fontFamily: fontFamily.bodySemibold }}>
        {rating.toFixed(1)}
      </Text>
      {count !== undefined ? (
        <Text variant="bodyS" color={colors.text.secondary}>
          ({count})
        </Text>
      ) : null}
    </View>
  );
}

// Figma "Label": pill, px8 py2, 12px text.
type LabelKind = "secondary" | "primary" | "success" | "danger" | "warning";
const labelLook: Record<LabelKind, { bg: string; fg: string }> = {
  secondary: { bg: colors.action.secondary, fg: colors.text.brandStrong },
  primary: { bg: palette.primary[900], fg: colors.text.onPrimary },
  success: { bg: palette.success[800], fg: colors.text.onPrimary },
  danger: { bg: palette.danger[600], fg: colors.text.onPrimary },
  warning: { bg: palette.warning[600], fg: colors.text.onPrimary },
};

export function Label({ kind = "secondary", label }: { kind?: LabelKind; label: string }) {
  const l = labelLook[kind];
  return (
    <View style={[styles.label, { backgroundColor: l.bg }]}>
      <Text variant="bodyXs" color={l.fg} style={{ lineHeight: 12 }}>
        {label}
      </Text>
    </View>
  );
}

type BadgeKind = "verified" | "active" | "done" | "encrypted";

export function Badge({ kind, label }: { kind: BadgeKind; label?: string }) {
  if (kind === "verified") {
    return <Ionicons name="checkmark-circle" size={16} color={colors.badge.verified} accessibilityLabel="Terverifikasi" />;
  }
  if (kind === "encrypted") {
    return (
      <View style={[styles.pill, { backgroundColor: colors.surface.muted, borderColor: colors.border.default, borderWidth: 1 }]}>
        <Ionicons name="lock-closed" size={14} color={colors.text.brand} />
        <Text variant="bodyXs" color={colors.text.brand}>
          {label ?? "Terenkripsi End-to-End"}
        </Text>
      </View>
    );
  }
  // Chat status uses Figma Label colors: Aktif = success, Selesai = primary.
  return <Label kind={kind === "active" ? "success" : "primary"} label={label ?? (kind === "active" ? "Aktif" : "Selesai")} />;
}

export function SegmentedTabs({ tabs, value, onChange }: { tabs: string[]; value: string; onChange: (t: string) => void }) {
  return (
    <View style={styles.track}>
      {tabs.map((t) => {
        const on = t === value;
        return (
          <Pressable
            key={t}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(t)}
            style={[styles.tab, on && { backgroundColor: colors.action.primary }]}
          >
            <Text variant="label" color={on ? colors.text.onPrimary : colors.text.secondary}>
              {t}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Breadcrumb for multi-step forms: current step secondary-400, others faint (handoff 4.7).
export function ProgressDashes({ steps, current }: { steps: number; current: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 6, justifyContent: "center" }}>
      {Array.from({ length: steps }, (_, i) => (
        <View
          key={i}
          style={{ width: 28, height: 4, borderRadius: 2, backgroundColor: i === current ? palette.secondary[400] : palette.neutral[300] }}
        />
      ))}
    </View>
  );
}

// Figma "Notification": radius 8, px16 py12, 44px mascot, bold 16 title, 14 body, "Now" pinned top-right.
// Figma's default toast mascot pose is not exported yet; happySmall stands in for it.
type ToastKind = "info" | "danger" | "success";
const toastMascot: Record<ToastKind, MascotName> = { info: "happySmall", danger: "sad", success: "celebrate" };

export function Toast({ kind = "info", title, body, time = "Now" }: { kind?: ToastKind; title: string; body?: string; time?: string }) {
  const t = colors.toast[kind];
  return (
    <View style={[styles.toast, { backgroundColor: t.bg }]}>
      <View style={styles.toastImg}>
        <Mascot name={toastMascot[kind]} size={44} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text variant="title" color={t.title} style={{ fontFamily: fontFamily.bodyBold, fontSize: 16, lineHeight: 20 }}>
          {title}
        </Text>
        {body ? (
          <Text variant="bodyS" color={colors.text.primary} style={{ fontFamily: fontFamily.bodyAlt }}>
            {body}
          </Text>
        ) : null}
      </View>
      <Text variant="bodyXs" color="#000" style={styles.toastTime}>
        {time}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface.card, borderRadius: radius.card, paddingHorizontal: 16, paddingVertical: 24, gap: 12, ...shadow.card },
  label: { borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2, alignSelf: "flex-start", justifyContent: "center" },
  pill: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  track: { flexDirection: "row", backgroundColor: colors.surface.muted, borderRadius: radius.full, padding: 4, alignSelf: "stretch" },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 36, borderRadius: radius.full },
  toast: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderRadius: radius.toast, ...shadow.card },
  toastImg: { width: 44, height: 44 },
  toastTime: { position: "absolute", top: 8, right: 16 },
});
