import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SvgXml } from "react-native-svg";
import type { Booking } from "@/api/bookings";
import { Button, ExpertPhoto, Text } from "@/components";
import { longDate, MODE_LONG, relativeSession, slashDate } from "@/lib/format";
import { uiIcons } from "@/lib/ui-icons";
import { colors, fontFamily, palette, radius, shadow } from "@/theme";
import { Ionicons } from "@expo/vector-icons";

// Pieces of L22.x / L27 / L28 (Figma "Ruang Konsultasi", "L24 Ruang Tunggu", "L23 Video Call", "L27 Riwayat").

/** "🔒 Terenkripsi End-to-End - Anonim" (13px, End-to-End in italics). "- Anonim" only for anonymous bookings. */
export function E2ELine({ anonymous, center }: { anonymous: boolean; center?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, justifyContent: center ? "center" : "flex-start" }} accessibilityLabel={`Terenkripsi End-to-End${anonymous ? ", anonim" : ""}`}>
      <SvgXml xml={uiIcons.lockSmall} width={8} height={9.5} />
      <Text color={colors.text.secondary} style={styles.e2e}>
        Terenkripsi <Text color={colors.text.secondary} style={[styles.e2e, { fontStyle: "italic" }]}>End-to-End</Text>
        {anonymous ? " - Anonim" : ""}
      </Text>
    </View>
  );
}

function ModeIcon({ mode }: { mode: Booking["mode"] }) {
  if (mode === "VIDEO") return <SvgXml xml={uiIcons.videoBoldBlue} width={20} height={20} />;
  if (mode === "CHAT") return <SvgXml xml={uiIcons.chatBoldBlue} width={20} height={20} />;
  return <Ionicons name="call" size={18} color={colors.text.brandStrong} style={{ width: 20, textAlign: "center" }} />;
}

/** "23.00-24.00" from the slot label ("23.00-24.00"). */
const slotWhen = (b: Booking) => `${longDate(b.slot.startAt)}, ${b.slot.label}`;

type UpcomingProps = { booking: Booking; onJoin: () => void; onCancel: () => void; onReschedule: () => void; joining?: boolean };

/** L22.1 upcoming card. Inside the join window (BR-13): "Masuk ke Ruang Konsultasi" + red caption. Otherwise cancel/reschedule (BR-18). */
export function UpcomingCard({ booking: b, onJoin, onCancel, onReschedule, joining }: UpcomingProps) {
  return (
    <View style={styles.upcoming}>
      <View style={{ gap: 4 }}>
        <Text color={colors.text.brandStrong} style={styles.upTitle}>
          Konsultasi dengan {b.expert.name}
        </Text>
        <Text variant="bodyS" color={colors.text.meta} style={{ letterSpacing: -0.28 }}>
          {slotWhen(b)}
        </Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={styles.iconLine}>
            <ModeIcon mode={b.mode} />
            <Text variant="bodyM" color={colors.text.brandStrong} style={styles.iconText}>
              {MODE_LONG[b.mode]}
            </Text>
          </View>
          {b.anonymous ? (
            <View style={styles.iconLine}>
              <SvgXml xml={uiIcons.userMinusBold} width={20} height={20} />
              <Text variant="bodyM" color={colors.text.brandStrong} style={styles.iconText}>
                Anonim
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      {b.canJoin ? (
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <Button label="Masuk ke Ruang Konsultasi" loading={joining} onPress={onJoin} style={{ alignSelf: "flex-end" }} />
          <Text variant="bodyS" color={colors.text.danger} style={{ letterSpacing: -0.28 }}>
            {relativeSession(b.startsInMinutes, b.inProgress)}
          </Text>
        </View>
      ) : (
        <View style={{ flexDirection: "row", gap: 4 }}>
          <Button label="Batalkan Jadwal" variant="danger" onPress={onCancel} style={{ flex: 1 }} />
          <Button label="Ganti Jadwal" variant="dangerOutline" onPress={onReschedule} style={{ flex: 1 }} />
        </View>
      )}
    </View>
  );
}

/** L22.1 / L27 history card: photo, date, name, "Mode : …", "Lihat Detail". */
export function HistoryCard({ booking: b, onOpen }: { booking: Booking; onOpen: () => void }) {
  return (
    <View style={styles.history}>
      <View style={{ width: 52, height: 52, overflow: "hidden" }}>
        <ExpertPhoto expert={b.expert} size={52} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text variant="bodyS" color={colors.text.meta} style={{ lineHeight: 14 }}>
          {slashDate(b.slot.startAt)}
        </Text>
        <Text variant="bodyM" color={colors.text.brandStrong} numberOfLines={1} style={{ fontFamily: fontFamily.bodySemibold, lineHeight: 19 }}>
          {b.expert.name}
        </Text>
        <Text variant="bodyS" color={colors.text.meta}>
          Mode : {MODE_LONG[b.mode]}
        </Text>
      </View>
      <Button label="Lihat Detail" onPress={onOpen} style={{ alignSelf: "center" }} />
    </View>
  );
}

/** Round, translucent-navy call control (Figma L23 control bar / L24 overlay). */
export function CallButton({ label, onPress, children, danger, off, size = 54 }: { label: string; onPress: () => void; children: ReactNode; danger?: boolean; off?: boolean; size?: number }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: off }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.callBtn,
        { width: size, height: size, borderRadius: size / 4 },
        { backgroundColor: danger ? colors.action.danger : off ? colors.surface.callOff : colors.surface.call },
        pressed && { opacity: 0.8 },
      ]}
    >
      {children}
    </Pressable>
  );
}

/** Unmuted mic. Figma only ships the muted glyph (bi:mic-mute-fill), so the "on" state uses the matching Ionicons mic. */
export const MicOnIcon = ({ size = 30 }: { size?: number }) => <Ionicons name="mic" size={size} color={colors.text.chipSelected} />;

/**
 * Session timer pills: filled (video header) or outlined with a stopwatch (chat header). Both count DOWN the remaining
 * session time; with 10 minutes or less left (`warn`) they turn red (revision after Phase 5).
 */
export function TimerPill({ value, variant = "filled", warn }: { value: string; variant?: "filled" | "outline"; warn?: boolean }) {
  const label = `Sisa waktu ${value}${warn ? ", kurang dari 10 menit" : ""}`;
  if (variant === "filled") {
    return (
      <View style={[styles.pillFilled, warn && { backgroundColor: colors.action.danger }]} accessibilityLabel={label}>
        <Text variant="bodyS" color={colors.text.onPrimary} style={{ lineHeight: 17, fontVariant: ["tabular-nums"] }}>
          {value}
        </Text>
      </View>
    );
  }
  return (
    <View style={[styles.pillOutline, warn && { borderColor: colors.action.danger }]} accessibilityLabel={label}>
      <SvgXml xml={warn ? STOPWATCH_WARN : uiIcons.stopwatch} width={16} height={16} />
      <Text variant="bodyS" color={warn ? colors.action.danger : colors.text.brand} style={{ lineHeight: 17, fontVariant: ["tabular-nums"] }}>
        {value}
      </Text>
    </View>
  );
}

// The Figma stopwatch has its colour baked in; the warning state recolours the same glyph.
const STOPWATCH_WARN = uiIcons.stopwatch.replaceAll(palette.primary[700], colors.action.danger);

/** Remaining session time for the timer pills: counts down from 60:00 (a session is one hour). */
export const SESSION_WARN_SEC = 10 * 60;
export const sessionCountdown = (remainingSec: number) => Math.min(60 * 60, Math.max(0, remainingSec));

/** "60:00" … "09:59" … "00:00": minutes and seconds only, so a full hour reads 60:00. */
export function countdownLabel(remainingSec: number) {
  const s = Math.floor(sessionCountdown(remainingSec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  e2e: { fontSize: 13, lineHeight: 16, fontFamily: fontFamily.body },
  upcoming: { backgroundColor: colors.surface.card, borderRadius: 16, padding: 16, gap: 16, ...shadow.card },
  upTitle: { fontFamily: fontFamily.bodySemibold, fontSize: 20, lineHeight: 30, letterSpacing: -0.4 },
  iconLine: { flexDirection: "row", alignItems: "center", gap: 4 },
  iconText: { lineHeight: 20, letterSpacing: -0.32 },
  history: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.surface.card, borderRadius: radius.card, padding: 16, ...shadow.card },
  callBtn: { alignItems: "center", justifyContent: "center" },
  pillFilled: { backgroundColor: colors.action.primary, borderRadius: 15, paddingHorizontal: 9, paddingVertical: 2, alignSelf: "center" },
  pillOutline: { flexDirection: "row", alignItems: "center", gap: 2, borderWidth: 1, borderColor: colors.action.primary, backgroundColor: colors.surface.sheet, borderRadius: 15, paddingHorizontal: 5, paddingVertical: 4 },
});
