import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHistory } from "@/api/bookings";
import { EmptyState, ErrorState, Header, SearchField, Skeleton } from "@/components";
import { errorMessage } from "@/features/auth/errors";
import { HistoryCard } from "@/features/sessions/SessionParts";
import { colors, layout } from "@/theme";

// Riwayat Konsultasi (Figma "L27"; opened from "Lihat Semua" on Ruang Konsultasi). Completed sessions, newest first.
export default function Riwayat() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState("");
  const history = useHistory(q);
  const items = history.data?.items ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.sheet }}>
      <Header title="Riwayat Konsultasi" onBack={() => router.back()} />
      <FlatList
        data={history.isPending || history.isError ? [] : items}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ padding: layout.pagePadding, paddingTop: 20, paddingBottom: insets.bottom + 24, gap: 12 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={<SearchField placeholder="Cari…" value={q} onChangeText={setQ} returnKeyType="search" />}
        renderItem={({ item }) => <HistoryCard booking={item} onOpen={() => router.push({ pathname: "/history/[bookingId]", params: { bookingId: item.id } })} />}
        ListEmptyComponent={
          history.isPending ? (
            <View style={{ gap: 12 }}>
              <Skeleton height={89} />
              <Skeleton height={89} />
              <Skeleton height={89} />
            </View>
          ) : history.isError ? (
            <ErrorState message={errorMessage(history.error, "Riwayat belum bisa dimuat.")} onRetry={() => history.refetch()} />
          ) : (
            <EmptyState message={q ? "Tidak ada riwayat yang cocok." : "Belum ada riwayat konsultasi."} />
          )
        }
      />
    </View>
  );
}
