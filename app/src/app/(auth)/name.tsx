import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { StepScreen, TextField } from "@/components";
import { useRegistration } from "@/features/auth/registration-store";
import { nameError } from "@/lib/validators";

// L81.4 Nama Pengguna (registration step 2 of 3)
export default function NameScreen() {
  const router = useRouter();
  const { registrationToken, name: saved, set } = useRegistration();
  const [name, setName] = useState(saved);
  const [error, setError] = useState<string>();

  if (!registrationToken) return <Redirect href="/register" />;

  function next() {
    const e = nameError(name);
    setError(e);
    if (e) return;
    set({ name: name.trim() });
    router.push("/password");
  }

  return (
    <StepScreen step={1} title="Siapa Nama Kamu?" onBack={() => router.back()} cta={{ label: "Lanjut", onPress: next, disabled: !name.trim() }}>
      <TextField
        label="Nama"
        placeholder="Nama"
        value={name}
        onChangeText={(v) => {
          setName(v);
          setError(undefined);
        }}
        error={error}
        autoFocus
        autoCapitalize="words"
        autoComplete="name"
        returnKeyType="next"
        onSubmitEditing={next}
      />
    </StepScreen>
  );
}
