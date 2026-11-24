import { Switch } from "react-native";
import { colors, palette } from "@/theme";

type Props = { value: boolean; onValueChange: (v: boolean) => void; disabled?: boolean };

export function Toggle({ value, onValueChange, disabled }: Props) {
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: palette.neutral[400], true: colors.action.primary }}
      thumbColor={colors.text.onPrimary}
    />
  );
}
