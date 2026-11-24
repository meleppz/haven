import type { ReactNode } from "react";
import { Pressable, StyleSheet } from "react-native";
import { SvgXml } from "react-native-svg";
import { uiIcons } from "@/lib/ui-icons";
import { colors, fontFamily } from "@/theme";
import { Text } from "./Text";

// Figma selection mark (Ellipse 33 / Group 123412): a 20px primary-800 ring, filled with a white check when selected.
export const SelectMark = ({ selected, size = 20 }: { selected: boolean; size?: number }) => (
  <SvgXml xml={selected ? uiIcons.radioOn : uiIcons.radioOff} width={size} height={size} />
);

type Props = { label: string; selected: boolean; onPress: () => void; disabled?: boolean };

// Figma "Mode Konsultasi yang Dipilih" row: 16px primary-800 label on the left, the mark on the right.
export function Radio({ label, selected, onPress, disabled }: Props) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      hitSlop={{ top: 6, bottom: 6 }}
      onPress={onPress}
      style={[styles.row, disabled && { opacity: 0.4 }]}
    >
      <Text variant="bodyM" color={colors.text.section} style={{ flex: 1, letterSpacing: -0.32 }}>
        {label}
      </Text>
      <SelectMark selected={selected} />
    </Pressable>
  );
}

// Figma S&K row (L14 "Frame 2608836"): the mark on the left, 16px text with an optional bold underlined link.
export function Checkbox({ label, selected, onPress, disabled, children }: Props & { children?: ReactNode }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      hitSlop={{ top: 6, bottom: 6 }}
      onPress={onPress}
      style={[styles.row, { gap: 12 }, disabled && { opacity: 0.4 }]}
    >
      <SelectMark selected={selected} />
      <Text variant="bodyM" color={colors.text.section} style={{ flex: 1, letterSpacing: -0.32 }}>
        {label}
        {children}
      </Text>
    </Pressable>
  );
}

/** Bold underlined link span used inside a Checkbox or body copy ("S&K Haven."). */
export const InlineLink = ({ children, onPress, color = colors.text.section }: { children: string; onPress?: () => void; color?: string }) => (
  <Text variant="bodyM" color={color} onPress={onPress} suppressHighlighting style={{ fontFamily: fontFamily.bodyBold, textDecorationLine: "underline", letterSpacing: -0.32 }}>
    {children}
  </Text>
);

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", minHeight: 32 },
});
