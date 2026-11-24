import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme";
import { Text } from "./Text";

type Props = { label: string; selected: boolean; onPress: () => void; disabled?: boolean };

export function Radio({ label, selected, onPress, disabled }: Props) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.row, disabled && { opacity: 0.5 }]}
    >
      <View style={[styles.radio, { borderColor: selected ? colors.action.primary : colors.border.default }]}>
        {selected ? <View style={styles.dot} /> : null}
      </View>
      <Text>{label}</Text>
    </Pressable>
  );
}

export function Checkbox({ label, selected, onPress, disabled }: Props) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.row, disabled && { opacity: 0.5 }]}
    >
      <View style={[styles.box, selected && { backgroundColor: colors.action.primary, borderColor: colors.action.primary }]}>
        {selected ? <Ionicons name="checkmark" size={16} color={colors.text.onPrimary} /> : null}
      </View>
      <Text style={{ flex: 1 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.action.primary },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.border.default, alignItems: "center", justifyContent: "center" },
});
