import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FeatureIcon, Text } from "@/components";
import type { FeatureIconName } from "@/lib/art";
import { colors, fontFamily, layout, radius, shadow } from "@/theme";

// Beranda search = "cari fitur" (revision after Phase 6): it finds Haven's features, not psychologists.
// `tile` entries reuse the Beranda quick-access action; `href` entries open a page.

export type Feature = {
  key: string;
  label: string;
  hint: string;
  keywords: string;
  tile?: string; // QuickAccessGrid key handled by Beranda's onTile
  href?: string;
  icon: { feature: FeatureIconName } | { ion: keyof typeof Ionicons.glyphMap };
};

export const FEATURES: Feature[] = [
  { key: "cariAhli", label: "Cari ahli", hint: "Lihat semua psikolog dan psikiater", keywords: "psikolog psikiater konselor katalog layanan dokter", tile: "cariAhli", icon: { feature: "cariAhli" } },
  { key: "hariIni", label: "Bisa hari ini", hint: "Ahli dengan jadwal kosong hari ini", keywords: "sekarang cepat jadwal hari ini", tile: "hariIni", icon: { feature: "hariIni" } },
  { key: "ahli247", label: "Ahli 24/7", hint: "Ahli yang siap kapan saja", keywords: "24 jam malam darurat kapan saja", tile: "ahli247", icon: { feature: "ahli247" } },
  { key: "promo", label: "Promo", hint: "Ahli yang menerima promo mahasiswa", keywords: "diskon murah hemat promo", tile: "promo", icon: { feature: "promo" } },
  { key: "mahasiswa", label: "Khusus mahasiswa", hint: "Verifikasi status mahasiswa, diskon 20%", keywords: "mahasiswa ktm verifikasi diskon kampus universitas", tile: "mahasiswa", icon: { feature: "mahasiswa" } },
  { key: "rating", label: "Rating tertinggi", hint: "Ahli dengan ulasan terbaik", keywords: "ulasan review bintang terbaik", tile: "rating", icon: { feature: "rating" } },
  { key: "jadwal", label: "Ruang Konsultasi", hint: "Jadwal, masuk sesi, batalkan atau ganti jadwal", keywords: "jadwal sesi konsultasi video call batal ganti reschedule", href: "/sessions", icon: { ion: "calendar-outline" } },
  { key: "riwayat", label: "Riwayat konsultasi", hint: "Sesi yang sudah selesai dan catatan konselor", keywords: "riwayat histori ringkasan catatan saran", tile: "riwayat", icon: { feature: "riwayat" } },
  { key: "chat", label: "Chat", hint: "Percakapan dengan ahli", keywords: "pesan chat obrolan", href: "/messages", icon: { ion: "chatbubble-ellipses-outline" } },
  { key: "asesmen", label: "Asesmen", hint: "Isi asesmen 2 menit untuk rekomendasi ahli", keywords: "asesmen tes cek kesehatan mental rekomendasi", href: "/assessment/age", icon: { ion: "clipboard-outline" } },
  { key: "profil", label: "Profil", hint: "Profil dan statistik konsultasimu", keywords: "profil akun saya", href: "/profile", icon: { ion: "person-circle-outline" } },
  { key: "pengaturan", label: "Pengaturan", hint: "Mode anonim, promo otomatis, kata sandi", keywords: "pengaturan setting anonim promo otomatis privasi kata sandi password", href: "/settings", icon: { ion: "settings-outline" } },
  { key: "editProfil", label: "Edit Informasi Personal", hint: "Nama, username, nama samaran", keywords: "edit ubah nama username samaran", href: "/settings/edit-profile", icon: { ion: "create-outline" } },
  { key: "bantuan", label: "Pusat Bantuan", hint: "FAQ, helpdesk, dan bantuan darurat", keywords: "bantuan faq helpdesk tanya darurat krisis", href: "/settings/help", icon: { feature: "bantuan" } },
  { key: "darurat", label: "Bantuan darurat", hint: "Healing119.id dan nomor darurat 119", keywords: "darurat krisis bunuh diri healing119 119 sos", href: "/settings/help", icon: { ion: "alert-circle-outline" } },
  { key: "tentang", label: "Tentang Haven", hint: "Kenalan dengan Haven", keywords: "tentang haven aplikasi", href: "/settings/about", icon: { ion: "information-circle-outline" } },
];

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N} ]/gu, " ");

/** Every word of the query must appear in the label, hint or keywords. Label matches rank first. */
export function searchFeatures(q: string) {
  const words = norm(q).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return FEATURES.map((f) => {
    const label = norm(f.label);
    const all = `${label} ${norm(f.hint)} ${norm(f.keywords)}`;
    if (!words.every((w) => all.includes(w))) return null;
    return { f, score: words.filter((w) => label.includes(w)).length };
  })
    .filter((x): x is { f: Feature; score: number } => !!x)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.f);
}

export function FeatureResults({ query, onOpen, onSearchExperts }: { query: string; onOpen: (f: Feature) => void; onSearchExperts: () => void }) {
  const results = searchFeatures(query);
  return (
    <View style={{ gap: 12 }}>
      {results.length === 0 ? (
        <Text variant="bodyM" color={colors.text.secondary}>
          Fitur &quot;{query.trim()}&quot; belum ada di Haven.
        </Text>
      ) : (
        <View style={styles.card}>
          {results.map((f, i) => (
            <Pressable
              key={f.key}
              accessibilityRole="button"
              onPress={() => onOpen(f)}
              style={({ pressed }) => [styles.row, i > 0 && styles.rule, pressed && { opacity: 0.6 }]}
            >
              <View style={styles.icon}>
                {"feature" in f.icon ? <FeatureIcon name={f.icon.feature} size={40} /> : <Ionicons name={f.icon.ion} size={26} color={colors.text.brand} />}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="bodyM" color={colors.text.brandStrong} style={{ fontFamily: fontFamily.bodySemibold }}>
                  {f.label}
                </Text>
                <Text variant="bodyS" color={colors.text.secondary} numberOfLines={1}>
                  {f.hint}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
      {/* Looking for a person rather than a feature: one tap to the catalog with the same text. */}
      <Pressable accessibilityRole="button" onPress={onSearchExperts} style={({ pressed }) => [styles.experts, pressed && { opacity: 0.7 }]}>
        <Ionicons name="search" size={18} color={colors.text.brand} />
        <Text variant="bodyS" color={colors.text.brand} style={{ flex: 1, fontFamily: fontFamily.bodySemibold }} numberOfLines={1}>
          Cari psikolog bernama &quot;{query.trim()}&quot;
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface.card, borderRadius: radius.card, paddingHorizontal: 12, ...shadow.card },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 60, paddingVertical: 8 },
  rule: { borderTopWidth: 1, borderTopColor: colors.border.default },
  icon: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  experts: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: layout.minTouch, paddingHorizontal: 4 },
});
