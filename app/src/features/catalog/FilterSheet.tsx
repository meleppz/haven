import { useState, type ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Chip, RangeSlider, Text } from "@/components";
import { rupiah } from "@/lib/format";
import { colors, fontFamily, palette, radius, shadow } from "@/theme";
import { CATEGORIES, EXPERIENCES, PRICE_MAX, PRICE_MIN, SORTS, SPECIALTIES, TIMES, defaultFilters, type Filters } from "./filters";

// L52 Filter bottom sheet (Figma "filter"): drag handle, title, chip groups, price slider, and the apply button.
// Edits are kept in a draft and only applied by "Lihat Layanan Tersedia".
type Props = { visible: boolean; filters: Filters; onClose: () => void; onApply: (f: Filters) => void };

function Group({ label, right, children }: { label: string; right?: ReactNode; children: ReactNode }) {
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Text variant="bodyS" color={colors.text.label} style={{ fontFamily: fontFamily.bodyMedium, letterSpacing: -0.28, lineHeight: 21 }}>
          {label}
        </Text>
        {right}
      </View>
      {children}
    </View>
  );
}

const Row = ({ children }: { children: ReactNode }) => <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{children}</View>;

/** The body is remounted (via `key`) each time the sheet opens, so the draft always starts from the applied filters. */
export function FilterSheet(props: Props) {
  return <FilterSheetBody key={props.visible ? "open" : "closed"} {...props} />;
}

function FilterSheetBody({ visible, filters, onClose, onApply }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [draft, setDraft] = useState(filters);

  const set = (p: Partial<Filters>) => setDraft((d) => ({ ...d, ...p }));
  const toggleSpecialty = (s: string) => set({ specialties: draft.specialties.includes(s) ? draft.specialties.filter((x) => x !== s) : [...draft.specialties, s] });
  const maxLabel = draft.maxPrice >= PRICE_MAX ? `+${rupiah(PRICE_MAX)}` : rupiah(draft.maxPrice);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Tutup filter" />
      <View style={[styles.sheet, { maxHeight: height * 0.92, paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <View style={styles.handle} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", alignSelf: "stretch" }}>
          <Text variant="h3" color={colors.text.brandStrong} style={{ fontFamily: fontFamily.bodySemibold, letterSpacing: -0.4 }}>
            Filter
          </Text>
          <Text variant="bodyS" accessibilityRole="button" onPress={() => setDraft({ ...defaultFilters, q: draft.q, chips: draft.chips })} color={colors.text.specialty} style={{ fontFamily: fontFamily.bodySemibold }}>
            Atur ulang
          </Text>
        </View>

        <ScrollView style={{ alignSelf: "stretch" }} contentContainerStyle={{ gap: 12, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
          <Group label="Kategori">
            <Row>
              {CATEGORIES.map((c) => (
                <Chip key={c} label={c} selected={draft.category === c} onPress={() => set({ category: c })} />
              ))}
            </Row>
          </Group>

          <Group label="Urutkan Berdasarkan">
            <Row>
              {SORTS.map((s) => (
                <Chip key={s.key} label={s.label} selected={draft.sort === s.key} onPress={() => set({ sort: draft.sort === s.key ? null : s.key })} />
              ))}
            </Row>
          </Group>

          <Group label="Spesialisasi">
            <Row>
              <Chip label="Semua" selected={draft.specialties.length === 0} onPress={() => set({ specialties: [] })} />
              {SPECIALTIES.map((s) => (
                <Chip key={s} label={s} selected={draft.specialties.includes(s)} onPress={() => toggleSpecialty(s)} />
              ))}
            </Row>
          </Group>

          <Group
            label="Harga per Sesi"
            right={
              <Text variant="bodyM" color={colors.action.primary} style={{ fontFamily: fontFamily.bodySemibold, letterSpacing: -0.32 }}>
                {rupiah(draft.minPrice)} -{maxLabel}
              </Text>
            }
          >
            <RangeSlider min={PRICE_MIN} max={PRICE_MAX} step={50_000} value={[draft.minPrice, draft.maxPrice]} onChange={([lo, hi]) => set({ minPrice: lo, maxPrice: hi })} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: -8 }}>
              <Text variant="bodyXs" color={colors.text.brandStrong}>
                {rupiah(PRICE_MIN)}
              </Text>
              <Text variant="bodyXs" color={colors.text.brandStrong}>
                +{rupiah(PRICE_MAX)}
              </Text>
            </View>
          </Group>

          <Group label="Pengalaman">
            <Row>
              {EXPERIENCES.map((e) => (
                <Chip key={e.key} label={e.label} selected={draft.experience === e.key} onPress={() => set({ experience: e.key })} />
              ))}
            </Row>
          </Group>

          {/* Not in the Figma sheet: filtering by time is a user need (evening / weekend), handoff 13 #4. */}
          <Group label="Waktu">
            <Row>
              {TIMES.map((t) => (
                <Chip key={t} label={t} selected={draft.time === t} onPress={() => set({ time: t })} />
              ))}
            </Row>
          </Group>
        </ScrollView>

        <Button label="Lihat Layanan Tersedia" onPress={() => onApply(draft)} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { backgroundColor: colors.surface.card, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: 16, paddingTop: 8, gap: 16, alignItems: "center", ...shadow.card },
  handle: { width: 70, height: 4, borderRadius: radius.full, backgroundColor: palette.neutral[500] },
});
