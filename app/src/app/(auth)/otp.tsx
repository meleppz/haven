import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { startRegistration, verifyOtp } from "@/api/auth";
import { OtpInput, StepScreen, Text, useToast } from "@/components";
import { errorMessage, isNetworkError } from "@/features/auth/errors";
import { useRegistration } from "@/features/auth/registration-store";
import { DEMO_MODE } from "@/lib/config";
import { colors, fontFamily, palette } from "@/theme";

const RESEND_SECONDS = 60;

// L81.3 Konfirmasi OTP (registration step 1 of 3)
export default function OtpScreen() {
  const router = useRouter();
  const toast = useToast();
  const { identifier, set } = useRegistration();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  if (!identifier) return <Redirect href="/register" />; // opened without starting registration

  async function submit() {
    setLoading(true);
    try {
      const r = await verifyOtp(identifier, code);
      set({ registrationToken: r.registrationToken });
      router.push("/name");
    } catch (e) {
      if (isNetworkError(e)) toast.show({ kind: "danger", title: errorMessage(e) });
      else setError(errorMessage(e)); // "Kodenya belum cocok, coba cek lagi ya."
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (secondsLeft > 0) return;
    try {
      const r = await startRegistration(identifier);
      setCode("");
      setError(undefined);
      setSecondsLeft(RESEND_SECONDS);
      toast.show({ kind: "info", title: DEMO_MODE && r.devCode ? `Kode demo: ${r.devCode}` : "Kode baru sudah dikirim", body: "Silakan cek email/SMS terbaru." });
    } catch (e) {
      toast.show({ kind: "danger", title: errorMessage(e) });
    }
  }

  return (
    <StepScreen step={0} title="Masukkan Kode OTP" onBack={() => router.back()} cta={{ label: "Lanjut", onPress: submit, disabled: code.length < 4, loading }}>
      <View style={{ alignItems: "center", gap: 32 }}>
        <Text variant="bodyM" color={palette.neutral[800]} style={{ textAlign: "center", letterSpacing: -0.32 }}>
          Silakan cek email/SMS terbaru
        </Text>
        <OtpInput
          value={code}
          onChange={(v) => {
            setCode(v);
            setError(undefined);
          }}
          error={error}
        />
        <View style={{ alignItems: "center", gap: 12 }}>
          <Text variant="bodyM" color={palette.neutral[800]} style={{ letterSpacing: -0.32 }}>
            Belum menerima kode OTP?
          </Text>
          <Text
            variant="bodyM"
            accessibilityRole="button"
            accessibilityState={{ disabled: secondsLeft > 0 }}
            onPress={resend}
            color={colors.text.specialty}
            style={{ fontFamily: fontFamily.bodySemibold, textDecorationLine: "underline", letterSpacing: -0.32, opacity: secondsLeft > 0 ? 0.6 : 1 }}
          >
            {secondsLeft > 0 ? `Kirim Ulang (${secondsLeft})` : "Kirim Ulang"}
          </Text>
        </View>
      </View>
    </StepScreen>
  );
}
