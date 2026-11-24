import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";
import { photoSource } from "@/api/experts";
import { devExpertEnd } from "@/api/sessions";
import { ActionSheet, Backdrop, BottomSheet, ExpertPhoto, Text, useToast, type Blob } from "@/components";
import { errorMessage } from "@/features/auth/errors";
import { CameraPreview } from "@/features/sessions/CameraPreview";
import { CallButton, E2ELine, MicOnIcon, countdownLabel, SESSION_WARN_SEC, TimerPill } from "@/features/sessions/SessionParts";
import { useLiveSession } from "@/features/sessions/useLiveSession";
import { DEMO_MODE } from "@/lib/config";
import { longDate, MODE_LONG } from "@/lib/format";
import { uiIcons } from "@/lib/ui-icons";
import { colors, fontFamily, palette } from "@/theme";

const HEADER_BLOBS: Blob[] = [
  { color: palette.primary[200], cx: 28, cy: -14.5, rx: 215, ry: 150.5, blur: 100 },
  { color: palette.secondary[200], cx: 344.5, cy: 118, rx: 195.5, ry: 118, blur: 100 },
];

// L22.3 Video Call Room (Figma "L23"; handoff 6.11). The expert feed is simulated: their photo, blurred while
// "Menghubungkan…", then sharp once the Ahli simulator connects. Voice sessions show the photo without video.
export default function VideoCall() {
  const params = useLocalSearchParams<{ bookingId: string; camera?: string; mic?: string }>();
  const id = String(params.bookingId);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const live = useLiveSession(id);
  const b = live.booking.data;
  const connected = !!live.state.data?.expertConnected;

  const [cameraOn, setCameraOn] = useState(params.camera !== "0");
  const [micOn, setMicOn] = useState(params.mic !== "0");
  const [facing, setFacing] = useState<"front" | "back">("front");
  const [menu, setMenu] = useState(false);
  const [info, setInfo] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [ending, setEnding] = useState(false);

  const end = async () => {
    setEnding(true);
    try {
      await live.end();
    } catch (err) {
      toast.show({ kind: "danger", title: "Sesi belum bisa diakhiri", body: errorMessage(err) });
    } finally {
      setEnding(false);
      setConfirmEnd(false);
    }
  };

  const voice = b?.mode === "VOICE";
  const photo = b ? photoSource(b.expert.photoUrl) : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.callStage }}>
      {/* Expert feed (simulated) */}
      {photo && !voice ? (
        <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top center" blurRadius={connected ? 0 : 24} transition={400} accessibilityLabel={`Video ${b?.expert.name}`} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.voiceStage]}>
          {b ? (
            <View style={styles.voiceAvatar}>
              <ExpertPhoto expert={b.expert} size={160} />
            </View>
          ) : null}
          {voice ? (
            <Text variant="bodyM" color={colors.text.onPrimary}>
              Panggilan Suara
            </Text>
          ) : null}
        </View>
      )}
      {!connected ? (
        <View style={styles.connecting} pointerEvents="none">
          <ActivityIndicator color={colors.text.onPrimary} />
          <Text variant="bodyM" color={colors.text.onPrimary} style={{ fontFamily: fontFamily.bodySemibold }}>
            Menghubungkan…
          </Text>
        </View>
      ) : null}

      {/* Header overlay */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Backdrop blobs={HEADER_BLOBS} base={colors.surface.card} size={{ w: 390, h: 128 }} />
        <Text color={colors.text.brandStrong} numberOfLines={1} style={styles.name}>
          {b?.expert.name ?? ""}
        </Text>
        {b ? <E2ELine anonymous={b.anonymous} center /> : null}
        <TimerPill value={countdownLabel(live.remainingSec)} warn={live.remainingSec <= SESSION_WARN_SEC} />
      </View>

      {/* Self-view (picture in picture) */}
      <View style={[styles.pip, { bottom: insets.bottom + 130 }]}>
        <CameraPreview facing={facing} enabled={cameraOn && !voice} compact />
        <Pressable accessibilityRole="button" accessibilityLabel="Ganti kamera" hitSlop={8} onPress={() => setFacing((f) => (f === "front" ? "back" : "front"))} style={styles.pipFlip}>
          <SvgXml xml={uiIcons.cameraSwitch} width={28} height={28} />
        </Pressable>
      </View>

      {/* Control bar */}
      <View style={[styles.bar, { bottom: insets.bottom + 36 }]}>
        <CallButton label={cameraOn ? "Matikan kamera" : "Nyalakan kamera"} off={!cameraOn} onPress={() => setCameraOn(!cameraOn)}>
          <SvgXml xml={uiIcons.callVideo} width={36} height={36} opacity={cameraOn ? 1 : 0.5} />
        </CallButton>
        <CallButton label={micOn ? "Bisukan mikrofon" : "Nyalakan mikrofon"} off={!micOn} onPress={() => setMicOn(!micOn)}>
          {micOn ? <MicOnIcon size={30} /> : <SvgXml xml={uiIcons.callMicMute} width={25} height={31.5} />}
        </CallButton>
        <CallButton label="Buka chat" onPress={() => router.push({ pathname: "/session/[bookingId]/chat", params: { bookingId: id, from: "call" } })}>
          <SvgXml xml={uiIcons.callChat} width={31.5} height={31.5} />
        </CallButton>
        <CallButton label="Lainnya" onPress={() => setMenu(true)}>
          <SvgXml xml={uiIcons.callMore} width={36} height={36} />
        </CallButton>
        <CallButton label="Akhiri sesi" danger onPress={() => setConfirmEnd(true)}>
          <SvgXml xml={uiIcons.callEnd} width={36} height={36} />
        </CallButton>
      </View>

      <ActionSheet
        visible={menu}
        onClose={() => setMenu(false)}
        actions={[
          { label: "Info Sesi", icon: "information-circle-outline", onPress: () => setInfo(true) },
          { label: "Laporkan Masalah", icon: "flag-outline", onPress: () => toast.show({ kind: "success", title: "Laporan terkirim", body: "Tim Haven akan meninjau sesi ini." }) },
          ...(DEMO_MODE
            ? [{ label: "Simulasikan: Ahli mengakhiri sesi", icon: "construct-outline" as const, onPress: () => void devExpertEnd(id).catch((e) => toast.show({ kind: "danger", title: "Simulasi gagal", body: errorMessage(e) })) }]
            : []),
        ]}
      />
      <BottomSheet
        visible={info}
        onClose={() => setInfo(false)}
        title="Info Sesi"
        body={b ? `${b.expert.name} · ${MODE_LONG[b.mode]}\n${longDate(b.slot.startAt)}, ${b.slot.label} WIB\nSisa waktu ${countdownLabel(live.remainingSec)}` : undefined}
        ctaLabel="Tutup"
        onCta={() => setInfo(false)}
      />
      <BottomSheet
        visible={confirmEnd}
        onClose={() => setConfirmEnd(false)}
        mascot="confused"
        title="Akhiri sesi konsultasi?"
        body="Waktu konsultasi belum berakhir."
        ctaLabel="Akhiri Sesi Konsultasi"
        loading={ending}
        onCta={() => void end()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { position: "absolute", top: 0, left: 0, right: 0, alignItems: "center", gap: 4, paddingBottom: 13, overflow: "hidden" },
  name: { fontFamily: fontFamily.bodySemibold, fontSize: 20, lineHeight: 30, letterSpacing: -0.4, paddingHorizontal: 24 },
  voiceStage: { alignItems: "center", justifyContent: "center", gap: 16 },
  voiceAvatar: { width: 160, height: 160, borderRadius: 80, overflow: "hidden" },
  connecting: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.surface.connecting },
  pip: { position: "absolute", right: 15, width: 112.5, height: 200, borderRadius: 12, overflow: "hidden", backgroundColor: colors.surface.callStage },
  pipFlip: { position: "absolute", left: 10, top: 10, width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface.flipButton },
  bar: { position: "absolute", left: 15, right: 15, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.surface.callBar },
});
