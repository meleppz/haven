import { useEffect } from "react";
import { StyleSheet, View, type DimensionValue, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { colors, radius } from "@/theme";
import { Mascot } from "./Art";
import { Button } from "./Button";
import { Text } from "./Text";
import type { MascotName } from "@/lib/art";

// Loading / empty / error states required on every data screen (handoff §6).

/** Pulsing placeholder block. */
export function Skeleton({ width = "100%", height = 16, rounded = radius.card, style }: { width?: DimensionValue; height?: number; rounded?: number; style?: ViewStyle }) {
  const o = useSharedValue(0.5);
  useEffect(() => {
    o.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
  }, [o]);
  const anim = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View accessibilityLabel="Memuat" style={[{ width, height, borderRadius: rounded, backgroundColor: "#E4ECF2" }, anim, style]} />;
}

type EmptyProps = { mascot?: MascotName; message: string; actionLabel?: string; onAction?: () => void };

/** Mascot + one line of copy (+ optional action). */
export function EmptyState({ mascot = "happySmall", message, actionLabel, onAction }: EmptyProps) {
  return (
    <View style={styles.center}>
      <Mascot name={mascot} size={110} />
      <Text variant="bodyM" color={colors.text.secondary} style={{ textAlign: "center" }}>
        {message}
      </Text>
      {actionLabel && onAction ? <Button label={actionLabel} variant="outline" size="sm" onPress={onAction} /> : null}
    </View>
  );
}

/** Warm error message with a retry button. */
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.center}>
      <Mascot name="sad" size={110} />
      <Text variant="bodyM" color={colors.text.secondary} style={{ textAlign: "center" }}>
        {message}
      </Text>
      <Button label="Coba lagi" variant="outline" size="sm" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({ center: { alignItems: "center", gap: 12, paddingVertical: 24, paddingHorizontal: 24 } });
