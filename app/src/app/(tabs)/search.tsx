import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";
import { useExperts } from "@/api/experts";
import { Backdrop, Chip, EmptyState, ErrorState, ExpertCard, SearchField, Skeleton, Text, type Blob } from "@/components";
import { FilterSheet } from "@/features/catalog/FilterSheet";
import { QUICK_CHIPS, activeSheetFilters, toQuery, useCatalog } from "@/features/catalog/filters";
import { errorMessage } from "@/features/auth/errors";
import { uiIcons } from "@/lib/ui-icons";
import { colors, layout, palette, radius, shadow } from "@/theme";

// Figma L11 header: Ellipse 178 (primary-200, top-left) and Ellipse 177 (secondary-200, right).
const HEADER_BLOBS: Blob[] = [
  { color: palette.primary[200], cx: 28, cy: -14.5, rx: 215, ry: 150.5, blur: 100 },
  { color: palette.secondary[200], cx: 344.5, cy: 118, rx: 195.5, ry: 118, blur: 100 },
];

// L52 Katalog Layanan "Layanan Tersedia": search, filter sheet, quick chips and the expert list.
export default function SearchTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { filters, patch, focusSearch, consumeFocus } = useCatalog();
  const [sheet, setSheet] = useState(false);
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);

  // The store holds the live text; only the request is debounced (300 ms) so typing stays responsive.
  const [debouncedQ, setDebouncedQ] = useState(filters.q);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filters.q), 300);
    return () => clearTimeout(t);
  }, [filters.q]);
  useEffect(() => {
    if (focusSearch) {
      inputRef.current?.focus();
      consumeFocus();
    }
  }, [focusSearch, consumeFocus]);

  const query = useMemo(() => toQuery({ ...filters, q: debouncedQ }), [filters, debouncedQ]);
  const experts = useExperts(query);
  const badge = activeSheetFilters(filters);

  const open = (id: string, date?: string) =>
    router.push({ pathname: "/experts/[id]", params: date ? { id, tab: "Appointment", date } : { id } });

  const toggleChip = (key: (typeof QUICK_CHIPS)[number]["key"]) =>
    patch({ chips: filters.chips.includes(key) ? filters.chips.filter((c) => c !== key) : [...filters.chips, key] });

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.page }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: layout.pagePadding, paddingBottom: 16, gap: 8 }}>
        <Backdrop blobs={HEADER_BLOBS} size={{ w: 393, h: 154 }} />
        <Text variant="h2" color={colors.text.brandStrong} style={{ fontFamily: "QanelasSoft_Bold", letterSpacing: -0.48, lineHeight: 36 }}>
          Layanan Tersedia
        </Text>
        <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <SearchField ref={inputRef} placeholder="Cari…" value={filters.q} onChangeText={(q) => patch({ q })} returnKeyType="search" />
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Filter" onPress={() => setSheet(true)} style={styles.filterBtn}>
            <SvgXml xml={uiIcons.filterSearch} width={24} height={24} />
            {badge > 0 ? (
              <View style={styles.badge}>
                <Text variant="bodyXs" color={colors.text.onPrimary} style={{ lineHeight: 12, fontSize: 10 }}>
                  {badge}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: layout.pagePadding, paddingVertical: 12, alignItems: "center" }}>
        {QUICK_CHIPS.map((c) => (
          <Chip key={c.key} label={c.label} size="sm" selected={filters.chips.includes(c.key)} onPress={() => toggleChip(c.key)} />
        ))}
      </ScrollView>

      {experts.isPending ? (
        <View style={{ padding: layout.pagePadding, gap: 16 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={259} rounded={16} />
          ))}
        </View>
      ) : experts.isError ? (
        <ErrorState message={errorMessage(experts.error, "Daftar ahli belum bisa dimuat.")} onRetry={() => experts.refetch()} />
      ) : (
        <FlatList
          data={experts.data.items}
          keyExtractor={(e) => e.id}
          renderItem={({ item }) => <ExpertCard expert={item} onOpen={open} />}
          contentContainerStyle={{ paddingHorizontal: layout.pagePadding, paddingTop: 4, paddingBottom: 24, gap: 16, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState message="Belum ada ahli yang cocok. Coba ubah atau atur ulang filternya ya." actionLabel="Atur ulang filter" onAction={() => useCatalog.getState().reset()} />}
          refreshing={experts.isRefetching && !experts.isPending}
          onRefresh={() => experts.refetch()}
          keyboardShouldPersistTaps="handled"
        />
      )}

      <FilterSheet visible={sheet} filters={filters} onClose={() => setSheet(false)} onApply={(f) => { patch(f); setSheet(false); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  filterBtn: { width: 44, height: 44, borderRadius: 13.2, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.surface.card, alignItems: "center", justifyContent: "center", ...shadow.card },
  badge: { position: "absolute", top: -6, right: -6, minWidth: 18, height: 18, borderRadius: radius.full, backgroundColor: colors.action.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
});
