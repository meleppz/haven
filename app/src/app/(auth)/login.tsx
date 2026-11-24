import { useRouter } from "expo-router";
import { useState } from "react";
import { login } from "@/api/auth";
import { AuthHero, AuthSwitchLink, Button, TextField, useToast } from "@/components";
import { useAuth } from "@/features/auth/auth-store";
import { errorMessage, isNetworkError } from "@/features/auth/errors";
import { useGoogleSignIn } from "@/features/auth/GoogleSignIn";
import { ApiError } from "@/lib/api";
import { HOME } from "@/lib/routes";
import { identifierError } from "@/lib/validators";

// L81.1 Masuk
export default function LoginScreen() {
  const router = useRouter();
  const toast = useToast();
  const signIn = useAuth((s) => s.signIn);
  const google = useGoogleSignIn();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  async function submit() {
    const next = { identifier: identifierError(identifier), password: password ? undefined : "Password wajib diisi ya" };
    setErrors(next);
    if (next.identifier || next.password) return;

    setLoading(true);
    try {
      const r = await login(identifier.trim(), password);
      await signIn(r.token);
      router.replace(HOME);
    } catch (e) {
      if (isNetworkError(e)) toast.show({ kind: "danger", title: errorMessage(e) });
      else if (e instanceof ApiError && e.status === 401) setErrors({ password: e.message }); // "Email/nomor atau password belum cocok."
      else setErrors({ password: errorMessage(e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <AuthHero
        title="Masuk"
        fields={
          <>
            <TextField
              label="Email/No. Telepon"
              placeholder="nama@email.com atau 0812…"
              value={identifier}
              onChangeText={(v) => {
                setIdentifier(v);
                setErrors((e) => ({ ...e, identifier: undefined }));
              }}
              error={errors.identifier}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              returnKeyType="next"
            />
            <TextField
              label="Password"
              placeholder="Password"
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                setErrors((e) => ({ ...e, password: undefined }));
              }}
              error={errors.password}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="current-password"
              returnKeyType="go"
              onSubmitEditing={submit}
            />
          </>
        }
        actions={
          <>
            <Button label="Masuk" onPress={submit} loading={loading} />
            <Button label="Masuk dengan Google" variant="outline" onPress={google.open} disabled={loading} />
            <AuthSwitchLink prompt="Belum punya akun?" link="Daftar" onPress={() => router.replace("/register")} />
          </>
        }
      />
      {google.sheet}
    </>
  );
}
