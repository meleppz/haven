import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";
import { photoSource, useExpert, useReviews, useSlots } from "@/api/experts";
import { Backdrop, BottomSheet, Button, DateSelector, EmptyState, ErrorState, SegmentedTabs, SlotChip, Skeleton, SpecialtyChip, StatTile, Text, type Blob } from "@/components";
import { errorMessage } from "@/features/auth/errors";
import { ModesAndPrice, RatingSummary, ReviewCard, SectionHeading } from "@/features/experts/DetailParts";
import { uiIcons } from "@/lib/ui-icons";
import { colors, fontFamily, palette, shadow } from "@/theme";

// Figma L12 hero blobs: Ellipse 178 (primary-200, top-left) and Ellipse 177 (secondary-200, right).
const HERO_BLOBS: Blob[] = [
  { color: palette.primary[200], cx: 29, cy: -47.5, rx: 215, ry: 150.5, blur: 100 },
  { color: palette.secondary[200], cx: 363.5, cy: 229, rx: 195.5, ry: 118, blur: 100 },
];

const TABS = ["About", "Appointment", "Review"] as const;
type TabName = (typeof TABS)[number];

/** "2026-10-11" -> a local Date at noon (avoids day shifts across time zones). */
const fromKey = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
};

// L51 Detail Psikolog: hero photo, license, and the About / Appointment / Review tabs.
export default function ExpertDetail() {
  const params = useLocalSearchParams<{ id: string; tab?: string; date?: string }>();
  const id = String(params.id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const expert = useExpert(id);

  const [tab, setTab] = useState<TabName>(TABS.includes(params.tab as TabName) ? (params.tab as TabName) : "About");
  const [picked, setPicked] = useState<Date | null>(null); // the day chosen in the calendar (overrides the default below)
  const [slotId, setSlotId] = useState<string | null>(null);
  const [info, setInfo] = useState<{ title: string; body: string } | null>(null);

  const e = expert.data;
  // Default day: the date tapped in the catalog, else the expert's nearest day with free slots, else today.
  const nearest = e?.nearestDates[0];
  const date = picked ?? (params.date ? fromKey(params.date) : nearest ? fromKey(nearest) : new Date());
  const dateKey = format(date, "yyyy-MM-dd");

  const book = () =>
    router.push({ pathname: "/booking/[expertId]", params: { expertId: id, ...(slotId ? { slotId, date: dateKey } : {}) } });

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.page }}>
      {/* Hero: blurred blobs and the expert photo */}
      <View style={styles.hero} pointerEvents="none">
        <Backdrop blobs={HERO_BLOBS} size={{ w: 390, h: 360 }} />
        {e && photoSource(e.photoUrl) ? (
          // Real photos are wide portraits that fill the hero. The shared placeholder is a small square cut-out, so it is shown at its own size.
          <Image
            source={photoSource(e.photoUrl)}
            style={e.photoUrl?.includes("placeholder") ? styles.placeholderPhoto : styles.photo}
            contentFit={e.photoUrl?.includes("placeholder") ? "contain" : "cover"}
            contentPosition="top center"
            accessibilityLabel={`Foto ${e.name}`}
          />
        ) : null}
      </View>

      <ScrollView contentContainerStyle={{ paddingTop: 288, paddingBottom: insets.bottom + 120 }} showsVerticalScrollIndicator={false}>
        <View style={styles.sheet}>
          {expert.isPending ? (
            <View style={{ gap: 16 }}>
              <Skeleton width={220} height={28} />
              <Skeleton width={160} height={16} />
              <Skeleton height={31} rounded={100} />
              <Skeleton height={120} />
            </View>
          ) : expert.isError || !e ? (
            <ErrorState message={errorMessage(expert.error, "Profil ahli belum bisa dimuat.")} onRetry={() => expert.refetch()} />
          ) : (
            <>
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text variant="h3" color={colors.text.brandStrong} style={{ fontFamily: fontFamily.bodySemibold, flexShrink: 1 }}>
                    {e.name}
                  </Text>
                  <SvgXml xml={uiIcons.verifyBold} width={24} height={24} />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Info nomor ${e.licenseLabel}`}
                  hitSlop={8}
                  onPress={() => setInfo({ title: `Nomor ${e.licenseLabel} bisa dicek`, body: `Nomor ini dapat dicek di situs resmi ${e.licenseAuthority}, jadi kamu bisa memastikan sendiri bahwa ahlinya terdaftar.` })}
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <Text variant="bodyS" color={palette.neutral[900]}>
                    No. {e.licenseLabel}: {e.licenseNo}
                  </Text>
                  <Ionicons name="information-circle-outline" size={16} color={colors.text.specialty} />
                </Pressable>
              </View>

              <SegmentedTabs tabs={[...TABS]} value={tab} onChange={(t) => setTab(t as TabName)} />

              {tab === "About" ? (
                <View style={{ gap: 20 }}>
                  <View style={{ gap: 12 }}>
                    <SectionHeading>Spesialisasi</SectionHeading>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 4, rowGap: 8 }}>
                      {e.specialties.map((s) => (
                        <SpecialtyChip key={s} label={s} onPress={() => setInfo({ title: s, body: e.specialtyInfo[s] || "Penjelasan untuk bidang ini akan segera hadir." })} />
                      ))}
                    </View>
                  </View>
                  <View style={{ gap: 12 }}>
                    <SectionHeading>Pengalaman</SectionHeading>
                    <View style={{ flexDirection: "row", gap: 8, alignItems: "stretch" }}>
                      <StatTile value={`${e.stats.counselingHours}+`} label="Jam Konseling" />
                      <StatTile value={`${e.stats.yearsExperience}+`} label="Tahun Pengalaman" />
                      <StatTile value={`${e.stats.clientsHelped}+`} label="Klien Terbantu" />
                    </View>
                  </View>
                </View>
              ) : null}

              {tab === "Appointment" ? (
                <View style={{ gap: 24 }}>
                  <ModesAndPrice modes={e.modes} tarif={e.tarif} />
                  <View style={{ gap: 16 }}>
                    <View style={{ gap: 12 }}>
                      <SectionHeading size={18}>Jadwal Konsultasi</SectionHeading>
                      <DateSelector
                        value={date}
                        disablePast
                        onChange={(d) => {
                          setPicked(d);
                          setSlotId(null);
                        }}
                      />
                    </View>
                    <SlotsSection expertId={id} dateKey={dateKey} slotId={slotId} onSelect={setSlotId} />
                  </View>
                </View>
              ) : null}

              {tab === "Review" ? <ReviewsSection expertId={id} avg={e.ratingAvg} count={e.ratingCount} /> : null}
            </>
          )}
        </View>
      </ScrollView>

      <Pressable accessibilityRole="button" accessibilityLabel="Kembali" onPress={() => router.back()} hitSlop={12} style={[styles.back, { top: insets.top + 1 }]}>
        <SvgXml xml={uiIcons.arrowLeft} width={20} height={20} />
        <Text variant="bodyM" color={colors.text.brandStrong} style={{ fontFamily: fontFamily.bodySemibold, letterSpacing: -0.32 }}>
          Kembali
        </Text>
      </Pressable>

      {e ? (
        <View pointerEvents="box-none" style={[styles.cta, { bottom: insets.bottom + 12 }]}>
          <Button label="Pesan Konsultasi" onPress={book} style={{ alignSelf: "center", paddingHorizontal: 24 }} />
        </View>
      ) : null}

      <BottomSheet visible={!!info} onClose={() => setInfo(null)} title={info?.title ?? ""} body={info?.body} ctaLabel="Mengerti" onCta={() => setInfo(null)} />
    </View>
  );
}

function SlotsSection({ expertId, dateKey, slotId, onSelect }: { expertId: string; dateKey: string; slotId: string | null; onSelect: (id: string | null) => void }) {
  const slots = useSlots(expertId, dateKey);
  return (
    <View style={{ gap: 12 }}>
      <SectionHeading size={18}>Slot Tersedia</SectionHeading>
      {slots.isPending ? (
        <View style={{ flexDirection: "row", gap: 7 }}>
          <Skeleton width={110} height={44} rounded={12} />
          <Skeleton width={110} height={44} rounded={12} />
        </View>
      ) : slots.isError ? (
        <ErrorState message={errorMessage(slots.error, "Slot belum bisa dimuat.")} onRetry={() => slots.refetch()} />
      ) : slots.data.slots.length === 0 ? (
        <Text variant="bodyS" color={colors.text.secondary}>
          Belum ada slot di tanggal ini. Coba pilih tanggal lain ya.
        </Text>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
          {slots.data.slots.map((s) => (
            <SlotChip key={s.id} label={s.label} selected={slotId === s.id} onPress={() => onSelect(slotId === s.id ? null : s.id)} />
          ))}
        </View>
      )}
    </View>
  );
}

function ReviewsSection({ expertId, avg, count }: { expertId: string; avg: number; count: number }) {
  const reviews = useReviews(expertId);
  const items = reviews.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <View style={{ gap: 16 }}>
      <RatingSummary avg={avg} count={count} />
      {reviews.isPending ? (
        <Skeleton height={110} />
      ) : reviews.isError ? (
        <ErrorState message={errorMessage(reviews.error, "Ulasan belum bisa dimuat.")} onRetry={() => reviews.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState message="Belum ada ulasan untuk ahli ini." />
      ) : (
        <View style={{ gap: 12 }}>
          {items.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
          {reviews.hasNextPage ? <Button label="Muat ulasan lainnya" variant="outline" size="sm" loading={reviews.isFetchingNextPage} onPress={() => reviews.fetchNextPage()} /> : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { position: "absolute", top: 0, left: 0, right: 0, height: 360, overflow: "hidden" },
  photo: { position: "absolute", left: -47, top: 32, width: 486, height: 324 },
  placeholderPhoto: { position: "absolute", left: 95, top: 72, width: 200, height: 216 },
  sheet: { backgroundColor: colors.surface.sheet, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 21, paddingBottom: 24, gap: 20, minHeight: 556, ...shadow.card },
  back: { position: "absolute", left: 23, flexDirection: "row", alignItems: "center", gap: 8 },
  cta: { position: "absolute", left: 0, right: 0, alignItems: "center" },
});
