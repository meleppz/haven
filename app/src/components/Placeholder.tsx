import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, gradients, layout } from "@/theme";
import { LinearGradient } from "expo-linear-gradient";
import { Mascot } from "./Art";
import { Text } from "./Text";

// Stand-in for screens that are built in later phases ("Fitur ini segera hadir.").
export function PlaceholderScreen({ title, children }: { title: string; children?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.page }}>
      <LinearGradient {...gradients.header} style={{ paddingTop: insets.top + 12, paddingBottom: 16, paddingHorizontal: layout.pagePadding }}>
        <Text variant="h2" color={colors.text.brand}>
          {title}
        </Text>
      </LinearGradient>
      <ScrollView contentContainerStyle={{ padding: layout.pagePadding, gap: 16, alignItems: "center" }}>
        <Mascot name="happySmall" size={120} />
        <Text variant="bodyM" color={colors.text.secondary} style={{ textAlign: "center" }}>
          Fitur ini segera hadir.
        </Text>
        {children}
      </ScrollView>
    </View>
  );
}
