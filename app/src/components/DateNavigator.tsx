import { addDays, format, startOfWeek } from "date-fns";
import { id } from "date-fns/locale";
import { Pressable, StyleSheet, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { uiIcons } from "@/lib/ui-icons";
import { colors, fontFamily, radius, shadow } from "@/theme";
import { Chip } from "./Chip";
import { Text } from "./Text";

// Figma "Kalender": a secondary-200 bar ("‹ Senin, 12 Januari 2025 ›") above a 6-day strip (Sen-Sab).

type NavProps = { date: Date; onChange: (d: Date) => void; disablePrev?: boolean };

export function DateNavigator({ date, onChange, disablePrev }: NavProps) {
  return (
    <View style={styles.bar}>
      <Pressable accessibilityLabel="Hari sebelumnya" disabled={disablePrev} hitSlop={10} onPress={() => onChange(addDays(date, -1))} style={[styles.arrow, disablePrev && { opacity: 0.35 }]}>
        <View style={{ transform: [{ rotate: "180deg" }] }}>
          <SvgXml xml={uiIcons.arrowRight} width={24} height={24} />
        </View>
      </Pressable>
      <Text variant="title" color={colors.text.brandStrong} style={{ fontSize: 16, lineHeight: 20 }}>
        {format(date, "EEEE, d MMMM yyyy", { locale: id })}
      </Text>
      <Pressable accessibilityLabel="Hari berikutnya" hitSlop={10} onPress={() => onChange(addDays(date, 1))} style={styles.arrow}>
        <SvgXml xml={uiIcons.arrowRight} width={24} height={24} />
      </Pressable>
    </View>
  );
}

type StripProps = {
  selected: Date;
  onSelect: (d: Date) => void;
  markedDates?: Date[]; // days with sessions get a dot (handoff 6.9)
};

export function WeekStrip({ selected, onSelect, markedDates = [] }: StripProps) {
  const monday = startOfWeek(selected, { weekStartsOn: 1 });
  const days = Array.from({ length: 6 }, (_, i) => addDays(monday, i));
  const isMarked = (d: Date) => markedDates.some((m) => format(m, "yyyy-MM-dd") === format(d, "yyyy-MM-dd"));
  return (
    <View style={styles.strip}>
      {days.map((d) => {
        const on = format(d, "yyyy-MM-dd") === format(selected, "yyyy-MM-dd");
        return (
          <Pressable
            key={d.toISOString()}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onSelect(d)}
            style={[styles.day, on && { backgroundColor: colors.surface.daySelected }]}
          >
            <Text variant="bodyM" color={on ? colors.text.daySelected : colors.text.dayLabel} style={on ? { fontFamily: fontFamily.bodyBold } : undefined}>
              {format(d, "EEE", { locale: id })}
            </Text>
            <Text variant="bodyM" color={on ? colors.text.daySelected : colors.text.dayLabel} style={on ? { fontFamily: fontFamily.bodyBold } : undefined}>
              {format(d, "d")}
            </Text>
            {isMarked(d) ? <View style={styles.dot} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

// Bar + strip stacked, as used on Detail Psikolog, Pemesanan and Ruang Konsultasi.
export function DateSelector({ value, onChange, markedDates, disablePast }: { value: Date; onChange: (d: Date) => void; markedDates?: Date[]; disablePast?: boolean }) {
  const today = format(new Date(), "yyyy-MM-dd");
  return (
    <View style={{ gap: 12, alignSelf: "stretch" }}>
      <DateNavigator date={value} onChange={onChange} disablePrev={disablePast && format(value, "yyyy-MM-dd") <= today} />
      <WeekStrip selected={value} onSelect={onChange} markedDates={markedDates} />
    </View>
  );
}

// "14.00-15.00"; available / selected / disabled (handoff 4.7).
export function SlotChip({ label, selected, disabled, onPress }: { label: string; selected?: boolean; disabled?: boolean; onPress?: () => void }) {
  return <Chip label={label} selected={selected} disabled={disabled} onPress={onPress} />;
}

const styles = StyleSheet.create({
  bar: {
    height: 44,
    alignSelf: "stretch",
    backgroundColor: colors.surface.dateBar,
    borderRadius: radius.toast,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...shadow.card,
  },
  arrow: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  strip: { flexDirection: "row", justifyContent: "space-between", alignSelf: "stretch" },
  day: { width: 44, minHeight: 56, borderRadius: radius.day, alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 5 },
  dot: { position: "absolute", bottom: 2, width: 5, height: 5, borderRadius: 3, backgroundColor: colors.action.primary },
});
