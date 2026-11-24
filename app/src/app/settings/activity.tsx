import { View } from "react-native";
import { useMe } from "@/api/me";
import { Text } from "@/components";
import { PanelCard } from "@/features/booking/BookingParts";
import { StubPage } from "@/features/account/StubPage";
import { longDate } from "@/lib/format";
import { colors, fontFamily } from "@/theme";

// "Aktivitas Akun" (handoff 6.17: a stub list of recent logins). The server keeps no login history yet, so the list
// shows only what is known: this device's current session and when the account was created.
export default function AktivitasAkun() {
  const me = useMe();
  return (
    <StubPage title="Aktivitas Akun">
      <PanelCard style={{ padding: 16, gap: 12 }}>
        <Row title="Perangkat ini" detail="Sedang aktif" />
        <View style={{ height: 1, backgroundColor: colors.border.divider }} />
        <Row title="Akun dibuat" detail={me.data ? longDate(me.data.joinedAt) : "-"} />
      </PanelCard>
    </StubPage>
  );
}

const Row = ({ title, detail }: { title: string; detail: string }) => (
  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
    <Text variant="bodyM" color={colors.text.primary} style={{ fontFamily: fontFamily.bodyMedium }}>
      {title}
    </Text>
    <Text variant="bodyM" color={colors.text.secondary}>
      {detail}
    </Text>
  </View>
);
