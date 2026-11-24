import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SvgXml } from "react-native-svg";
import { photoSource, type ExpertSummary, type Mode } from "@/api/experts";
import { dateChipLabel, rupiah } from "@/lib/format";
import { uiIcons } from "@/lib/ui-icons";
import { colors, fontFamily, palette, radius, shadow } from "@/theme";
import { Button } from "./Button";
import { Avatar } from "./Layout";
import { Text } from "./Text";

/** Expert photo (served by the API) with an initials fallback. `top` aligns the crop to the face for portrait photos. */
export function ExpertPhoto({ expert, size, style }: { expert: Pick<ExpertSummary, "name" | "photoUrl">; size: number; style?: object }) {
  const source = photoSource(expert.photoUrl);
  if (!source) return <Avatar name={expert.name} size={size} />;
  return <Image source={source} style={[{ width: size, height: size }, style]} contentFit="cover" contentPosition="top center" accessibilityLabel={`Foto ${expert.name}`} />;
}

export const VerifiedBadge = ({ size = 20 }: { size?: number }) => <SvgXml xml={uiIcons.verifyBold} width={size} height={size} />;

export function RatingLine({ avg, count, size = 14, align = "center" }: { avg: number; count: number; size?: 14 | 16; align?: "center" | "flex-start" }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, justifyContent: align }}>
      <SvgXml xml={uiIcons.starRating} width={16} height={16} />
      <Text variant={size === 16 ? "bodyM" : "bodyS"} color={palette.secondary[600]} style={{ letterSpacing: size === 16 ? -0.32 : -0.28, lineHeight: 16 }}>
        {avg.toFixed(1)} ({count})
      </Text>
    </View>
  );
}

function ModeLine({ mode }: { mode: Mode }) {
  const label = mode === "CHAT" ? "Chat" : mode === "VIDEO" ? "Video Call" : "Voice Call";
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      {mode === "CHAT" ? <SvgXml xml={uiIcons.chatBoldBlue} width={16} height={16} /> : null}
      {mode === "VIDEO" ? <SvgXml xml={uiIcons.videoBoldBlue} width={16} height={16} /> : null}
      {mode === "VOICE" ? <Ionicons name="call" size={14} color={colors.text.brandStrong} /> : null}
      <Text variant="bodyS" color={colors.text.brandStrong} style={{ letterSpacing: -0.28, lineHeight: 14 }}>
        {label}
      </Text>
    </View>
  );
}

type CardProps = { expert: ExpertSummary; onOpen: (expertId: string, date?: string) => void };

// ---------------------------------------------------------------------------------------------------------------
// ExpertCard (L52 Katalog Layanan): photo, name + badge, specialties, modes, rating, nearest dates, price + CTA.
// ---------------------------------------------------------------------------------------------------------------
export function ExpertCard({ expert, onOpen }: CardProps) {
  return (
    <View style={styles.card}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
        <View style={{ width: 72, height: 72, overflow: "hidden" }}>
          <ExpertPhoto expert={expert} size={72} />
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          <View style={{ gap: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text variant="title" color={colors.text.brandStrong} numberOfLines={1} style={{ letterSpacing: -0.36, flexShrink: 1 }}>
                {expert.name}
              </Text>
              {expert.verified ? <VerifiedBadge /> : null}
            </View>
            <Text variant="bodyM" color={colors.text.dayLabel} numberOfLines={2} style={{ letterSpacing: -0.32, lineHeight: 19 }}>
              {expert.specialties.join(" | ")}
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
            {expert.modes.map((m) => (
              <ModeLine key={m} mode={m} />
            ))}
          </View>
          <RatingLine avg={expert.ratingAvg} count={expert.ratingCount} size={16} align="flex-start" />
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text variant="bodyM" color={colors.text.brandStrong} style={{ fontFamily: fontFamily.bodySemibold, letterSpacing: -0.8 }}>
          Jadwal Terdekat
        </Text>
        {expert.nearestDates.length ? (
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {expert.nearestDates.map((d) => (
              <Pressable key={d} accessibilityRole="button" accessibilityLabel={`Lihat jadwal ${dateChipLabel(d)}`} onPress={() => onOpen(expert.id, d)} style={styles.dateChip}>
                <Text variant="bodyM" color={colors.action.primary} style={{ lineHeight: 16 }}>
                  {dateChipLabel(d)}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text variant="bodyS" color={colors.text.secondary}>
            Belum ada jadwal tersedia dalam 14 hari ke depan.
          </Text>
        )}
      </View>

      <View style={styles.priceBar}>
        <View style={{ flex: 1, minWidth: 0, alignItems: "center", paddingHorizontal: 6 }}>
          <PriceText tarif={expert.tarif} />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Lihat profil ${expert.name}`} onPress={() => onOpen(expert.id)} style={({ pressed }) => [styles.priceCta, pressed && { backgroundColor: colors.action.primaryPressed }]}>
          <Text variant="label" color={colors.text.onAction} style={{ fontSize: 16, lineHeight: 20 }}>
            Lihat Profil
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/** "Rp300.000/sesi (1 jam)": the number is 16px semibold, the unit 12px. */
export function PriceText({ tarif }: { tarif: number }) {
  return (
    <Text variant="bodyM" color={colors.text.brandStrong} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: fontFamily.bodySemibold, letterSpacing: -0.32, lineHeight: 16 }}>
      {rupiah(tarif)}
      <Text variant="bodyXs" color={colors.text.brandStrong} style={{ fontFamily: fontFamily.bodySemibold, letterSpacing: -0.24 }}>
        /sesi (1 jam)
      </Text>
    </Text>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// ExpertMiniCard (L42 Beranda carousel): 160px wide.
// ---------------------------------------------------------------------------------------------------------------
export function ExpertMiniCard({ expert, onOpen }: CardProps) {
  return (
    <View style={styles.mini}>
      <View style={{ height: 71, overflow: "hidden", alignSelf: "stretch" }}>
        <View style={{ position: "absolute", top: -6, left: 16, width: 104, height: 104 }}>
          <ExpertPhoto expert={expert} size={104} />
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 }}>
        <Text variant="bodyM" color={colors.text.brandStrong} numberOfLines={1} style={{ fontFamily: fontFamily.bodySemibold, letterSpacing: -0.32, flexShrink: 1 }}>
          {expert.name.split(",")[0]}
        </Text>
        {expert.verified ? <VerifiedBadge /> : null}
      </View>
      <RatingLine avg={expert.ratingAvg} count={expert.ratingCount} />
      <View style={{ flexDirection: "row", gap: 4, justifyContent: "center" }}>
        {expert.specialties.slice(0, 2).map((s) => (
          <View key={s} style={styles.miniTag}>
            <Text variant="bodyXs" color={colors.text.specialty} style={{ letterSpacing: -0.24, lineHeight: 12 }} numberOfLines={1}>
              {s}
            </Text>
          </View>
        ))}
      </View>
      <Button label="Lihat Profil" size="xs" fullWidth onPress={() => onOpen(expert.id)} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface.card, borderRadius: 16, padding: 16, gap: 16, ...shadow.card },
  dateChip: { backgroundColor: palette.primary[50], borderWidth: 1, borderColor: palette.primary[700], borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 8, minHeight: 34, justifyContent: "center" },
  priceBar: { height: 44, borderRadius: 16, backgroundColor: colors.surface.dateBar, flexDirection: "row", alignItems: "center", overflow: "hidden", ...shadow.card },
  priceCta: { width: 176, height: 44, borderRadius: radius.control, backgroundColor: colors.action.primary, alignItems: "center", justifyContent: "center", ...shadow.card },
  mini: { width: 160, backgroundColor: colors.surface.card, borderRadius: radius.card, padding: 12, gap: 8, alignItems: "center", ...shadow.card },
  miniTag: { borderWidth: 1, borderColor: colors.text.specialty, borderRadius: 16, paddingHorizontal: 8, paddingVertical: 4, flexShrink: 1 },
});
