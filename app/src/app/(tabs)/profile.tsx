import { useRouter } from "expo-router";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";
import { photoSource } from "@/api/experts";
import { useMe, useStats } from "@/api/me";
import { Avatar, Backdrop, Button, ErrorState, Skeleton, Text, type Blob } from "@/components";
import { errorMessage } from "@/features/auth/errors";
import { FaqList, ProfileStat } from "@/features/account/AccountParts";
import { DEMO_MODE } from "@/lib/config";
import { DEV_MENU, HOME, SETTINGS } from "@/lib/routes";
import { uiIcons } from "@/lib/ui-icons";
import { colors, fontFamily, layout, palette } from "@/theme";

// Figma "Profil" header (354 tall): Ellipse 179 primary-200 top-left, Ellipse 180 secondary-200 right, fading into the page.
const HEADER_BLOBS: Blob[] = [
  { color: palette.primary[200], cx: 46, cy: -37, rx: 215, ry: 203, blur: 100 },
  { color: palette.secondary[200], cx: 362.5, cy: 72, rx: 195.5, ry: 147, blur: 100 },
];

// L84 Profil (Figma "Profil"; UT8.4, F7.1; handoff 6.16).
export default function Profil() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const me = useMe();
  const stats = useStats();
  const m = me.data;
  const s = stats.data;

  const back = () => (router.canGoBack() ? router.back() : router.navigate(HOME));
  const contact = (type: "HELPDESK" | "PROBLEM") => router.push({ pathname: "/support", params: { type } });

  // Fixed title bar (like the catalog header): back, "Profil", gear stay put while the rest scrolls. Both layers draw the
  // same gradient; the body's copy is shifted up by the bar height so they line up seamlessly at rest.
  const barHeight = insets.top + 11 + 44 + 6;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.sheet }}>
      <View style={[styles.bar, { height: barHeight, paddingTop: insets.top + 11 }]}>
        <View pointerEvents="none" style={[styles.backdrop, { top: 0 }]}>
          <Backdrop blobs={HEADER_BLOBS} base={colors.surface.sheet} size={{ w: 390, h: 520 }} />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Kembali" hitSlop={10} onPress={back} style={{ width: 24, height: 44, justifyContent: "center" }}>
          <SvgXml xml={uiIcons.arrowLeft} width={24} height={24} />
        </Pressable>
        <Text color={colors.text.brandStrong} style={styles.title}>
          Profil
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Pengaturan" hitSlop={6} onPress={() => router.push(SETTINGS)} style={{ width: 44, height: 44, alignItems: "flex-end", justifyContent: "center" }}>
          <SvgXml xml={uiIcons.settingBold} width={36} height={36} />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => void Promise.all([me.refetch(), stats.refetch()])} />}
      >
        <View pointerEvents="none" style={[styles.backdrop, { top: -barHeight }]}>
          <Backdrop blobs={HEADER_BLOBS} base={colors.surface.sheet} size={{ w: 390, h: 520 }} />
        </View>
        <View style={styles.header}>
        {me.isPending ? (
          <View style={{ alignItems: "center", gap: 10, marginTop: 12 }}>
            <Skeleton width={72} height={72} rounded={36} />
            <Skeleton width={140} height={22} />
            <Skeleton width={100} height={16} />
          </View>
        ) : me.isError || !m ? (
          <ErrorState message={errorMessage(me.error, "Profil belum bisa dimuat.")} onRetry={() => me.refetch()} />
        ) : (
          <View style={{ alignItems: "center", gap: 8, marginTop: 6 }}>
            {/* Handoff §10: long-press the avatar to open the dev menu (demo mode only). */}
            <Pressable
              accessibilityRole={DEMO_MODE ? "button" : undefined}
              accessibilityHint={DEMO_MODE ? "Tekan lama untuk membuka menu demo" : undefined}
              disabled={!DEMO_MODE}
              delayLongPress={600}
              onLongPress={() => router.push(DEV_MENU)}
              style={styles.avatar}
            >
              <Avatar name={m.name} uri={photoSource(m.avatarUrl)?.uri} size={72} />
            </Pressable>
            <Text color={colors.text.brandStrong} style={styles.name} numberOfLines={1}>
              {m.name}
            </Text>
            <Text variant="bodyM" color={colors.text.secondary} style={{ letterSpacing: -0.32, lineHeight: 20 }}>
              @{m.username}
            </Text>
          </View>
        )}

        <View style={styles.stats}>
          {stats.isPending ? (
            <>
              <Skeleton height={72} style={{ flex: 1 }} />
              <Skeleton height={72} style={{ flex: 1 }} />
              <Skeleton height={72} style={{ flex: 1 }} />
            </>
          ) : s ? (
            <>
              <ProfileStat value={`${s.consultationCount}x`} label={"Riwayat\nKonsultasi"} />
              <ProfileStat value={String(s.distinctExperts)} label={"Histori\nPsikolog"} />
              <ProfileStat value={String(s.daysJoined)} label={"Hari\nBergabung"} />
            </>
          ) : null}
        </View>
      </View>

      <View style={{ paddingHorizontal: layout.pagePadding, gap: 24, marginTop: 22 }}>
        <FaqList />
        <View style={{ gap: 8 }}>
          <Button label="Hubungi Helpdesk Haven" onPress={() => contact("HELPDESK")} style={{ minHeight: 47 }} />
          <Button label="Laporkan Masalah" variant="outline" onPress={() => contact("PROBLEM")} style={{ minHeight: 47 }} />
        </View>
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: "absolute", left: 0, right: 0, height: 520 },
  bar: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingHorizontal: layout.pagePadding, overflow: "hidden", zIndex: 1 },
  header: { paddingHorizontal: layout.pagePadding, paddingBottom: 6 },
  title: { flex: 1, fontFamily: fontFamily.headingBold, fontSize: 24, lineHeight: 36, letterSpacing: -0.48 },
  avatar: { width: 72, height: 72, borderRadius: 36, overflow: "hidden" },
  name: { fontFamily: fontFamily.bodySemibold, fontSize: 24, lineHeight: 28, letterSpacing: -0.48 },
  stats: { flexDirection: "row", gap: 8, marginTop: 16 },
});
