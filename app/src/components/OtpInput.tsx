import { useRef, useState, type ComponentRef } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { colors, fontFamily, palette } from "@/theme";
import { Text } from "./Text";

// Figma OTP: four 56x56 boxes (radius 8, neutral-200 fill, neutral-500 border), 16px apart.
// One hidden input receives the digits, so typing advances automatically and paste works.
type Props = { value: string; onChange: (v: string) => void; length?: number; error?: string; autoFocus?: boolean };

export function OtpInput({ value, onChange, length = 4, error, autoFocus = true }: Props) {
  const ref = useRef<ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ alignItems: "center", gap: 8 }}>
      <Pressable accessibilityLabel="Kode OTP" onPress={() => ref.current?.focus()} style={styles.row}>
        {Array.from({ length }, (_, i) => {
          const active = focused && i === Math.min(value.length, length - 1);
          return (
            <View
              key={i}
              style={[
                styles.box,
                active && { borderColor: colors.border.focus, borderWidth: 2 },
                !!error && { borderColor: colors.border.error },
              ]}
            >
              <Text variant="h2" color={colors.text.brandStrong} style={{ fontFamily: fontFamily.bodySemibold }}>
                {value[i] ?? ""}
              </Text>
            </View>
          );
        })}
        <TextInput
          ref={ref}
          value={value}
          onChangeText={(t) => onChange(t.replace(/\D/g, "").slice(0, length))}
          keyboardType="number-pad"
          maxLength={length}
          autoFocus={autoFocus}
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          caretHidden
          style={styles.hidden}
        />
      </Pressable>
      {error ? (
        <Text variant="bodyXs" color={colors.text.error}>
          * {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 16 },
  box: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: palette.neutral[200],
    borderWidth: 1,
    borderColor: palette.neutral[500],
    alignItems: "center",
    justifyContent: "center",
  },
  hidden: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.02, color: "transparent" },
});
