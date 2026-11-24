import { useRouter } from "expo-router";
import { useState } from "react";
import { startRegistration } from "@/api/auth";
import { AuthHero, AuthSwitchLink, Button, TextField, useToast } from "@/components";
import { errorMessage, isNetworkError } from "@/features/auth/errors";
import { useGoogleSignIn } from "@/features/auth/GoogleSignIn";
import { useRegistration } from "@/features/auth/registration-store";
import { DEMO_MODE } from "@/lib/config";
import { identifierError } from "@/lib/validators";

// L81.2 Daftar
export default function RegisterScreen() {
  const router = useRouter();
  const toast = useToast();
  const google = useGoogleSignIn();
  const reg = useRegistration();
  const [identifier, setIdentifier] = useState(reg.identifier);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function submit() {
    const e = identifierError(identifier);
    setError(e);
    if (e) return;
    setLoading(true);
    try {
      const r = await startRegistration(identifier.trim());
      reg.set({ identifier: r.identifier, registrationToken: null });
      if (DEMO_MODE && r.devCode) toast.show({ kind: "info", title: `Kode demo: ${r.devCode}`, body: "Masukkan kode ini di langkah berikutnya." });
      router.push("/otp");
    } catch (err) {
      if (isNetworkError(err)) toast.show({ kind: "danger", title: errorMessage(err) });
      else setError(errorMessage(err)); // e.g. "Akun ini sudah terdaftar, silakan masuk ya."
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <AuthHero
        title="Daftar"
        fields={
          <TextField
            label="Email/No. Telepon"
            placeholder="nama@email.com atau 0812…"
            value={identifier}
            onChangeText={(v) => {
              setIdentifier(v);
              setError(undefined);
            }}
            error={error}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            returnKeyType="go"
            onSubmitEditing={submit}
          />
        }
        actions={
          <>
            <Button label="Daftar" onPress={submit} loading={loading} />
            <Button label="Daftar dengan Google" variant="outline" onPress={google.open} disabled={loading} />
            <AuthSwitchLink prompt="Sudah punya akun?" link="Masuk" onPress={() => router.replace("/login")} />
          </>
        }
      />
      {google.sheet}
    </>
  );
}
