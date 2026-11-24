import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { cancelBooking, useHistory, type Booking } from "@/api/bookings";
import { joinSession, useUpcomingBookings } from "@/api/sessions";
import { BottomSheet, Button, DateSelector, EmptyState, ErrorState, Header, SearchField, Skeleton, Text, useToast } from "@/components";
import { errorMessage } from "@/features/auth/errors";
import { SectionTitle } from "@/features/booking/BookingParts";
import { HistoryCard, UpcomingCard } from "@/features/sessions/SessionParts";
import { ApiError } from "@/lib/api";
import { HISTORY } from "@/lib/routes";
import { colors, fontFamily, layout } from "@/theme";

const fromKey = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
};

type CancelStep = { booking: Booking; penalty: boolean } | null;

// L22.1 Ruang Konsultasi (Figma "Ruang Konsultasi"; handoff 6.9). Join gate BR-13, cancel/reschedule BR-18.
export default function RuangKonsultasi() {
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const upcoming = useUpcomingBookings();
  const [day, setDay] = useState<Date | null>(null); // null = "Semua"
  const [q, setQ] = useState("");
  const history = useHistory(q);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [cancelStep, setCancelStep] = useState<CancelStep>(null);
  const [cancelling, setCancelling] = useState(false);
  const [tooLate, setTooLate] = useState(false);

  const items = upcoming.data?.items ?? [];
  const marked = items.map((b) => fromKey(b.slot.date));
  const dayKey = day ? format(day, "yyyy-MM-dd") : null;
  const shown = dayKey ? items.filter((b) => b.slot.date === dayKey) : items;

  const join = async (b: Booking) => {
    setJoiningId(b.id);
    try {
      await joinSession(b.id);
      void qc.invalidateQueries({ queryKey: ["bookings"] });
      // Chat sessions go straight to the chat room; video and voice pass the waiting room first (handoff §13 #13).
      if (b.mode === "CHAT") router.push({ pathname: "/session/[bookingId]/chat", params: { bookingId: b.id } });
      else router.push({ pathname: "/session/[bookingId]/waiting", params: { bookingId: b.id } });
    } catch (err) {
      toast.show({ kind: "danger", title: "Belum bisa masuk", body: errorMessage(err) });
      void upcoming.refetch();
    } finally {
      setJoiningId(null);
    }
  };

  const doCancel = async (confirmPenalty: boolean) => {
    if (!cancelStep) return;
    setCancelling(true);
    try {
      await cancelBooking(cancelStep.booking.id, confirmPenalty);
      setCancelStep(null);
      toast.show({ kind: "success", title: "Jadwal dibatalkan", body: confirmPenalty ? "Denda pembatalan dicatat sesuai ketentuan." : "Slot sudah dilepas dan dana akan dikembalikan." });
      void qc.invalidateQueries({ queryKey: ["bookings"] });
      void qc.invalidateQueries({ queryKey: ["slots"] });
    } catch (err) {
      // BR-18: inside 48 h the server asks for the penalty warning first.
      if (err instanceof ApiError && err.code === "PENALTY_CONFIRM_REQUIRED") setCancelStep({ ...cancelStep, penalty: true });
      else {
        setCancelStep(null);
        toast.show({ kind: "danger", title: "Belum bisa dibatalkan", body: errorMessage(err) });
      }
    } finally {
      setCancelling(false);
    }
  };

  const reschedule = (b: Booking) => {
    if (b.startsInMinutes < 48 * 60) return setTooLate(true); // BR-18; the server enforces it too
    router.push({ pathname: "/reschedule/[bookingId]", params: { bookingId: b.id } });
  };

  const history3 = (history.data?.items ?? []).slice(0, 3);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.sheet }}>
      <Header title="Ruang Konsultasi" variant="tab" />
      <ScrollView
        contentContainerStyle={{ padding: layout.pagePadding, paddingTop: 21, paddingBottom: 32, gap: 16 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => void Promise.all([upcoming.refetch(), history.refetch()])} />}
      >
        <DateSelector value={day ?? new Date()} markedDates={marked} onChange={(d) => setDay(dayKey === format(d, "yyyy-MM-dd") ? null : d)} />
        {day ? (
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setDay(null)} style={{ alignSelf: "flex-end", marginTop: -8 }}>
            <Text variant="bodyS" color={colors.text.brand} style={{ fontFamily: fontFamily.bodySemibold }}>
              Tampilkan semua jadwal
            </Text>
          </Pressable>
        ) : null}

        {upcoming.isPending ? (
          <View style={{ gap: 16 }}>
            <Skeleton height={195} rounded={16} />
            <Skeleton height={170} rounded={16} />
          </View>
        ) : upcoming.isError ? (
          <ErrorState message={errorMessage(upcoming.error, "Jadwal belum bisa dimuat.")} onRetry={() => upcoming.refetch()} />
        ) : shown.length === 0 ? (
          <EmptyState
            message={day ? "Tidak ada jadwal di hari ini." : "Belum ada jadwal konsultasi. Yuk cari ahli yang cocok untukmu."}
            actionLabel={day ? undefined : "Cari Ahli"}
            onAction={() => router.navigate("/search")}
          />
        ) : (
          <View style={{ gap: 16 }}>
            {shown.map((b) => (
              <UpcomingCard
                key={b.id}
                booking={b}
                joining={joiningId === b.id}
                onJoin={() => join(b)}
                onCancel={() => setCancelStep({ booking: b, penalty: false })}
                onReschedule={() => reschedule(b)}
              />
            ))}
          </View>
        )}

        <View style={{ gap: 12, marginTop: 0 }}>
          <SectionTitle>Riwayat Terbaru</SectionTitle>
          <SearchField placeholder="Cari…" value={q} onChangeText={setQ} returnKeyType="search" />
          {history.isPending ? (
            <View style={{ gap: 8 }}>
              <Skeleton height={89} />
              <Skeleton height={89} />
            </View>
          ) : history.isError ? (
            <ErrorState message={errorMessage(history.error, "Riwayat belum bisa dimuat.")} onRetry={() => history.refetch()} />
          ) : history3.length === 0 ? (
            <EmptyState message={q ? "Tidak ada riwayat yang cocok." : "Riwayat konsultasimu akan muncul di sini."} />
          ) : (
            <View style={{ gap: 8 }}>
              {history3.map((b) => (
                <HistoryCard key={b.id} booking={b} onOpen={() => router.push({ pathname: "/history/[bookingId]", params: { bookingId: b.id } })} />
              ))}
            </View>
          )}
          <Button label="Lihat Semua" variant="secondary" size="sm" onPress={() => router.push(HISTORY)} style={{ alignSelf: "center", marginTop: 4 }} />
        </View>
      </ScrollView>

      {/* Figma modal 883:2834 "Batalkan konsultasi?" (its body/button copy is a duplicate of "Hapus akun"; fixed here). */}
      <BottomSheet
        visible={!!cancelStep && !cancelStep.penalty}
        onClose={() => setCancelStep(null)}
        mascot="confused"
        title="Batalkan konsultasi?"
        body={cancelStep ? `Jadwal konsultasimu dengan ${cancelStep.booking.expert.name} akan dibatalkan dan slotnya dilepas.` : undefined}
        ctaLabel="Batalkan Konsultasi"
        loading={cancelling}
        onCta={() => void doCancel(false)}
      />
      {/* BR-18 penalty warning (handoff copy; not in Figma). */}
      <BottomSheet
        visible={!!cancelStep?.penalty}
        onClose={() => setCancelStep(null)}
        mascot="sad"
        title="Pembatalan kurang dari 2x24 jam akan dikenakan denda"
        body="Jadwalmu tinggal kurang dari 2 hari lagi. Kalau tetap dibatalkan, denda pembatalan akan dicatat."
        ctaLabel="Tetap Batalkan"
        loading={cancelling}
        onCta={() => void doCancel(true)}
        secondaryLabel="Kembali"
        onSecondary={() => setCancelStep(null)}
        danger
      />
      <BottomSheet
        visible={tooLate}
        onClose={() => setTooLate(false)}
        mascot="confused"
        title="Jadwal belum bisa dipindahkan"
        body="Jadwal tidak bisa dipindahkan kurang dari 2x24 jam sebelum jadwal. Kamu masih bisa membatalkannya."
        ctaLabel="Mengerti"
        onCta={() => setTooLate(false)}
      />
    </View>
  );
}
