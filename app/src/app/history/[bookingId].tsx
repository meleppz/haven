import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBooking } from "@/api/bookings";
import { Button, ErrorState, Header, Skeleton, Text } from "@/components";
import { errorMessage } from "@/features/auth/errors";
import { MODE_LABEL, slashDate } from "@/lib/format";
import { colors, fontFamily, layout } from "@/theme";

// L53.2 Detail Konsultasi (Figma "L28"; UT10.1, S6). The expert's notes are saved when the session closes (BR-16).
export default function DetailKonsultasi() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const booking = useBooking(String(bookingId));
  const b = booking.data;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.page }}>
      <Header title="Detail Konsultasi" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: layout.pagePadding, paddingTop: 26, paddingBottom: insets.bottom + 24, gap: 16 }}>
        {booking.isPending ? (
          <View style={{ gap: 16 }}>
            <Skeleton width={220} height={16} />
            <Skeleton width={160} height={16} />
            <Skeleton width={180} height={16} />
            <Skeleton height={76} />
            <Skeleton height={76} />
          </View>
        ) : booking.isError || !b ? (
          <ErrorState message={errorMessage(booking.error, "Detail konsultasi belum bisa dimuat.")} onRetry={() => booking.refetch()} />
        ) : (
          <>
            <KeyValue label="Konselor" value={b.expert.name} />
            <KeyValue label="Durasi" value={b.durationMinutes ? `${b.durationMinutes} menit` : "-"} />
            <KeyValue label="Tanggal" value={slashDate(b.slot.startAt)} />
            <KeyValue label="Mode" value={MODE_LABEL[b.mode].replace(" Call", "")} />
            {b.notes ? (
              <>
                <Paragraph label="Ringkasan Masalah" text={b.notes.summary} />
                <Paragraph label="Saran Konselor" text={b.notes.advice} />
              </>
            ) : (
              <Text variant="bodyM" color={colors.text.secondary}>
                Catatan dari konselor sedang disiapkan.
              </Text>
            )}
            <Button label="Booking Lagi" variant="outline" onPress={() => router.push({ pathname: "/experts/[id]", params: { id: b.expert.id, tab: "Appointment" } })} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const base = { fontSize: 15, lineHeight: 19 } as const;

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <Text color={colors.text.brandStrong} style={[base, { fontFamily: fontFamily.body }]}>
      <Text color={colors.text.brandStrong} style={[base, { fontFamily: fontFamily.bodyBold }]}>
        {label} :
      </Text>{" "}
      {value}
    </Text>
  );
}

function Paragraph({ label, text }: { label: string; text: string }) {
  return (
    <View style={{ gap: 8 }}>
      <Text color={colors.text.brandStrong} style={[base, { fontFamily: fontFamily.bodyBold }]}>
        {label} :
      </Text>
      <Text color={colors.text.brandStrong} style={[base, { fontFamily: fontFamily.body }]}>
        {text}
      </Text>
    </View>
  );
}
