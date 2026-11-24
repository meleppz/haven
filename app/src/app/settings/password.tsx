import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { changePassword } from "@/api/me";
import { Button, Header, KeyboardScroll, TextField, useToast } from "@/components";
import { errorMessage } from "@/features/auth/errors";
import { ApiError } from "@/lib/api";
import { passwordErrors } from "@/lib/validators";
import { colors, layout } from "@/theme";

type Errors = { current?: string; password?: string; confirm?: string };

// "Ganti Kata Sandi" (handoff 6.17) → POST /me/password. A wrong current password comes back as a field error.
export default function ChangePassword() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const e: Errors = { ...passwordErrors(next, confirm) };
    if (!current) e.current = "Isi password lamamu dulu ya";
    setErrors(e);
    if (e.current || e.password || e.confirm) return;
    setSaving(true);
    try {
      await changePassword(current, next);
      toast.show({ kind: "success", title: "Kata sandi berhasil diganti" });
      router.back();
    } catch (err) {
      if (err instanceof ApiError && err.fields?.currentPassword) setErrors({ current: err.fields.currentPassword });
      else if (err instanceof ApiError && err.fields?.newPassword) setErrors({ password: err.fields.newPassword });
      else toast.show({ kind: "danger", title: "Kata sandi belum diganti", body: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.sheet }}>
      <Header title="Ganti Kata Sandi" onBack={() => router.back()} />
      <KeyboardScroll contentContainerStyle={{ padding: layout.pagePadding, paddingTop: 22, paddingBottom: insets.bottom + 24, gap: 16 }}>
          <TextField labelTone="section" label="Password Lama" placeholder="Password lama" secureTextEntry value={current} onChangeText={(t) => { setCurrent(t); setErrors((x) => ({ ...x, current: undefined })); }} error={errors.current} autoComplete="current-password" />
          <TextField labelTone="section" label="Password Baru" placeholder="Minimal 8 karakter" secureTextEntry value={next} onChangeText={(t) => { setNext(t); setErrors((x) => ({ ...x, password: undefined })); }} error={errors.password} autoComplete="new-password" />
          <TextField labelTone="section" label="Konfirmasi Password Baru" placeholder="Ulangi password baru" secureTextEntry value={confirm} onChangeText={(t) => { setConfirm(t); setErrors((x) => ({ ...x, confirm: undefined })); }} error={errors.confirm} autoComplete="new-password" />
          <Button label="Simpan" loading={saving} onPress={save} />
        </KeyboardScroll>
    </View>
  );
}
