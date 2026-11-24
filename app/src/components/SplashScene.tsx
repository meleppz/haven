import { useEffect, type ReactNode } from "react";
import { KeyboardAvoidingView, StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, palette } from "@/theme";
import { Mascot } from "./Art";
import { KeyboardAwareScrollView } from "./KeyboardScroll";
import { Backdrop, type Blob } from "./Backdrop";
import { Text } from "./Text";
import type { MascotName } from "@/lib/art";

// "Baru Masuk" / "Selesai isi asesmen" splash screens. Figma only provides the start and end states of a Smart Animate
// transition (no keyframe data), so the motion below is derived from those two states:
//   start: the big mascot sits below the screen, the blue blob is off the top-left, the base circle is a 100px dot at the top
//   end:   the base circle fills the screen, blobs settled, the mascot (smaller) in the middle with title/body/buttons
const W = 393;
const H = 852;

const BASE: Blob[] = [{ color: palette.primary[100], cx: 196, cy: 420, rx: 487, ry: 487 }];
const TOP: Blob[] = [{ color: palette.primary[300], cx: 201.5, cy: -156, rx: 282.5, ry: 263, blur: 70 }];
const GLOW: Blob[] = [{ color: palette.secondary[100], cx: 197, cy: 448, rx: 212, ry: 153, blur: 100 }];
const BOTTOM: Blob[] = [{ color: palette.primary[500], cx: 196, cy: 980, rx: 330, ry: 200, blur: 150, opacity: 0.9 }];

type Props = {
  title: string;
  body: string;
  mascot: MascotName;
  children: ReactNode;
  /** Content taller than the screen (e.g. "Konsultasi Selesai" with its review form): scroll and avoid the keyboard. */
  scrollable?: boolean;
  /** Mascot height; defaults to the splash size. */
  mascotSize?: number;
};

export function SplashScene({ title, body, mascot, children, scrollable, mascotSize }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const p = useSharedValue(0); // overall progress 0 -> 1
  const textIn = useSharedValue(0);
  const actionsIn = useSharedValue(0);

  useEffect(() => {
    p.value = withTiming(1, { duration: 1300, easing: Easing.out(Easing.cubic) });
    textIn.value = withDelay(650, withTiming(1, { duration: 520, easing: Easing.out(Easing.quad) }));
    actionsIn.value = withDelay(900, withTiming(1, { duration: 520, easing: Easing.out(Easing.quad) }));
  }, [p, textIn, actionsIn]);

  // The base circle grows from a dot at the top and settles over the whole screen.
  const baseStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(p.value, [0, 1], [-440, 0]) }, { scale: interpolate(p.value, [0, 1], [0.1, 1]) }],
  }));
  const topStyle = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.4, 1], [0, 1, 1]),
    transform: [{ translateX: interpolate(p.value, [0, 1], [-330, 0]) }, { translateY: interpolate(p.value, [0, 1], [-170, 0]) }],
  }));
  const bottomStyle = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(p.value, [0, 1], [320, 0]) }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: interpolate(p.value, [0.4, 1], [0, 1], "clamp") }));
  // The mascot rises from below the screen while shrinking (450px wide -> 280px).
  const mascotStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(p.value, [0, 1], [height * 0.78, 0]) }, { scale: interpolate(p.value, [0, 1], [1.55, 1]) }],
  }));
  const textStyle = useAnimatedStyle(() => ({ opacity: textIn.value, transform: [{ translateY: interpolate(textIn.value, [0, 1], [18, 0]) }] }));
  const actionsStyle = useAnimatedStyle(() => ({ opacity: actionsIn.value, transform: [{ translateY: interpolate(actionsIn.value, [0, 1], [18, 0]) }] }));

  const content = (
    <>
        <Animated.View style={textStyle}>
          <Text variant="display" color={colors.text.brandStrong} style={styles.title}>
            {title}
          </Text>
        </Animated.View>
        <Animated.View style={[styles.mascot, mascotStyle]}>
          <Mascot name={mascot} size={mascotSize ?? Math.min(259, height * 0.3)} />
        </Animated.View>
        <Animated.View style={textStyle}>
          <Text variant="bodyM" color={colors.text.secondary} style={styles.body}>
            {body}
          </Text>
        </Animated.View>
        <Animated.View style={[styles.actions, actionsStyle]}>{children}</Animated.View>
    </>
  );

  return (
    <View style={styles.root}>
      <Animated.View style={[StyleSheet.absoluteFill, baseStyle]}>
        <Backdrop blobs={BASE} base={null} size={{ w: W, h: H }} align="xMidYMid slice" />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, topStyle]}>
        <Backdrop blobs={TOP} base={null} size={{ w: W, h: H }} align="xMidYMid slice" />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, glowStyle]}>
        <Backdrop blobs={GLOW} base={null} size={{ w: W, h: H }} align="xMidYMid slice" />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, bottomStyle]}>
        <Backdrop blobs={BOTTOM} base={null} size={{ w: W, h: H }} align="xMidYMid slice" />
      </Animated.View>

      {scrollable ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <KeyboardAwareScrollView contentContainerStyle={[styles.content, { flex: undefined, flexGrow: 1 }, { paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 16) + 24 }]} showsVerticalScrollIndicator={false}>
            {content}
          </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
      ) : (
        <View style={[styles.content, { paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 16) + 24 }]}>{content}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.primary[300], overflow: "hidden" },
  content: { flex: 1, paddingHorizontal: 18, justifyContent: "center", gap: 20 },
  title: { textAlign: "center", lineHeight: 42 },
  mascot: { alignItems: "center" },
  body: { textAlign: "center", lineHeight: 24, letterSpacing: -0.32 },
  actions: { gap: 8, marginTop: 4 },
});
