import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";
import { Header, Text } from "@/components";
import { uiIcons } from "@/lib/ui-icons";
import { colors, fontFamily } from "@/theme";

const body = { fontSize: 16, lineHeight: 19, letterSpacing: -0.32, fontFamily: fontFamily.body } as const;
const I = ({ children }: { children: string }) => (
  <Text color={colors.text.primary} style={[body, { fontStyle: "italic" }]}>
    {children}
  </Text>
);

// "Tentang Haven" (Figma "Tentang"): the smiling face, the Haven logo, and the justified description.
export default function Tentang() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.page }}>
      <Header title="Tentang Haven" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ alignItems: "center", paddingTop: 117, paddingBottom: insets.bottom + 32, paddingHorizontal: 37 }}>
        <SvgXml xml={uiIcons.aboutFace} width={265} height={144} accessibilityLabel="Wajah tersenyum" />
        <View style={{ marginTop: 53 }}>
          <SvgXml xml={uiIcons.havenLogo} width={228} height={94} accessibilityLabel="Haven" />
        </View>
        <Text color={colors.text.primary} style={[body, { textAlign: "justify", marginTop: 16, alignSelf: "stretch" }]}>
          Haven adalah aplikasi telekonsultasi kesehatan mental yang menghubungkanmu dengan psikolog terverifikasi lewat <I>chat</I> atau <I>video call</I>, kapan pun dan di
          mana pun kamu butuh. Haven hadir untuk kamu yang sering menunda mencari bantuan karena waktu yang padat, biaya yang mahal, atau takut dihakimi. Karena itu, setiap
          sesi terenkripsi <I>end-to-end</I>, bisa dijalankan dalam mode anonim, dan tersedia dengan harga terjangkau, termasuk diskon khusus mahasiswa. Haven ingin menjadi
          ruang aman untuk bercerita, supaya kamu bisa merasa lebih baik tanpa harus menunggu.
        </Text>
        <Text variant="bodyXs" color={colors.text.meta} style={{ marginTop: 24 }}>
          Versi {Constants.expoConfig?.version ?? "1.0.0"} · purwarupa
        </Text>
      </ScrollView>
    </View>
  );
}
