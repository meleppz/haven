import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
import { SvgXml } from "react-native-svg";
import type { Mode, Review } from "@/api/experts";
import { Text } from "@/components";
import { relativeDate, rupiahShort } from "@/lib/format";
import { uiIcons } from "@/lib/ui-icons";
import { colors, fontFamily, palette, radius, shadow } from "@/theme";

// Pieces of L51 Detail Psikolog (Figma "L12 - Detail Psikolog 1-3").

export const SectionHeading = ({ children, size = 20 }: { children: string; size?: 18 | 20 }) => (
  <Text variant="title" color={colors.text.brand} style={{ fontFamily: fontFamily.bodySemibold, fontSize: size, lineHeight: size * 1.5, letterSpacing: size === 20 ? -1 : -0.9 }}>
    {children}
  </Text>
);

/** Appointment tab: supported modes on the left, "300rb per sesi (1 jam)" on the right, a divider between. */
export function ModesAndPrice({ modes, tarif }: { modes: Mode[]; tarif: number }) {
  const price = rupiahShort(tarif); // "300rb"
  const number = price.replace(/[a-z]+$/, "");
  const unit = price.replace(/^[\d,]+/, "");
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
      <View style={{ width: 189, gap: 12 }}>
        {modes.map((m) => (
          <View key={m} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {m === "CHAT" ? <SvgXml xml={uiIcons.chatBoldBlue} width={20} height={20} /> : null}
            {m === "VIDEO" ? <SvgXml xml={uiIcons.videoBoldBlue} width={20} height={20} /> : null}
            {m === "VOICE" ? <SvgXml xml={uiIcons.chatBoldBlue} width={20} height={20} /> : null}
            <Text variant="bodyM" color={colors.text.brandStrong} style={{ letterSpacing: -0.32 }}>
              {m === "CHAT" ? "Chat" : m === "VIDEO" ? "Video Call" : "Panggilan Suara"}
            </Text>
          </View>
        ))}
      </View>
      <View style={{ width: 1, height: 70, backgroundColor: palette.neutral[400] }} />
      <View style={{ flex: 1, alignItems: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
          <Text variant="display" color={colors.text.brandStrong} style={{ fontFamily: fontFamily.bodyBold, letterSpacing: 0, lineHeight: 50 }}>
            {number}
          </Text>
          <Text variant="h2" color={colors.text.brandStrong} style={{ fontFamily: fontFamily.bodyBold, lineHeight: 30, marginBottom: 6, marginLeft: 2 }}>
            {unit}
          </Text>
        </View>
        <Text variant="bodyM" color={colors.text.dayLabel} style={{ letterSpacing: -0.32 }}>
          per sesi (1 jam)
        </Text>
      </View>
    </View>
  );
}

/** Review tab header: big star, "4.5 /5.0" and the review count. */
export function RatingSummary({ avg, count }: { avg: number; count: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
        <SvgXml xml={uiIcons.starBig} width={36} height={36} />
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4 }}>
          <Text variant="display" color={palette.secondary[600]} style={{ fontFamily: fontFamily.bodyBold, letterSpacing: -2.1, lineHeight: 46 }}>
            {avg.toFixed(1)}
          </Text>
          <Text variant="bodyM" color={palette.secondary[900]} style={{ marginBottom: 6, letterSpacing: -0.32 }}>
            /5.0
          </Text>
        </View>
      </View>
      <Text variant="bodyM" color="#8B9195" style={{ letterSpacing: -0.32 }}>
        {count} reviews
      </Text>
    </View>
  );
}

/** Review author is always shown as "Anonymous" (BR-17). */
export function ReviewCard({ review }: { review: Review }) {
  return (
    <View style={styles.review}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Image source={require("../../../assets/images/review-avatar.png")} style={{ width: 36, height: 36, borderRadius: 18 }} />
          <View style={{ gap: 4 }}>
            <Text variant="bodyM" color={colors.text.brandStrong} style={{ fontFamily: fontFamily.bodySemibold, letterSpacing: -0.32, lineHeight: 19 }}>
              {review.author}
            </Text>
            <Text variant="bodyXs" color={colors.text.label} style={{ letterSpacing: -0.24, lineHeight: 12 }}>
              {relativeDate(review.createdAt)}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 2 }} accessibilityLabel={`${review.rating} dari 5 bintang`}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={{ opacity: i <= review.rating ? 1 : 0.2 }}>
              <SvgXml xml={uiIcons.starRating} width={16} height={16} />
            </View>
          ))}
        </View>
      </View>
      {review.text ? (
        <Text variant="bodyM" color="#292722" style={{ letterSpacing: -0.32, lineHeight: 22 }}>
          {review.text}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  review: { backgroundColor: colors.surface.card, borderRadius: radius.card, padding: 12, gap: 12, ...shadow.card },
});
