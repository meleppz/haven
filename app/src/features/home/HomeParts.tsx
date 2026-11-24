import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { Backdrop, Button, FeatureIcon, Mascot, Text, type Blob } from "@/components";
import type { FeatureIconName } from "@/lib/art";
import { relativeSession, shortDateTime } from "@/lib/format";
import { colors, fontFamily, palette, radius, shadow } from "@/theme";

// Pieces of L42 Beranda (Figma "L10 - Beranda").

export function SectionTitle({ children, hint }: { children: string; hint?: string }) {
  return (
    <View style={{ gap: 8 }}>
      <Text variant="h3" color={colors.text.brand} style={{ fontFamily: fontFamily.headingSemibold, letterSpacing: -0.4, lineHeight: 20 }}>
        {children}
      </Text>
      {hint ? (
        <Text variant="bodyS" color={palette.neutral[700]} style={{ letterSpacing: -0.28, lineHeight: 20 }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

// ---- "Jelajahi Fitur Haven": 4 x 2 grid of 76px tiles -----------------------------------------------------------
export type Tile = { key: string; label: string; icon: FeatureIconName };
export const TILES: Tile[] = [
  { key: "hariIni", label: "Bisa hari ini", icon: "hariIni" },
  { key: "ahli247", label: "Ahli 24/7", icon: "ahli247" },
  { key: "promo", label: "Promo", icon: "promo" },
  { key: "mahasiswa", label: "Khusus mahasiswa", icon: "mahasiswa" },
  { key: "cariAhli", label: "Cari ahli", icon: "cariAhli" },
  { key: "rating", label: "Rating tertinggi", icon: "rating" },
  { key: "riwayat", label: "Riwayat konsultasi", icon: "riwayat" },
  { key: "bantuan", label: "Bantuan", icon: "bantuan" },
];

export function QuickAccessGrid({ onPress }: { onPress: (key: string) => void }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 8 }}>
      {TILES.map((t) => (
        <Pressable key={t.key} accessibilityRole="button" accessibilityLabel={t.label} onPress={() => onPress(t.key)} style={{ width: 76, gap: 4 }}>
          <FeatureIcon name={t.icon} size={76} />
          <Text variant="bodyS" color={colors.text.dayLabel} style={{ textAlign: "center", letterSpacing: -0.28 }}>
            {t.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ---- Assessment banner (shown until the assessment is done) ------------------------------------------------------
const BANNER_BLOBS: Blob[] = [
  { color: palette.primary[200], cx: -49.6, cy: -49.2, rx: 159, ry: 111, blur: 70 },
  { color: palette.secondary[200], cx: 366.8, cy: 141.4, rx: 144.7, ry: 87.3, blur: 70 },
];

export function AssessmentBanner({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.banner}>
      <Backdrop blobs={BANNER_BLOBS} size={{ w: 360, h: 160 }} align="xMidYMid slice" base="#FFFFFF" />
      <View style={{ position: "absolute", left: -25, top: -22 }}>
        <Mascot name="wave" size={173} />
      </View>
      <View style={{ position: "absolute", left: 99, right: 12, top: 29, gap: 16, alignItems: "flex-end" }}>
        <Text variant="title" color={colors.text.brandStrong} style={{ fontFamily: fontFamily.bodyBold, textAlign: "right", lineHeight: 18, letterSpacing: -0.36 }}>
          Cek kesehatan mental supaya Haven bisa menyesuaikan layanan terbaik untukmu
        </Text>
        <Button label="Lakukan Asesmen 2 Menit" size="xs" onPress={onPress} />
      </View>
    </View>
  );
}

// ---- "Jadwal Konsultasi": the next paid session -----------------------------------------------------------------
export function ScheduleCard({ name, startAt, startsInMinutes, inProgress, onPress }: { name: string; startAt: string; startsInMinutes: number; inProgress: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.schedule}>
      <Text variant="title" color={colors.text.brandStrong} numberOfLines={1} style={{ letterSpacing: -0.36, lineHeight: 27 }}>
        Konsultasi dengan {name}
      </Text>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text variant="bodyS" color={colors.text.highlightStrong} style={{ letterSpacing: -0.28 }}>
          {relativeSession(startsInMinutes, inProgress)}
        </Text>
        <Text variant="bodyS" color={palette.neutral[700]} style={{ letterSpacing: -0.28 }}>
          {shortDateTime(startAt)}
        </Text>
      </View>
    </Pressable>
  );
}

// ---- "Informasi Lainnya": image banners -------------------------------------------------------------------------
export type InfoBanner = { key: string; image: number; imageHeight: number; title: string; cta: string };

export function InfoBannerCard({ banner, onPress }: { banner: InfoBanner; onPress: () => void }) {
  const { width } = useWindowDimensions();
  return (
    <View style={[styles.info, { width: width - 32 }]}>
      {/* Figma crops a tall photo (270px) 68px above the card top, which frames the people and the cat. */}
      <Image source={banner.image} contentFit="cover" style={{ position: "absolute", left: 0, right: 0, top: -68.5, height: banner.imageHeight }} />
      <LinearGradient colors={["rgba(17,106,178,0)", palette.primary[800]]} locations={[0, 0.87]} style={StyleSheet.absoluteFill} />
      <View style={styles.infoRow}>
        <Text variant="h2" color={palette.secondary[200]} style={{ flex: 1, fontFamily: fontFamily.bodySemibold, fontSize: 24, lineHeight: 24, letterSpacing: -0.48, textShadowColor: "rgba(0,0,0,0.12)", textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 12 }}>
          {banner.title}
        </Text>
        <Button label={banner.cta} variant="secondary" size="xs" onPress={onPress} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { height: 160, borderRadius: radius.card, overflow: "hidden", backgroundColor: colors.surface.card, ...shadow.card },
  schedule: { backgroundColor: colors.surface.card, borderRadius: radius.card, padding: 16, gap: 8, ...shadow.card },
  info: { height: 160, borderRadius: radius.card, overflow: "hidden", backgroundColor: palette.neutral[200], ...shadow.card },
  infoRow: { position: "absolute", left: 16, right: 16, bottom: 14, flexDirection: "row", alignItems: "flex-end", gap: 8 },
});
