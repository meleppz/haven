import { useId } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";

// Figma backgrounds are flat ellipses with a Gaussian blur (stdDeviation 70-150). React Native has no blur filter, so each
// blob is drawn as an elliptical radial gradient whose peak opacity and falloff match the blurred ellipse.
export type Blob = {
  color: string;
  cx: number; // blob center in design pixels (393 x 852 frame)
  cy: number;
  rx: number;
  ry: number;
  blur?: number; // Figma stdDeviation; 0 or undefined = crisp ellipse
  opacity?: number;
};

function erf(x: number) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t) * Math.exp(-x * x);
  return x >= 0 ? y : -y;
}

// Peak intensity of a blurred ellipse = erf(rx / (sigma * sqrt2)) * erf(ry / (sigma * sqrt2)).
const peak = (b: Required<Pick<Blob, "rx" | "ry" | "blur">>) => erf(b.rx / (b.blur * Math.SQRT2)) * erf(b.ry / (b.blur * Math.SQRT2));
const PROFILE: [number, number][] = [[0, 1], [0.25, 0.93], [0.5, 0.7], [0.7, 0.42], [0.85, 0.18], [1, 0]];

type Props = {
  blobs: Blob[];
  base?: string | null; // flat color behind the blobs
  size?: { w: number; h: number }; // design frame the coordinates refer to
  align?: "xMidYMin slice" | "xMidYMid slice";
  style?: ViewStyle;
};

export function Backdrop({ blobs, base = "#FFFFFF", size = { w: 393, h: 852 }, align = "xMidYMin slice", style }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, base ? { backgroundColor: base } : null, style]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${size.w} ${size.h}`} preserveAspectRatio={align}>
        <Defs>
          {blobs.map((b, i) =>
            b.blur ? (
              <RadialGradient key={i} id={`${uid}-${i}`} cx="50%" cy="50%" rx="50%" ry="50%">
                {PROFILE.map(([offset, k]) => (
                  <Stop key={offset} offset={offset} stopColor={b.color} stopOpacity={(b.opacity ?? 1) * peak({ rx: b.rx, ry: b.ry, blur: b.blur! }) * k} />
                ))}
              </RadialGradient>
            ) : null,
          )}
        </Defs>
        {blobs.map((b, i) => {
          const spread = b.blur ? 2 * b.blur : 0;
          return (
            <Ellipse
              key={i}
              cx={b.cx}
              cy={b.cy}
              rx={b.rx + spread}
              ry={b.ry + spread}
              fill={b.blur ? `url(#${uid}-${i})` : b.color}
              fillOpacity={b.blur ? 1 : (b.opacity ?? 1)}
            />
          );
        })}
      </Svg>
    </View>
  );
}
