import { Text as RNText, type TextProps } from "react-native";
import { colors, typography, type TypographyVariant } from "@/theme";

type Props = TextProps & { variant?: TypographyVariant; color?: string };

export function Text({ variant = "bodyM", color = colors.text.primary, style, ...rest }: Props) {
  return <RNText {...rest} style={[typography[variant], { color }, style]} />;
}
