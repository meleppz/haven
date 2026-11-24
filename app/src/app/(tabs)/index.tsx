import { useRouter } from "expo-router";
import { View } from "react-native";
import { useMe } from "@/api/me";
import { Button, Card, PlaceholderScreen, Text } from "@/components";
import { DEMO_MODE } from "@/lib/config";
import { colors } from "@/theme";

// L42 Beranda: placeholder until Phase 3. It already shows the signed-in user and the assessment banner (handoff §6.3).
export default function Beranda() {
  const router = useRouter();
  const me = useMe();
  return (
    <PlaceholderScreen title={me.data ? `Halo, ${me.data.name}` : "Beranda"}>
      {me.data && !me.data.assessmentDone ? (
        <Card>
          <Text variant="bodyM" color={colors.text.secondary}>
            Cek kesehatan mental supaya Haven bisa menyesuaikan layanan terbaik untukmu
          </Text>
          <Button label="Isi Asesmen 2 Menit" size="sm" onPress={() => router.push("/assessment/age")} />
        </Card>
      ) : null}
      {me.data?.assessmentDone ? (
        <Text variant="bodyS" color={colors.text.secondary} style={{ textAlign: "center" }}>
          Asesmenmu sudah tersimpan: {me.data.concerns.join(", ")}.
        </Text>
      ) : null}
      {DEMO_MODE ? (
        <View style={{ alignSelf: "stretch" }}>
          <Button label="Buka galeri komponen" variant="outline" onPress={() => router.push("/dev/components" as never)} />
        </View>
      ) : null}
    </PlaceholderScreen>
  );
}
