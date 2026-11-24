import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { rescheduleBooking, useBooking } from "@/api/bookings";
import { useSlots } from "@/api/experts";
import { Button, DateSelector, ErrorState, Header, Skeleton, SlotChip, Text, useToast } from "@/components";
import { errorMessage } from "@/features/auth/errors";
import { PanelCard, SectionTitle } from "@/features/booking/BookingParts";
import { ApiError } from "@/lib/api";
import { longDate } from "@/lib/format";
import { colors, layout } from "@/theme";

const fromKey = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
};

// "Ganti Jadwal" (BR-18; not in Figma, built in the Pemesanan style). Only >= 48 h before the session; the new slot is
// locked atomically on the server before the old one is released.
export default function Reschedule() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const booking = useBooking(String(bookingId));
  const [picked, setPicked] = useState<Date | null>(null);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const b = booking.data;
  const date = picked ?? (b ? fromKey(b.slot.date) : new Date());
  const dateKey = format(date, "yyyy-MM-dd");
  const slots = useSlots(b?.expert.id ?? "", dateKey);

  const save = async () => {
    if (!b || !slotId) return;
    setSaving(true);
    try {
      await rescheduleBooking(b.id, slotId);
      void qc.invalidateQueries({ queryKey: ["bookings"] });
      void qc.invalidateQueries({ queryKey: ["slots"] });
      toast.show({ kind: "success", title: "Jadwal berhasil diganti" });
      if (router.canGoBack()) router.back();
      else router.replace("/sessions");
    } catch (err) {
      if (err instanceof ApiError && err.code === "SLOT_CONFLICT") {
        setSlotId(null);
        void slots.refetch();
      }
      toast.show({ kind: "danger", title: "Jadwal belum bisa diganti", body: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.sheet }}>
      <Header title="Ganti Jadwal" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: layout.pagePadding, paddingTop: 21, paddingBottom: insets.bottom + 24, gap: 16 }}>
        {booking.isPending ? (
          <View style={{ gap: 16 }}>
            <Skeleton height={90} />
            <Skeleton height={112} />
          </View>
        ) : booking.isError || !b ? (
          <ErrorState message={errorMessage(booking.error, "Jadwal belum bisa dimuat.")} onRetry={() => booking.refetch()} />
        ) : (
          <>
            <PanelCard style={{ padding: 16, gap: 4 }}>
              <Text variant="bodyS" color={colors.text.meta}>
                Jadwal saat ini
              </Text>
              <Text variant="title" color={colors.text.brandStrong}>
                {b.expert.name}
              </Text>
              <Text variant="bodyM" color={colors.text.brandStrong}>
                {longDate(b.slot.startAt)}, {b.slot.label}
              </Text>
            </PanelCard>
            <View style={{ gap: 12 }}>
              <SectionTitle>Pilih Tanggal Baru</SectionTitle>
              <DateSelector
                value={date}
                disablePast
                onChange={(d) => {
                  setPicked(d);
                  setSlotId(null);
                }}
              />
            </View>
            <View style={{ gap: 12 }}>
              <SectionTitle>Slot Tersedia</SectionTitle>
              {slots.isPending ? (
                <Skeleton width={112} height={44} rounded={12} />
              ) : slots.isError ? (
                <ErrorState message={errorMessage(slots.error, "Slot belum bisa dimuat.")} onRetry={() => slots.refetch()} />
              ) : slots.data.slots.length === 0 ? (
                <Text variant="bodyS" color={colors.text.secondary}>
                  Belum ada slot di tanggal ini. Coba pilih tanggal lain ya.
                </Text>
              ) : (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  {slots.data.slots.map((s) => (
                    <SlotChip key={s.id} label={s.label} selected={slotId === s.id} onPress={() => setSlotId(slotId === s.id ? null : s.id)} />
                  ))}
                </View>
              )}
            </View>
            <Button label="Simpan Jadwal Baru" disabled={!slotId} loading={saving} onPress={save} />
          </>
        )}
      </ScrollView>
    </View>
  );
}
