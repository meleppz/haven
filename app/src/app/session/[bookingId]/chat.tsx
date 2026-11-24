import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState, type ComponentRef } from "react";
import { FlatList, KeyboardAvoidingView, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";
import { reportUnresponsive, sendMessage, useMessages, type Message } from "@/api/sessions";
import { Backdrop, BottomSheet, Button, ErrorState, ExpertPhoto, Skeleton, Text, useToast, type Blob } from "@/components";
import { errorMessage } from "@/features/auth/errors";
import { E2ELine, countdownLabel, SESSION_WARN_SEC, TimerPill } from "@/features/sessions/SessionParts";
import { useLiveSession } from "@/features/sessions/useLiveSession";
import { clockTime } from "@/lib/format";
import { uiIcons } from "@/lib/ui-icons";
import { colors, fontFamily, palette, radius, typography } from "@/theme";

const HEADER_BLOBS: Blob[] = [
  { color: palette.primary[200], cx: 28, cy: -14.5, rx: 215, ry: 150.5, blur: 100 },
  { color: palette.secondary[200], cx: 344.5, cy: 118, rx: 195.5, ry: 118, blur: 100 },
];

// L91.2 Chat Room (Figma "L26 - Room Chat"; handoff 6.13, BR-19). Polls messages every 2 s; the simulated expert answers
// 2-6 s after each message. A finished session is read-only.
export default function ChatRoom() {
  const params = useLocalSearchParams<{ bookingId: string; from?: string }>();
  const id = String(params.bookingId);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const live = useLiveSession(id);
  const b = live.booking.data;
  const st = live.state.data;
  const ended = live.completed || b?.status === "COMPLETED";
  const { messages, loaded, error, append } = useMessages(id, !ended);
  const listRef = useRef<ComponentRef<typeof FlatList<Message>>>(null);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [dismissedGap, setDismissedGap] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);

  // BR-19: the newest client message has waited longer than `unresponsiveAfterSec` with no expert reply.
  // One sheet per gap: the gap is identified by that message's time.
  const gap =
    st && !ended && st.lastClientMessageAt && (!st.lastExpertMessageAt || st.lastExpertMessageAt < st.lastClientMessageAt) && live.now - Date.parse(st.lastClientMessageAt) >= st.unresponsiveAfterSec * 1000
      ? st.lastClientMessageAt
      : null;
  const showInactivity = !!gap && gap !== dismissedGap;

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const m = await sendMessage(id, body);
      append(m);
      setDraft("");
      void live.state.refetch();
    } catch (err) {
      toast.show({ kind: "danger", title: "Pesan belum terkirim", body: errorMessage(err) });
    } finally {
      setSending(false);
    }
  };

  const report = async () => {
    setDismissedGap(gap);
    try {
      await reportUnresponsive(id);
      toast.show({ kind: "success", title: "Laporan terkirim", body: "Konsultasi bisa dilanjutkan di lain waktu." });
    } catch (err) {
      toast.show({ kind: "danger", title: "Laporan belum terkirim", body: errorMessage(err) });
    }
  };

  const firstName = (b?.expert.name ?? "Ahli").split(",")[0];
  const presence = ended ? "Sesi selesai" : st?.expertConnected ? "Online" : "Menghubungkan…";

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.card }}>
      <View style={[styles.header, { paddingTop: insets.top + 19 }]}>
        <Backdrop blobs={HEADER_BLOBS} base={colors.surface.card} size={{ w: 390, h: 128 }} />
        <Pressable accessibilityRole="button" accessibilityLabel="Kembali" hitSlop={12} onPress={() => router.back()} style={{ width: 24, height: 44, justifyContent: "center" }}>
          <SvgXml xml={uiIcons.arrowLeft} width={20} height={20} />
        </Pressable>
        <View style={styles.avatar}>{b ? <ExpertPhoto expert={b.expert} size={44} /> : null}</View>
        <View style={{ flex: 1 }}>
          {b ? <E2ELine anonymous={b.anonymous} /> : null}
          <Text color={colors.text.brandStrong} numberOfLines={1} style={{ fontFamily: fontFamily.bodyBold, fontSize: 16, lineHeight: 19 }}>
            {b?.expert.name ?? ""}
          </Text>
          <Text variant="bodyS" color={colors.text.brand} style={{ lineHeight: 17 }}>
            {presence}
          </Text>
        </View>
        {st && !ended ? <TimerPill value={countdownLabel(live.remainingSec)} variant="outline" warn={live.remainingSec <= SESSION_WARN_SEC} /> : null}
      </View>

      {/* M3 feedback: a clear way back to the video call; chat sessions get an explicit end action instead. */}
      {b && !ended ? (
        b.mode === "CHAT" ? (
          <Pressable accessibilityRole="button" onPress={() => setConfirmEnd(true)} style={[styles.subPill, { borderColor: colors.action.danger }]}>
            <Ionicons name="exit-outline" size={16} color={colors.action.danger} />
            <Text variant="label" color={colors.action.danger}>
              Akhiri Sesi
            </Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => (params.from === "call" ? router.back() : router.replace({ pathname: "/session/[bookingId]/call", params: { bookingId: id } }))}
            style={styles.subPill}
          >
            <Ionicons name={b.mode === "VOICE" ? "call" : "videocam"} size={16} color={colors.text.brand} />
            <Text variant="label" color={colors.text.brand}>
              {b.mode === "VOICE" ? "Kembali ke Panggilan" : "Kembali ke Video Call"}
            </Text>
          </Pressable>
        )
      ) : null}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        {!loaded && !error ? (
          <View style={{ padding: 12, gap: 10 }}>
            <Skeleton width={230} height={36} />
            <Skeleton width={256} height={36} style={{ alignSelf: "flex-end" }} />
          </View>
        ) : error && !loaded ? (
          <ErrorState message={errorMessage(error, "Percakapan belum bisa dimuat.")} onRetry={() => router.replace({ pathname: "/session/[bookingId]/chat", params })} />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => String(m.id)}
            contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 22, paddingBottom: 12, gap: 10, flexGrow: 1 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <Text variant="bodyS" color={colors.text.secondary} style={{ textAlign: "center", marginTop: 24 }}>
                {ended ? "Tidak ada pesan di sesi ini." : `Mulai bercerita ke ${firstName}. Pesanmu terenkripsi dan hanya bisa dibaca kalian berdua.`}
              </Text>
            }
            renderItem={({ item, index }) => <Bubble m={item} prev={messages[index - 1]} expert={b?.expert} />}
          />
        )}

        {ended ? (
          <View style={[styles.endedBar, { paddingBottom: insets.bottom + 12 }]}>
            <Text variant="bodyM" color={colors.text.brandStrong} style={{ fontFamily: fontFamily.bodySemibold, flex: 1 }}>
              Sesi telah berakhir
            </Text>
            <Button label="Lihat Ringkasan" size="sm" onPress={() => router.push({ pathname: "/history/[bookingId]", params: { bookingId: id } })} />
          </View>
        ) : (
          <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 8) + 8 }]}>
            <View style={styles.field}>
              <Pressable accessibilityRole="button" accessibilityLabel="Stiker" hitSlop={8} onPress={() => toast.show({ kind: "info", title: "Stiker segera hadir" })}>
                <SvgXml xml={uiIcons.sticker} width={20} height={20} />
              </Pressable>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Ketik pesanmu..."
                placeholderTextColor={colors.text.meta}
                multiline
                maxLength={1000}
                style={styles.input}
                accessibilityLabel="Ketik pesanmu"
              />
              <Pressable accessibilityRole="button" accessibilityLabel="Lampirkan gambar" hitSlop={8} onPress={() => toast.show({ kind: "info", title: "Kirim gambar segera hadir" })}>
                <SvgXml xml={uiIcons.attach} width={20} height={20} />
              </Pressable>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Kirim pesan"
              disabled={!draft.trim() || sending}
              onPress={() => void send()}
              style={({ pressed }) => [styles.send, (!draft.trim() || sending) && { opacity: 0.5 }, pressed && { backgroundColor: colors.action.primaryPressed }]}
            >
              <SvgXml xml={uiIcons.send} width={20} height={20} />
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>

      <BottomSheet
        visible={showInactivity}
        onClose={() => setDismissedGap(gap)}
        mascot="annoyed"
        title={`${b?.expert.name ?? "Ahli"} tidak merespon?`}
        body="Kamu bisa melaporkan masalah ini dan konsultasi bisa dilanjutkan di lain waktu."
        ctaLabel="Laporkan Ketidaktanggapan"
        onCta={() => void report()}
      />
      <BottomSheet
        visible={confirmEnd}
        onClose={() => setConfirmEnd(false)}
        mascot="confused"
        title="Akhiri sesi konsultasi?"
        body="Waktu konsultasi belum berakhir."
        ctaLabel="Akhiri Sesi Konsultasi"
        onCta={() => {
          setConfirmEnd(false);
          void live.end().catch((e) => toast.show({ kind: "danger", title: "Sesi belum bisa diakhiri", body: errorMessage(e) }));
        }}
      />
    </View>
  );
}

function Bubble({ m, prev, expert }: { m: Message; prev?: Message; expert?: { name: string; photoUrl: string | null } }) {
  if (m.sender === "SYSTEM") {
    return (
      <Text variant="bodyXs" color={colors.text.secondary} style={{ textAlign: "center", marginVertical: 4 }}>
        {m.body}
      </Text>
    );
  }
  const mine = m.sender === "CLIENT";
  const showAvatar = !mine && prev?.sender !== "EXPERT";
  return (
    <View style={{ flexDirection: "row", justifyContent: mine ? "flex-end" : "flex-start", gap: 4 }}>
      {!mine ? <View style={styles.bubbleAvatar}>{showAvatar && expert ? <ExpertPhoto expert={expert} size={36} /> : null}</View> : null}
      <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
        <Text variant="bodyM" color={mine ? colors.text.brandStrong : colors.text.onPrimary} style={{ flexShrink: 1 }}>
          {m.body}
        </Text>
        <View style={styles.meta}>
          <Text color={mine ? colors.text.meta : colors.text.bubbleTime} style={{ fontSize: 8, lineHeight: 10 }}>
            {clockTime(m.createdAt)}
          </Text>
          {mine ? (
            m.read ? (
              <SvgXml xml={uiIcons.readReceipt} width={10} height={10} accessibilityLabel="Dibaca" />
            ) : (
              <Ionicons name="checkmark" size={10} color={colors.text.meta} accessibilityLabel="Terkirim" />
            )
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingBottom: 11, overflow: "hidden" },
  avatar: { width: 44, height: 44, borderRadius: 22, overflow: "hidden" },
  subPill: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "center", marginTop: 10, borderWidth: 1, borderColor: colors.action.primary, borderRadius: 100, paddingHorizontal: 14, minHeight: 36, backgroundColor: colors.surface.card },
  bubbleAvatar: { width: 36, height: 36, borderRadius: 18, overflow: "hidden" },
  bubble: { maxWidth: "78%", borderRadius: radius.control, paddingLeft: 12, paddingRight: 10, paddingVertical: 6, flexDirection: "row", alignItems: "flex-end", gap: 8 },
  mine: { backgroundColor: colors.surface.bubbleClient },
  theirs: { backgroundColor: colors.surface.bubbleExpert },
  meta: { flexDirection: "row", alignItems: "center", gap: 2, marginBottom: 1 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 8, paddingTop: 8, backgroundColor: colors.surface.card },
  field: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44, borderWidth: 1, borderColor: colors.border.divider, borderRadius: radius.control, paddingHorizontal: 12, backgroundColor: colors.surface.card },
  input: { flex: 1, ...typography.bodyM, color: colors.text.primary, paddingVertical: 10, maxHeight: 120 },
  send: { width: 44, height: 44, borderRadius: radius.control, backgroundColor: colors.action.primary, alignItems: "center", justifyContent: "center" },
  endedBar: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingTop: 12, backgroundColor: colors.surface.sheet, borderTopWidth: 1, borderTopColor: colors.border.default },
});
