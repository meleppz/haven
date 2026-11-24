import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header, Mascot, Text } from "@/components";
import { colors, layout } from "@/theme";

/** Handoff 6.17 stub pages: header, mascot, "Fitur ini segera hadir." (+ optional extra content). */
export function StubPage({ title, children }: { title: string; children?: ReactNode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.sheet }}>
      <Header title={title} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: layout.pagePadding, paddingTop: 32, paddingBottom: insets.bottom + 24, gap: 20 }}>
        <View style={{ alignItems: "center", gap: 12 }}>
          <Mascot name="happySmall" size={120} />
          <Text variant="bodyM" color={colors.text.secondary} style={{ textAlign: "center" }}>
            Fitur ini segera hadir.
          </Text>
        </View>
        {children}
      </ScrollView>
    </View>
  );
}
