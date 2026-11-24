import { useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Header } from "@/components";
import { CrisisCard, FaqList } from "@/features/account/AccountParts";
import { colors, layout } from "@/theme";

// "Pusat Bantuan" (handoff 6.17: → FAQ). Same FAQ and contact buttons as the Profil page.
export default function PusatBantuan() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const contact = (type: "HELPDESK" | "PROBLEM") => router.push({ pathname: "/support", params: { type } });
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.sheet }}>
      <Header title="Pusat Bantuan" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: layout.pagePadding, paddingTop: 22, paddingBottom: insets.bottom + 24, gap: 24 }}>
        <CrisisCard />
        <FaqList />
        <View style={{ gap: 8 }}>
          <Button label="Hubungi Helpdesk Haven" onPress={() => contact("HELPDESK")} />
          <Button label="Laporkan Masalah" variant="outline" onPress={() => contact("PROBLEM")} />
        </View>
      </ScrollView>
    </View>
  );
}
