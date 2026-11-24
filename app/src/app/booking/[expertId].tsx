import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createBooking } from "@/api/bookings";
import { useExpert, useSlots, type Mode } from "@/api/experts";
import { useMe } from "@/api/me";
import { BottomSheet, Button, DateSelector, ErrorState, Header, KeyboardScroll, Radio, Skeleton, SlotChip, Text, TextField, useToast } from "@/components";
import { errorMessage } from "@/features/auth/errors";
import { ExpertBookingCard, MODE_FULL_LABEL, PanelCard, PromoCard, SectionTitle, ToggleCard } from "@/features/booking/BookingParts";
import { ApiError } from "@/lib/api";
import { colors, fontFamily, layout } from "@/theme";

const MODES: Mode[] = ["CHAT", "VOICE", "VIDEO"];

/** "2026-10-11" -> a local Date at noon (avoids day shifts across time zones). */
const fromKey = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
};

type FieldErrors = { slotId?: string; mode?: string; description?: string };

// L82 Pemesanan (Figma "L13 - Pemesanan"; UT8.2, S1 `validasiFormulirPendaftaran` + `pesanSlotKonsultasi`).
// The server validates (BR-07), locks the slot atomically (BR-08) and holds it for 15 minutes (BR-09).
export default function Booking() {
  const params = useLocalSearchParams<{ expertId: string; slotId?: string; date?: string }>();
  const expertId = String(params.expertId);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const expert = useExpert(expertId);
  const me = useMe();

  // Every choice below starts as null = "use the default" (from params, the expert, or Settings), so defaults that
  // load later still apply without copying them into state.
  const [picked, setPicked] = useState<Date | null>(null);
  const [slotId, setSlotId] = useState<string | null>(params.slotId ?? null);
  const [anonymousChoice, setAnonymousChoice] = useState<boolean | null>(null);
  const [promoChoice, setPromoChoice] = useState<boolean | null>(null);
  const [wantsPromo, setWantsPromo] = useState(false); // asked for the promo before being verified
  const [modeChoice, setModeChoice] = useState<Mode | null>(null);
  const [descChoice, setDescChoice] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [verifySheet, setVerifySheet] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const e = expert.data;
  const m = me.data;
  const verified = m?.studentStatus === "VERIFIED";

  const nearest = e?.nearestDates[0];
  const date = picked ?? (params.date ? fromKey(params.date) : nearest ? fromKey(nearest) : new Date());
  const dateKey = format(date, "yyyy-MM-dd");

  const anonymous = anonymousChoice ?? m?.settings.defaultAnonymous ?? false; // BR-14
  // BR-21: auto promo when the setting is on. The toggle can only be on once the student status is verified (FA-17).
  const promo = verified && (promoChoice ?? (wantsPromo || !!m?.settings.autoStudentPromo));
  const mode = modeChoice ?? (e ? (e.modes.includes("VIDEO") ? "VIDEO" : e.modes[0]) : "VIDEO");
  const description = descChoice ?? (m?.concernNote ?? "").slice(0, 500);

  const onPromo = (on: boolean) => {
    if (!on) return setPromoChoice(false);
    if (verified) return setPromoChoice(true);
    if (m?.studentStatus === "PENDING") {
      setWantsPromo(true);
      return toast.show({ kind: "info", title: "Verifikasi sedang diproses", body: "Promo akan aktif begitu status mahasiswamu terverifikasi." });
    }
    setWantsPromo(true);
    setVerifySheet(true);
  };

  const submit = async () => {
    if (!slotId) {
      setErrors({ slotId: "Pilih slot konsultasi dulu ya" });
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const b = await createBooking({ expertId, slotId, mode, anonymous, usePromo: promo, description: description.trim() || undefined });
      void qc.invalidateQueries({ queryKey: ["slots", expertId] });
      router.push(`/payment/${b.id}` as Href); // typed routes only know ".../index", which is not a real URL
    } catch (err) {
      if (err instanceof ApiError && err.code === "SLOT_CONFLICT") {
        // BR-08: someone else got the slot first.
        toast.show({ kind: "danger", title: "Slot sudah terisi", body: "Slot ini baru saja dipesan orang lain. Silakan pilih slot lain." });
        setSlotId(null);
        void qc.invalidateQueries({ queryKey: ["slots", expertId] });
      } else if (err instanceof ApiError && err.code === "PROMO_NOT_ELIGIBLE") {
        setPromoChoice(false);
        setVerifySheet(true);
      } else if (err instanceof ApiError && err.fields) {
        setErrors(err.fields);
        if (err.fields.slotId) void qc.invalidateQueries({ queryKey: ["slots", expertId] });
      } else {
        toast.show({ kind: "danger", title: "Pemesanan belum berhasil", body: errorMessage(err) });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.sheet }}>
      <Header title="Pemesanan" onBack={() => router.back()} />
      <KeyboardScroll contentContainerStyle={{ padding: layout.pagePadding, paddingTop: 13, paddingBottom: insets.bottom + 24, gap: 16 }}>
          {expert.isPending || me.isPending ? (
            <View style={{ gap: 16 }}>
              <Skeleton width={80} height={24} />
              <Skeleton height={104} />
              <Skeleton width={200} height={24} />
              <Skeleton height={112} />
              <Skeleton height={107} />
              <Skeleton height={216} />
            </View>
          ) : expert.isError || !e ? (
            <ErrorState message={errorMessage(expert.error, "Data ahli belum bisa dimuat.")} onRetry={() => expert.refetch()} />
          ) : (
            <>
              <View style={{ gap: 12 }}>
                <SectionTitle>Ahli</SectionTitle>
                <ExpertBookingCard expert={e} />
              </View>

              <View style={{ gap: 12 }}>
                <SectionTitle>Tanggal Konsultasi</SectionTitle>
                <DateSelector
                  value={date}
                  disablePast
                  onChange={(d) => {
                    setPicked(d);
                    setSlotId(null);
                  }}
                />
              </View>

              <SlotPicker expertId={expertId} dateKey={dateKey} slotId={slotId} error={errors.slotId} onSelect={(id) => { setSlotId(id); setErrors((x) => ({ ...x, slotId: undefined })); }} />

              <ToggleCard
                title="Konsultasi Anonim"
                caption="Konsultasi anonim menjaga identitasmu demi kenyamananmu saat berkonsultasi"
                value={anonymous}
                onChange={setAnonymousChoice}
              />

              <PromoCard value={promo} onChange={onPromo} />

              <PanelCard style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
                <Text color={colors.text.section} style={{ fontFamily: fontFamily.bodySemibold, fontSize: 18, lineHeight: 24, letterSpacing: -0.36 }}>
                  Mode Konsultasi yang Dipilih
                </Text>
                <View style={{ height: 1, backgroundColor: colors.border.dividerSoft }} />
                {MODES.map((md) => (
                  <Radio key={md} label={MODE_FULL_LABEL[md]} selected={mode === md} disabled={!e.modes.includes(md)} onPress={() => setModeChoice(md)} />
                ))}
                {errors.mode ? (
                  <Text variant="bodyXs" color={colors.text.error}>
                    * {errors.mode}
                  </Text>
                ) : null}
              </PanelCard>

              <View style={{ gap: 8 }}>
                <SectionTitle>Deskripsi Singkat Masalah</SectionTitle>
                <TextField
                  multiline
                  maxLength={500}
                  placeholder="Ceritakan masalahmu dengan singkat"
                  value={description}
                  onChangeText={setDescChoice}
                  error={errors.description}
                  style={{ minHeight: 98 }}
                />
              </View>

              <Button label="Pesan Konsultasi" loading={submitting} onPress={submit} />
            </>
          )}
        </KeyboardScroll>

      <BottomSheet
        visible={verifySheet}
        onClose={() => setVerifySheet(false)}
        mascot="sad"
        title="Kamu belum terverifikasi sebagai mahasiswa"
        body="Verifikasi status mahasiswa hanya 5 menit untuk mendapatkan promo menarik"
        ctaLabel="Verifikasi Status Mahasiswa"
        onCta={() => {
          setVerifySheet(false);
          router.push({ pathname: "/student-verification", params: { from: "booking" } });
        }}
      />
    </View>
  );
}

function SlotPicker({ expertId, dateKey, slotId, error, onSelect }: { expertId: string; dateKey: string; slotId: string | null; error?: string; onSelect: (id: string | null) => void }) {
  const slots = useSlots(expertId, dateKey);
  return (
    <View style={{ gap: 12 }}>
      <SectionTitle>Slot Tersedia</SectionTitle>
      {slots.isPending ? (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Skeleton width={112} height={44} rounded={12} />
          <Skeleton width={112} height={44} rounded={12} />
          <Skeleton width={112} height={44} rounded={12} />
        </View>
      ) : slots.isError ? (
        <ErrorState message={errorMessage(slots.error, "Slot belum bisa dimuat.")} onRetry={() => slots.refetch()} />
      ) : slots.data.slots.length === 0 ? (
        <Text variant="bodyS" color={colors.text.secondary}>
          Belum ada slot di tanggal ini. Coba pilih tanggal lain ya.
        </Text>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {slots.data.slots.map((s) => (
            <SlotChip key={s.id} label={s.label} selected={slotId === s.id} onPress={() => onSelect(slotId === s.id ? null : s.id)} />
          ))}
        </View>
      )}
      {error ? (
        <Text variant="bodyXs" color={colors.text.error}>
          * {error}
        </Text>
      ) : null}
    </View>
  );
}
