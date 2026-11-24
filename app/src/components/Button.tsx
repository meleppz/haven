import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { colors, fontFamily, layout, radius, shadow } from "@/theme";
import { Text } from "./Text";

// Figma names these "Button primary" (yellow) / "Button secondary" (blue). The handoff calls the blue one
// primary, and the app follows the handoff: primary = blue CTA, secondary = yellow.
export type ButtonVariant = "primary" | "primaryTonal" | "outline" | "secondary" | "secondaryOutline" | "danger" | "dangerOutline";

type Props = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  /** md = full-width CTA (44), sm = card CTA ("Lihat Profil", 44 touch), xs = compact 32px card CTA from the design. */
  size?: "md" | "sm" | "xs";
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

type Look = { bg: string; fg: string; border: string };

const look = (v: ButtonVariant, pressed: boolean): Look => {
  switch (v) {
    case "primary":
      return { bg: pressed ? colors.action.primaryPressed : colors.action.primary, fg: colors.text.onAction, border: "transparent" };
    case "primaryTonal": // not in the Figma design system; kept for "Booking Lagi" (handoff 6.14)
      return { bg: colors.action.tonalBg, fg: colors.action.tonalFg, border: colors.action.tonalFg };
    // Outline variants use a solid fill (never transparent) so the drop shadow does not show through the button.
    // Pressed colors are Figma's translucent tints, pre-blended over white.
    case "outline":
      return { bg: pressed ? "#C6DFF4" : colors.surface.card, fg: colors.action.primary, border: colors.action.primary };
    case "secondary":
      return { bg: pressed ? colors.action.secondaryPressed : colors.action.secondary, fg: colors.text.onSecondary, border: "transparent" };
    case "secondaryOutline":
      return { bg: pressed ? "#FFF9EA" : colors.surface.card, fg: colors.action.secondary, border: colors.action.secondary };
    case "danger":
      return { bg: pressed ? colors.action.dangerPressed : colors.action.danger, fg: colors.text.onAction, border: "transparent" };
    case "dangerOutline":
      return { bg: pressed ? "#F2C4C4" : colors.surface.card, fg: colors.action.danger, border: colors.action.danger };
  }
};

export function Button({ label, onPress, variant = "primary", size = "md", fullWidth, disabled, loading, style }: Props) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      hitSlop={size === "xs" ? { top: 6, bottom: 6 } : undefined}
      style={({ pressed }) => {
        const c = look(variant, pressed);
        return [
          styles.base,
          size === "md" ? styles.md : size === "sm" ? styles.sm : styles.xs,
          fullWidth && { alignSelf: "stretch" },
          { backgroundColor: disabled ? colors.action.disabled : c.bg, borderColor: disabled ? "transparent" : c.border },
          style,
        ];
      }}
    >
      {({ pressed }) => {
        const fg = disabled ? colors.text.onSecondary : look(variant, pressed).fg;
        return (
          <View style={styles.row}>
            {loading ? <ActivityIndicator color={fg} style={{ marginRight: 8 }} /> : null}
            {/* Figma: card-size buttons use Qanelas Soft SemiBold 14, full-width form buttons use Figtree SemiBold 16. */}
            <Text variant="label" color={fg} style={size === "md" ? { fontSize: 16, lineHeight: 20 } : { fontFamily: fontFamily.headingSemibold, fontSize: 14, lineHeight: 18 }}>
              {label}
            </Text>
          </View>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.control, borderWidth: 2, alignItems: "center", justifyContent: "center", ...shadow.card },
  md: { alignSelf: "stretch", paddingVertical: 12, paddingHorizontal: 16, minHeight: layout.minTouch },
  sm: { alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 16, minHeight: layout.minTouch },
  xs: { alignSelf: "flex-start", paddingVertical: 6, paddingHorizontal: 16, minHeight: 32 },
  row: { flexDirection: "row", alignItems: "center" },
});
