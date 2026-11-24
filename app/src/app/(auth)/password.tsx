import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { completeRegistration } from "@/api/auth";
import { StepScreen, TextField, useToast } from "@/components";
import { useAuth } from "@/features/auth/auth-store";
import { errorMessage } from "@/features/auth/errors";
import { useRegistration } from "@/features/auth/registration-store";
import { ApiError } from "@/lib/api";
import { ASSESSMENT_INTRO } from "@/lib/routes";
import { passwordErrors } from "@/lib/validators";

// L81.5 Password (registration step 3 of 3). Completing it creates the account and starts the assessment.
export default function PasswordScreen() {
  const router = useRouter();
  const toast = useToast();
  const signIn = useAuth((s) => s.signIn);
  const { registrationToken, name } = useRegistration();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [loading, setLoading] = useState(false);

  if (!registrationToken || !name) return <Redirect href="/register" />;

  async function submit() {
    const e = passwordErrors(password, confirm);
    setErrors(e);
    if (e.password || e.confirm) return;
    setLoading(true);
    try {
      const r = await completeRegistration(registrationToken!, name, password);
      await signIn(r.token); // the registration state is cleared by the assessment intro, so this screen never redirects mid-way
      router.replace(ASSESSMENT_INTRO); // only right after registration do users land on the assessment intro
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors({ password: err.fields.password, confirm: err.fields.confirm });
      else toast.show({ kind: "danger", title: errorMessage(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <StepScreen
      step={2}
      title="Tentukan Password untuk Akun Havenmu"
      onBack={() => router.back()}
      cta={{ label: "Lanjut", onPress: submit, disabled: !password || !confirm, loading }}
    >
      <TextField
        label="Password"
        placeholder="Password"
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          setErrors((x) => ({ ...x, password: undefined }));
        }}
        error={errors.password}
        secureTextEntry
        autoFocus
        autoCapitalize="none"
        autoComplete="new-password"
        returnKeyType="next"
      />
      <TextField
        label="Konfirmasi Password"
        placeholder="Konfirmasi Password"
        value={confirm}
        onChangeText={(v) => {
          setConfirm(v);
          setErrors((x) => ({ ...x, confirm: undefined }));
        }}
        error={errors.confirm}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
    </StepScreen>
  );
}
