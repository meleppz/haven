import { useState, type ComponentRef, type Ref } from "react";
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { SvgXml } from "react-native-svg";
import { uiIcons } from "@/lib/ui-icons";
import { colors, fontFamily, layout, radius, shadow, typography } from "@/theme";
import { Text } from "./Text";

type Props = TextInputProps & {
  label?: string;
  error?: string; // shown as "* message" under the field; never blames the user (handoff 4.1)
};

// Figma "Field": h44, radius 12, 1px neutral-400 border, shadow. Focus = yellow border, error = red border.
// Covers TextField / PasswordField (secureTextEntry) / TextArea (multiline).
export function TextField({ label, error, multiline, style, onFocus, onBlur, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ alignSelf: "stretch", gap: 8 }}>
      {label ? (
        <Text variant="bodyS" color={colors.text.label} style={{ fontFamily: fontFamily.bodyMedium }}>
          {label}
        </Text>
      ) : null}
      <TextInput
        {...rest}
        multiline={multiline}
        placeholderTextColor={colors.text.placeholder}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          multiline && styles.multiline,
          { borderColor: error ? colors.border.error : focused ? colors.border.focus : colors.border.default },
          style,
        ]}
      />
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
  multiline: { minHeight: 110, paddingTop: 12, textAlignVertical: "top" },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 0 },
  searchInput: { flex: 1, ...typography.bodyM, color: colors.text.primary, paddingVertical: 10 },
});
