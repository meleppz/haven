import { useState, type ComponentRef, type Ref } from "react";
import { Ionicons } from "@expo/vector-icons";
import { DeviceEventEmitter, Pressable, StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { SvgXml } from "react-native-svg";
import { uiIcons } from "@/lib/ui-icons";
import { colors, fontFamily, layout, radius, shadow, typography } from "@/theme";
import { FIELD_FOCUS } from "./KeyboardScroll";
import { Text } from "./Text";

type Props = TextInputProps & {
  label?: string;
  error?: string; // shown as "* message" under the field; never blames the user (handoff 4.1)
  /** "section": the Phase 4 forms (L14) use a 16px primary-800 label instead of the small grey one. */
  labelTone?: "default" | "section";
};

// Figma "Field": h44, radius 12, 1px neutral-400 border, shadow. Focus = yellow border, error = red border.
// Covers TextField / PasswordField (secureTextEntry) / TextArea (multiline).
export function TextField({ label, error, labelTone = "default", multiline, style, onFocus, onBlur, secureTextEntry, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false); // password fields: the eye toggles show/hide (revision)
  return (
    <View style={{ alignSelf: "stretch", gap: 8 }}>
      {label ? (
        <Text
          variant={labelTone === "section" ? "bodyM" : "bodyS"}
          color={labelTone === "section" ? colors.text.section : colors.text.label}
          style={{ fontFamily: fontFamily.bodyMedium, letterSpacing: labelTone === "section" ? -0.32 : 0 }}
        >
          {label}
        </Text>
      ) : null}
      <View>
      <TextInput
        {...rest}
        multiline={multiline}
        secureTextEntry={secureTextEntry && !revealed}
        placeholderTextColor={colors.text.placeholder}
        onFocus={(e) => {
          setFocused(true);
          DeviceEventEmitter.emit(FIELD_FOCUS); // KeyboardScroll keeps this field above the keyboard
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          multiline && styles.multiline,
          secureTextEntry && { paddingRight: 48 },
          { borderColor: error ? colors.border.error : focused ? colors.border.focus : colors.border.default },
          style,
        ]}
      />
      {secureTextEntry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={revealed ? "Sembunyikan password" : "Tampilkan password"}
          hitSlop={6}
          onPress={() => setRevealed((v) => !v)}
          style={styles.eye}
        >
          <Ionicons name={revealed ? "eye-off-outline" : "eye-outline"} size={22} color={colors.text.meta} />
        </Pressable>
      ) : null}
      </View>
      {error ? (
        <Text variant="bodyXs" color={colors.text.error}>
          * {error}
        </Text>
      ) : null}
    </View>
  );
}

type SearchProps = TextInputProps & { ref?: Ref<ComponentRef<typeof TextInput>> };

// Figma "Search Bar": same field with a 24px search icon on the right.
export function SearchField({ style, onFocus, onBlur, ...rest }: SearchProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.input, styles.searchRow, { borderColor: focused ? colors.border.focus : colors.border.default }, style]}>
      <TextInput
        {...rest}
        placeholder={rest.placeholder ?? "Cari…"}
        placeholderTextColor={colors.text.placeholder}
        onFocus={(e) => {
          setFocused(true);
          DeviceEventEmitter.emit(FIELD_FOCUS); // KeyboardScroll keeps this field above the keyboard
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={styles.searchInput}
      />
      <SvgXml xml={uiIcons.fieldSearch} width={24} height={24} />
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    ...typography.bodyM,
    color: colors.text.primary,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: layout.minTouch,
    ...shadow.card,
  },
  eye: { position: "absolute", right: 4, top: 0, bottom: 0, width: 44, alignItems: "center", justifyContent: "center" },
  multiline: { minHeight: 110, paddingTop: 12, textAlignVertical: "top" },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 0 },
  searchInput: { flex: 1, ...typography.bodyM, color: colors.text.primary, paddingVertical: 10 },
});
