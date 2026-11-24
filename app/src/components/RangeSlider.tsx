import { useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, StyleSheet, View } from "react-native";
import { palette } from "@/theme";

// Two-thumb price slider (Figma "Harga per Sesi": 4px track neutral-300, active segment primary-800, 14px yellow thumbs).
// Pure JS (PanResponder), so it runs in Expo Go without native modules.
type Props = { min: number; max: number; step: number; value: [number, number]; onChange: (v: [number, number]) => void };

const THUMB = 14;

export function RangeSlider({ min, max, step, value, onChange }: Props) {
  const [width, setWidth] = useState(0);
  const live = useRef({ value, width, min, max, step, onChange });
  // The gesture handlers always read the latest props through this ref (updated after every render).
  useEffect(() => {
    live.current = { value, width, min, max, step, onChange };
  });
  const startX = useRef(0);

  const xOf = (v: number) => ((v - live.current.min) / (live.current.max - live.current.min)) * live.current.width;
  const valueOf = (x: number) => {
    const { width: w, min: lo, max: hi, step: s } = live.current;
    const raw = lo + (Math.max(0, Math.min(w, x)) / (w || 1)) * (hi - lo);
    return Math.max(lo, Math.min(hi, Math.round(raw / s) * s));
  };

  const makeResponder = (which: 0 | 1) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        startX.current = xOf(live.current.value[which]);
      },
      onPanResponderMove: (_e, g) => {
        const [lo, hi] = live.current.value;
        const v = valueOf(startX.current + g.dx);
        const { step: s } = live.current;
        onChange(which === 0 ? [Math.min(v, hi - s), hi] : [lo, Math.max(v, lo + s)]);
      },
    });
  // PanResponder handlers read props through the `live` ref only when a gesture runs (never during render), so each
  // responder is created once. The lint rules cannot see that the ref access happens later, hence the disables.
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/refs
  const lowResponder = useMemo(() => makeResponder(0), []);
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/refs
  const highResponder = useMemo(() => makeResponder(1), []);

  // Positions for rendering come straight from props and state (the ref-based helpers above are for gestures only).
  const lowX = ((value[0] - min) / (max - min)) * width;
  const highX = ((value[1] - min) / (max - min)) * width;

  return (
    <View style={styles.wrap} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessibilityRole="adjustable">
      <View style={styles.track}>
        <View style={[styles.active, { left: lowX, width: Math.max(0, highX - lowX) }]} />
      </View>
      {[
        { x: lowX, r: lowResponder, label: "Harga minimum" },
        { x: highX, r: highResponder, label: "Harga maksimum" },
      ].map((t) => (
        <View key={t.label} {...t.r.panHandlers} accessibilityLabel={t.label} style={[styles.hit, { left: t.x - 16 }]}>
          <View style={styles.thumb} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 32, justifyContent: "center", marginHorizontal: THUMB / 2 },
  track: { height: 4, borderRadius: 100, backgroundColor: palette.neutral[300], overflow: "hidden" },
  active: { position: "absolute", top: 0, height: 4, borderRadius: 100, backgroundColor: palette.primary[800] },
  hit: { position: "absolute", width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  thumb: { width: THUMB, height: THUMB, borderRadius: THUMB / 2, backgroundColor: palette.secondary[300], borderWidth: 1, borderColor: palette.secondary[500] },
});
