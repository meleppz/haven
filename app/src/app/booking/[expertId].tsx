import { useLocalSearchParams, useRouter } from "expo-router";
import { Button, PlaceholderScreen, Text } from "@/components";
import { colors } from "@/theme";

// L82 Pemesanan: built in Phase 4. This stub shows what the detail page hands over (the chosen slot and date).
export default function BookingStub() {
  const { expertId, slotId, date } = useLocalSearchParams<{ expertId: string; slotId?: string; date?: string }>();
  const router = useRouter();
  return (
    <PlaceholderScreen title="Pemesanan">
      <Text variant="bodyS" color={colors.text.secondary} style={{ textAlign: "center" }}>
        Ahli: {expertId}
        {slotId ? `\nSlot terpilih: ${slotId} (${date})` : "\nBelum ada slot dipilih."}
      </Text>
      <Button label="Kembali" variant="outline" size="sm" onPress={() => router.back()} />
    </PlaceholderScreen>
  );
}
