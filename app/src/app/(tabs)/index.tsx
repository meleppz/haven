import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { FlatList, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { photoSource, useRecommendations, useUpcoming } from "@/api/experts";
import { useMe } from "@/api/me";
import { Avatar, Backdrop, EmptyState, ErrorState, ExpertMiniCard, SearchField, Skeleton, Text, useToast, type Blob } from "@/components";
import { errorMessage } from "@/features/auth/errors";
import { useCatalog, type Filters } from "@/features/catalog/filters";
import { AssessmentBanner, InfoBannerCard, QuickAccessGrid, ScheduleCard, SectionTitle, type InfoBanner } from "@/features/home/HomeParts";
import { colors, layout, palette } from "@/theme";

// Figma L10 header: Ellipse 178 (primary-200, top-left) and Ellipse 177 (secondary-200, right).
const HEADER_BLOBS: Blob[] = [
  { color: palette.primary[200], cx: 28, cy: -14.5, rx: 215, ry: 150.5, blur: 100 },
  { color: palette.secondary[200], cx: 344.5, cy: 118, rx: 195.5, ry: 118, blur: 100 },
];

const INFO_BANNERS: InfoBanner[] = [
  { key: "cek", image: require("../../../assets/images/info-cek-kesehatan.png"), imageHeight: 270, title: "Cek kesehatan mentalmu dalam 5 menit", cta: "Cek Sekarang" },
  { key: "promo", image: require("../../../assets/images/info-promo-mahasiswa.png"), imageHeight: 256, title: "Dapatkan promo khusus mahasiswa", cta: "Verifikasi Sekarang" },
];

// Sessions we already reminded about in this app run (BR-20: once per session).
const reminded = new Set<string>();

// L42 Beranda
export default function Beranda() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const me = useMe();
  const recs = useRecommendations();
  const upcoming = useUpcoming();
  const openCatalog = useCatalog((s) => s.open);
  const next = upcoming.data?.items[0];
  const refreshing = useRef(false);

  // BR-20: while the app is open and a paid session is <= 10 minutes away, remind once.
  useEffect(() => {
    if (next && next.startsInMinutes > 0 && next.startsInMinutes <= 10 && !reminded.has(next.id)) {
      reminded.add(next.id);
      toast.show({ kind: "info", title: "10 menit lagi ada konsultasi!", body: `Konsultasi dengan ${next.expert.name.split(",")[0]}`, durationMs: 5000 });
    }
  }, [next, toast]);

  const goCatalog = (preset: Partial<Filters>, focus = false) => {
    openCatalog(preset, focus);
    router.navigate("/search");
  };
  const comingSoon = () => toast.show({ kind: "info", title: "Fitur ini segera hadir." });

  const onTile = (key: string) => {
    switch (key) {
      case "hariIni": return goCatalog({ availableToday: true });
      case "ahli247": return goCatalog({ chips: ["24x7"] });
      case "promo": return goCatalog({ chips: ["student"] });
      case "mahasiswa": return comingSoon(); // L31 Verifikasi Status Mahasiswa: Phase 4
      case "cariAhli": return goCatalog({});
      case "rating": return goCatalog({ sort: "rating" });
      case "riwayat": return router.navigate("/sessions");
      case "bantuan": return router.navigate("/profile");
    }
  };

  const openExpert = (id: string) => router.push({ pathname: "/experts/[id]", params: { id } });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface.sheet }}
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={() => {
            if (refreshing.current) return;
            refreshing.current = true;
            void Promise.all([me.refetch(), recs.refetch(), upcoming.refetch()]).finally(() => (refreshing.current = false));
          }}
        />
      }
    >
      {/* Header: gradient, avatar, greeting and the search field (tapping it opens Cari with the input focused) */}
      <View style={{ paddingTop: insets.top + 4, paddingHorizontal: layout.pagePadding, paddingBottom: 16, gap: 15 }}>
        <Backdrop blobs={HEADER_BLOBS} size={{ w: 390, h: 171 }} />
        <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, overflow: "hidden" }}>
            {photoSource(me.data?.avatarUrl ?? null) ? (
              <Image source={photoSource(me.data?.avatarUrl ?? null)} style={{ width: 48, height: 48 }} contentFit="cover" />
            ) : (
              <Avatar name={me.data?.name ?? "Haven"} size={48} />
            )}
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="bodyM" color={palette.neutral[700]} style={{ letterSpacing: -0.32 }}>
              Halo
            </Text>
            {me.data ? (
              <Text variant="h3" color={colors.text.brandStrong} numberOfLines={1} style={{ letterSpacing: -0.4, lineHeight: 20 }}>
                {me.data.name}
              </Text>
            ) : (
              <Skeleton width={140} height={20} />
            )}
          </View>
        </View>
        <View>
          <SearchField placeholder="Cari…" showSoftInputOnFocus={false} onFocus={() => goCatalog({}, true)} />
        </View>
      </View>

      <View style={{ paddingHorizontal: layout.pagePadding, paddingTop: 16, gap: 24 }}>
        <View style={{ gap: 12 }}>
          <SectionTitle>Jelajahi Fitur Haven</SectionTitle>
          <QuickAccessGrid onPress={onTile} />
        </View>

        {me.data && !me.data.assessmentDone ? <AssessmentBanner onPress={() => router.push("/assessment/age")} /> : null}

        {next ? (
          <View style={{ gap: 12 }}>
            <SectionTitle>Jadwal Konsultasi</SectionTitle>
            <ScheduleCard
              name={next.expert.name.split(",")[0]}
              startAt={next.slot.startAt}
              startsInMinutes={next.startsInMinutes}
              inProgress={next.inProgress}
              onPress={() => router.navigate("/sessions")}
            />
          </View>
        ) : null}

        <View style={{ gap: 12 }}>
          <SectionTitle hint="Rekomendasi terbaik sesuai kondisi kamu!">Butuh Psikolog Sekarang?</SectionTitle>
          {recs.isPending ? (
            <View style={{ flexDirection: "row", gap: 9 }}>
              <Skeleton width={160} height={217} />
              <Skeleton width={160} height={217} />
            </View>
          ) : recs.isError ? (
            <ErrorState message={errorMessage(recs.error, "Rekomendasi belum bisa dimuat.")} onRetry={() => recs.refetch()} />
          ) : recs.data.items.length === 0 ? (
            <EmptyState message="Belum ada rekomendasi untuk saat ini." />
          ) : (
            <FlatList
              horizontal
              data={recs.data.items}
              keyExtractor={(e) => e.id}
              renderItem={({ item }) => <ExpertMiniCard expert={item} onOpen={openExpert} />}
              ItemSeparatorComponent={() => <View style={{ width: 9 }} />}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 6 }}
              style={{ marginHorizontal: -layout.pagePadding }}
              ListHeaderComponent={<View style={{ width: layout.pagePadding }} />}
              ListFooterComponent={<View style={{ width: layout.pagePadding }} />}
            />
          )}
        </View>

        <View style={{ gap: 12 }}>
          <SectionTitle>Informasi Lainnya</SectionTitle>
          <FlatList
            horizontal
            data={INFO_BANNERS}
            keyExtractor={(b) => b.key}
            renderItem={({ item }) => <InfoBannerCard banner={item} onPress={() => (item.key === "cek" ? router.push("/assessment/age") : comingSoon())} />}
            ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
            showsHorizontalScrollIndicator={false}
            snapToAlignment="start"
            decelerationRate="fast"
            style={{ overflow: "visible" }}
          />
        </View>
      </View>
    </ScrollView>
  );
}
