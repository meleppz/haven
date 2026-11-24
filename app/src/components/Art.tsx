import { SvgXml } from "react-native-svg";
import { featureArt, mascotArt, type FeatureIconName, type MascotName } from "@/lib/art";

// Both render the Figma SVG exports with a transparent background. `size` is the rendered height;
// width follows the artwork's aspect ratio.
function Art({ art, size }: { art: { xml: string; width: number; height: number }; size: number }) {
  return <SvgXml xml={art.xml} height={size} width={(size * art.width) / art.height} />;
}

export function Mascot({ name, size = 120 }: { name: MascotName; size?: number }) {
  return <Art art={mascotArt[name]} size={size} />;
}

export function FeatureIcon({ name, size = 48 }: { name: FeatureIconName; size?: number }) {
  return <Art art={featureArt[name]} size={size} />;
}
