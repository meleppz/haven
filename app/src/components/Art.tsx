import { useId, useMemo } from "react";
import { SvgXml } from "react-native-svg";
import { featureArt, mascotArt, type FeatureIconName, type MascotName } from "@/lib/art";

// Figma SVG exports reuse the same ids (gradients, masks, clip paths) in every file. When several are mounted at once
// (screens stay mounted in a navigation stack) ids collide: a gradient can then resolve to a copy inside a hidden screen
// and render white. Every instance gets its own id prefix.
function uniqueIds(xml: string, uid: string) {
  return xml
    .replace(/\bid="([^"]+)"/g, (_, id) => `id="${uid}${id}"`)
    .replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${uid}${id})`)
    .replace(/\b(xlink:)?href="#([^"]+)"/g, (_, ns = "", id) => `${ns}href="#${uid}${id}"`);
}

// Both render the Figma SVG exports with a transparent background. `size` is the rendered height;
// width follows the artwork's aspect ratio.
function Art({ art, size }: { art: { xml: string; width: number; height: number }; size: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const xml = useMemo(() => uniqueIds(art.xml, `a${uid}-`), [art.xml, uid]);
  return <SvgXml xml={xml} height={size} width={(size * art.width) / art.height} />;
}

export function Mascot({ name, size = 120 }: { name: MascotName; size?: number }) {
  return <Art art={mascotArt[name]} size={size} />;
}

export function FeatureIcon({ name, size = 48 }: { name: FeatureIconName; size?: number }) {
  return <Art art={featureArt[name]} size={size} />;
}
