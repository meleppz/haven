import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";
import { uiIcons, type UiIconName } from "@/lib/ui-icons";
import { colors, fontFamily } from "@/theme";
import { Text } from "./Text";

// Figma "Navbar": primary-900 bar, 5 tabs (57px wide), 24px icons (outline inactive, filled active),
// 10px labels. Active = semibold secondary-300, inactive = regular neutral-700.
export type NavTab = "Beranda" | "Cari" | "Ruang Konsultasi" | "Pesan" | "Profil";

const tabs: { key: NavTab; linear: UiIconName; bold: UiIconName }[] = [
  { key: "Beranda", linear: "homeLinear", bold: "homeBold" },
  { key: "Cari", linear: "searchLinear", bold: "searchBold" },
  { key: "Ruang Konsultasi", linear: "hospitalLinear", bold: "hospitalBold" },
  { key: "Pesan", linear: "messageLinear", bold: "messageBold" },
  { key: "Profil", linear: "userLinear", bold: "userBold" },
];

export function BottomNavbar({ active, onPress }: { active: NavTab; onPress?: (tab: NavTab) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 17) }]}>
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <Pressable key={t.key} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onPress?.(t.key)} style={styles.item}>
            <SvgXml xml={uiIcons[on ? t.bold : t.linear]} width={24} height={24} />
            <Text
              variant="bodyXs"
              color={on ? colors.nav.active : colors.nav.inactive}
              // Figma lets the label overflow its 57px column (whitespace nowrap), so "Ruang Konsultasi" is never cut.
              style={{ width: 96, textAlign: "center", fontSize: 10, lineHeight: 15, fontFamily: on ? fontFamily.bodySemibold : fontFamily.body }}
              numberOfLines={1}
            >
              {t.key}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.nav.bg, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 17 },
  item: { width: 64, minHeight: 44, alignItems: "center", justifyContent: "center", gap: 4 },
});
