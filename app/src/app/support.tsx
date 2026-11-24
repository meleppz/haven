import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { submitTicket } from "@/api/me";
import { BottomSheet, Button, Header, KeyboardScroll, Text, TextField } from "@/components";
import { errorMessage } from "@/features/auth/errors";
import { ApiError } from "@/lib/api";
import { colors, layout } from "@/theme";

// "Hubungi Helpdesk Haven" / "Laporkan Masalah" (handoff 6.16: one simple form, two ticket types → POST /support/tickets).
// Not in Figma; built with the existing header, field and sheet components.
export default function Support() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  const kind = type === "PROBLEM" ? "PROBLEM" : "HELPDESK";
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    if (body.trim().length < 5) return setError("Ceritakan sedikit lebih lengkap ya");
    setSending(true);
    try {
      await submitTicket(kind, body.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError && err.fields?.body ? err.fields.body : errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.sheet }}>
      <Header title={kind === "PROBLEM" ? "Laporkan Masalah" : "Hubungi Helpdesk"} onBack={() => router.back()} />
      <KeyboardScroll contentContainerStyle={{ padding: layout.pagePadding, paddingTop: 22, paddingBottom: insets.bottom + 24, gap: 16 }}>
          <Text variant="bodyM" color={colors.text.secondary}>
            {kind === "PROBLEM"
              ? "Ceritakan masalah yang kamu alami di aplikasi atau saat konsultasi. Tim Haven akan meninjaunya."
              : "Ada pertanyaan atau butuh bantuan? Tulis pesanmu, tim Helpdesk Haven akan membalas lewat email atau nomor teleponmu."}
          </Text>
          <TextField
            labelTone="section"
            label={kind === "PROBLEM" ? "Masalah yang kamu alami" : "Pesanmu"}
            multiline
            maxLength={1000}
            placeholder="Tulis di sini…"
            value={body}
            onChangeText={(v) => {
              setBody(v);
              setError(undefined);
            }}
            error={error}
            style={{ minHeight: 150 }}
          />
          <Button label="Kirim" loading={sending} onPress={send} />
        </KeyboardScroll>
      <BottomSheet
        visible={sent}
        onClose={() => router.back()}
        mascot="happySmall"
        title={kind === "PROBLEM" ? "Laporan terkirim!" : "Pesan terkirim!"}
        body="Terima kasih sudah menghubungi kami. Tim Haven akan segera menindaklanjutinya."
        ctaLabel="Kembali"
        onCta={() => router.back()}
      />
    </View>
  );
}
