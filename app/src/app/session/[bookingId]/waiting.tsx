import { useCameraPermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";
import { useBooking } from "@/api/bookings";
import { recordConsent } from "@/api/sessions";
import { Backdrop, Button, ErrorState, Mascot, Skeleton, Text, useToast, type Blob } from "@/components";
import { errorMessage } from "@/features/auth/errors";
import { CameraPreview } from "@/features/sessions/CameraPreview";
import { CallButton, E2ELine, MicOnIcon } from "@/features/sessions/SessionParts";
import { uiIcons } from "@/lib/ui-icons";
import { useServerNow } from "@/lib/useServerNow";
import { colors, fontFamily, palette } from "@/theme";

// Figma L24 blobs: header pair (as on the other tab headers) plus Ellipse 178 behind the preview, Ellipse 177 bottom-right.
const BLOBS: Blob[] = [
  { color: palette.primary[200], cx: 28, cy: -14.5, rx: 215, ry: 150.5, blur: 100 },
  { color: palette.secondary[200], cx: 344.5, cy: 118, rx: 195.5, ry: 118, blur: 100 },
  { color: palette.primary[100], cx: 316.8, cy: 425.6, rx: 195.3, ry: 243.5, blur: 100, opacity: 0.8 },
  { color: palette.secondary[100], cx: 393.5, cy: 850, rx: 195.5, ry: 118, blur: 100 },
];

const PEEK_AURA: Blob[] = [
  { color: palette.secondary[200], cx: 75, cy: 78, rx: 60, ry: 56, blur: 18, opacity: 0.9 },
  { color: palette.secondary[300], cx: 75, cy: 82, rx: 42, ry: 38, blur: 14, opacity: 0.55 },
];

// L22.2 Ruang Tunggu (Figma "L24"; handoff 6.10, FA-26). Video and voice sessions pass here; voice starts with the camera off.
export default function WaitingRoom() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const id = String(bookingId);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const booking = useBooking(id);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<"front" | "back">("front");
  const [cameraChoice, setCameraChoice] = useState<boolean | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [entering, setEntering] = useState(false);

  const b = booking.data;
  const cameraOn = cameraChoice ?? b?.mode === "VIDEO";
  const serverNow = useServerNow(b?.serverNow, booking.dataUpdatedAt, 15_000);
  const minutesLeft = b ? Math.ceil((Date.parse(b.slot.startAt) - serverNow) / 60_000) : 0;

  // Ask for the camera once, when the waiting room opens (the hook alone never prompts).
  const askable = !!permission && !permission.granted && permission.canAskAgain;
  useEffect(() => {
    if (askable && b?.mode === "VIDEO") void requestPermission();
  }, [askable, b?.mode, requestPermission]);

  const enter = async () => {
    if (!b) return;
    setEntering(true);
    try {
      if (!b.e2eAccepted) await recordConsent(b.id); // FA-26: once per booking
      router.replace({ pathname: "/session/[bookingId]/call", params: { bookingId: b.id, camera: cameraOn ? "1" : "0", mic: micOn ? "1" : "0" } });
    } catch (err) {
      toast.show({ kind: "danger", title: "Belum bisa masuk", body: errorMessage(err) });
    } finally {
      setEntering(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.card }}>
      <Backdrop blobs={BLOBS} size={{ w: 390, h: 844 }} />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Keluar dari ruang tunggu" hitSlop={12} onPress={() => router.back()} style={styles.back}>
          <SvgXml xml={uiIcons.arrowLeft} width={24} height={24} />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
          <Text color={colors.text.brandStrong} numberOfLines={1} style={styles.title}>
            Ruang Tunggu {b?.expert.name ?? ""}
          </Text>
          {b ? <E2ELine anonymous={b.anonymous} center /> : null}
          {b ? (
            <View style={styles.pill}>
              {minutesLeft > 0 ? (
                <Text color={colors.text.brandStrong} style={styles.pillText}>
                  Konsultasi dimulai <Text color={colors.text.brandStrong} style={[styles.pillText, { fontFamily: fontFamily.bodyBold }]}>{minutesLeft} menit</Text> lagi
                </Text>
              ) : (
                <Text color={colors.text.brandStrong} style={[styles.pillText, { fontFamily: fontFamily.bodyBold }]}>
                  Konsultasi sudah dimulai
                </Text>
              )}
            </View>
          ) : null}
        </View>
        <View style={{ width: 24 }} />
      </View>

      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 63, paddingBottom: insets.bottom + 16, gap: 15 }}>
        {booking.isPending ? (
          <Skeleton height={526} rounded={20} />
        ) : booking.isError || !b ? (
          <ErrorState message={errorMessage(booking.error, "Ruang tunggu belum bisa dimuat.")} onRetry={() => booking.refetch()} />
        ) : (
          <>
            <View style={styles.preview}>
              <CameraPreview facing={facing} enabled={cameraOn} />
              <Pressable accessibilityRole="button" accessibilityLabel="Ganti kamera" onPress={() => setFacing((f) => (f === "front" ? "back" : "front"))} style={styles.flip}>
                <SvgXml xml={uiIcons.cameraSwitch} width={38} height={38} />
              </Pressable>
              <View style={styles.controls}>
                <CallButton label={cameraOn ? "Matikan kamera" : "Nyalakan kamera"} off={!cameraOn} size={60} onPress={() => setCameraChoice(!cameraOn)}>
                  <SvgXml xml={uiIcons.callVideo} width={40} height={40} opacity={cameraOn ? 1 : 0.5} />
                </CallButton>
                <CallButton label={micOn ? "Bisukan mikrofon" : "Nyalakan mikrofon"} off={!micOn} size={60} onPress={() => setMicOn(!micOn)}>
                  {micOn ? <MicOnIcon size={34} /> : <SvgXml xml={uiIcons.callMicMute} width={28} height={35} />}
                </CallButton>
              </View>
            </View>
            <Button label="Masuk Ruang Konsultasi" loading={entering} onPress={enter} style={{ minHeight: 60 }} />
          </>
        )}
      </View>

      {/* mascot-peek sits on the preview's top-right corner (Figma "haven-berbinar 2") inside a soft yellow aura.
          The Figma glow is an SVG filter, which react-native-svg does not render on phones, so the aura is drawn here. */}
      <View pointerEvents="none" style={[styles.peek, { top: insets.top + 91 }]}>
        <Backdrop blobs={PEEK_AURA} base={null} size={{ w: 150, h: 150 }} />
        {/* zIndex keeps the mascot above the absolutely positioned aura (web paints positioned layers on top). */}
        <View style={{ zIndex: 1 }}>
          <Mascot name="peek" size={113} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 16, paddingBottom: 14 },
  back: { width: 24, height: 44, justifyContent: "center", marginTop: 0 },
  title: { fontFamily: fontFamily.bodySemibold, fontSize: 20, lineHeight: 30, letterSpacing: -0.4, textAlign: "center" },
  pill: { backgroundColor: colors.surface.banner, borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { fontSize: 13, lineHeight: 14, fontFamily: fontFamily.body },
  preview: { flex: 1, maxHeight: 526, borderRadius: 20, overflow: "hidden", backgroundColor: colors.surface.callStage },
  flip: { position: "absolute", left: 13, top: 18, width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface.flipButton },
  controls: { position: "absolute", bottom: 37, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 9 },
  peek: { position: "absolute", right: -16, width: 150, height: 150, alignItems: "center", justifyContent: "center" },
});
