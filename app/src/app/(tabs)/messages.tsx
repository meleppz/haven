import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { useChats, type ChatItem } from "@/api/sessions";
import { Badge, EmptyState, ErrorState, ExpertPhoto, Header, SearchField, Skeleton, Text } from "@/components";
import { errorMessage } from "@/features/auth/errors";
import { clockTime, relativeDate } from "@/lib/format";
import { colors, fontFamily, layout } from "@/theme";

/** Today: "20:20"; yesterday: "Kemarin"; this year: "3 Nov"; older: "3 Nov 2025" (handoff 6.12). */
const when = (iso: string, now: Date) => {
  const label = relativeDate(iso, now);
  if (label.startsWith("Hari ini")) return clockTime(iso);
  if (label.startsWith("Kemarin")) return "Kemarin";
  return label.endsWith(String(now.getFullYear())) ? label.replace(/ \d{4}$/, "") : label;
};

// L91.1 Pesan / List Chat (Figma "L25"; handoff 6.12). Status badge Aktif (success) / Selesai (navy).
export default function Pesan() {
  const router = useRouter();
  const chats = useChats();
  const [q, setQ] = useState("");
  const now = new Date(chats.dataUpdatedAt || 0);
  const needle = q.trim().toLowerCase();
  const items = (chats.data?.items ?? []).filter((c) => !needle || c.expert.name.toLowerCase().includes(needle) || (c.lastMessage ?? "").toLowerCase().includes(needle));

  const open = (c: ChatItem) => router.push({ pathname: "/session/[bookingId]/chat", params: { bookingId: c.bookingId } });

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.page }}>
      <Header title="Chat" variant="tab" />
      <FlatList
        data={chats.isPending || chats.isError ? [] : items}
        keyExtractor={(c) => c.bookingId}
        contentContainerStyle={{ paddingHorizontal: layout.pagePadding, paddingTop: 29, paddingBottom: 24, gap: 16 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => void chats.refetch()} />}
        ListHeaderComponent={<SearchField placeholder="Cari…" value={q} onChangeText={setQ} returnKeyType="search" />}
        renderItem={({ item }) => (
          <Pressable accessibilityRole="button" accessibilityLabel={`Chat dengan ${item.expert.name}`} onPress={() => open(item)} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
            <View style={styles.avatar}>
              <ExpertPhoto expert={item.expert} size={48} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="bodyM" color={colors.text.brand} numberOfLines={1} style={{ fontFamily: fontFamily.bodySemibold }}>
                {item.expert.name}
              </Text>
              <Text variant="bodyM" color={colors.text.secondary} numberOfLines={2}>
                {item.lastMessage ?? "Belum ada pesan"}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 12, width: 72 }}>
              <Text variant="bodyM" color={colors.text.secondary} numberOfLines={1} style={{ lineHeight: 19 }}>
                {when(item.lastAt, now)}
              </Text>
              {/* Label pins itself to flex-start; this wrapper right-aligns it under the time (revision). */}
              <View style={{ alignSelf: "flex-end" }}>
                <Badge kind={item.status === "AKTIF" ? "active" : "done"} />
              </View>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          chats.isPending ? (
            <View style={{ gap: 16 }}>
              <Skeleton height={52} />
              <Skeleton height={52} />
            </View>
          ) : chats.isError ? (
            <ErrorState message={errorMessage(chats.error, "Percakapan belum bisa dimuat.")} onRetry={() => chats.refetch()} />
          ) : (
            <EmptyState message={needle ? "Tidak ada percakapan yang cocok." : "Belum ada percakapan. Chat akan muncul setelah kamu memulai sesi."} />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingLeft: 9, minHeight: 52 },
  avatar: { width: 48, height: 48, borderRadius: 24, overflow: "hidden" },
});
