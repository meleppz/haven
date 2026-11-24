import { Pressable, StyleSheet, View } from "react-native";
import { colors, layout, radius, shadow } from "@/theme";
import { Text } from "./Text";

// Figma "Chip": radius 12, 1px primary-700 border, px12 py8, 16px (14px for the small variants).
type Props = { label: string; selected?: boolean; onPress?: () => void; size?: "md" | "sm"; disabled?: boolean };

export function Chip({ label, selected, onPress, size = "md", disabled }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      // sm = the compact 35px chips of the design (quick filters); md keeps the 44px touch target.
      hitSlop={size === "sm" ? { top: 5, bottom: 4 } : undefined}
      style={[styles.base, size === "sm" && { minHeight: 35 }, selected ? styles.selected : styles.unselected, disabled && { opacity: 0.5 }]}
    >
      <Text variant="bodyM" color={selected ? colors.text.chipSelected : colors.action.primary} style={size === "sm" ? { fontSize: 14, lineHeight: 20 } : undefined}>
        {label}
      </Text>
    </Pressable>
  );
}

// Figma "Chip Spesialisasi": pill, 1px primary-600 border, px12 py4. Tap opens an explanation (handoff 6.5).
export function SpecialtyChip({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={!onPress} hitSlop={8} style={styles.specialty}>
      <Text variant="bodyM" color={colors.text.specialty}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.control,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: layout.minTouch, // 44px, matches the chips on the assessment screen
    ...shadow.card,
  },
  selected: { backgroundColor: colors.action.primary, borderColor: colors.action.primary },
  unselected: { backgroundColor: colors.surface.card, borderColor: colors.action.primary },
  specialty: { borderRadius: radius.full, borderWidth: 1, borderColor: colors.text.specialty, paddingHorizontal: 12, paddingVertical: 4, alignSelf: "flex-start" },
});

type GroupProps = { options: string[]; value: string[]; onChange: (v: string[]) => void; multi?: boolean; size?: "md" | "sm" };

// Single- and multi-select group: pass the selected value(s); chips toggle through onChange.
export function ChipGroup({ options, value, onChange, multi, size }: GroupProps) {
  const toggle = (o: string) => onChange(multi ? (value.includes(o) ? value.filter((x) => x !== o) : [...value, o]) : [o]);
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((o) => (
        <Chip key={o} label={o} size={size} selected={value.includes(o)} onPress={() => toggle(o)} />
      ))}
    </View>
  );
}
