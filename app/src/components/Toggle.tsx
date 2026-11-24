import { useEffect } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { colors, palette } from "@/theme";

type Props = { value: boolean; onValueChange: (v: boolean) => void; disabled?: boolean; accessibilityLabel?: string };

// Figma toggle (L13 "Group 123359"): 60x27 track, radius 12, primary-800 when on; a 28x24 pill thumb (radius 10)
// slides to the right. Off uses neutral-400. Drawn by hand because the native Switch cannot take this shape.
const TRACK_W = 60;
const THUMB_W = 28;
const INSET = 1.5;

export function Toggle({ value, onValueChange, disabled, accessibilityLabel }: Props) {
  const x = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    x.value = withTiming(value ? 1 : 0, { duration: 160 });
  }, [value, x]);
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: INSET + x.value * (TRACK_W - THUMB_W - INSET * 2) }] }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      disabled={disabled}
      hitSlop={{ top: 9, bottom: 9, left: 6, right: 6 }}
      onPress={() => onValueChange(!value)}
      style={[styles.track, { backgroundColor: value ? colors.text.section : palette.neutral[400] }, disabled && { opacity: 0.5 }]}
    >
      <Animated.View style={[styles.thumb, thumb]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: TRACK_W, height: 27, borderRadius: 12, justifyContent: "center" },
  thumb: { width: THUMB_W, height: 24, borderRadius: 10, backgroundColor: palette.primary[50] },
});
