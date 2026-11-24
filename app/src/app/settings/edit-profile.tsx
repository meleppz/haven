import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { meKey, updateProfile, useMe } from "@/api/me";
import { Button, ErrorState, Header, KeyboardScroll, Skeleton, Text, TextField, useToast } from "@/components";
import { errorMessage } from "@/features/auth/errors";
import { ApiError } from "@/lib/api";
import { nameError } from "@/lib/validators";
import { colors, layout } from "@/theme";

type Errors = { name?: string; username?: string; displayName?: string };

// "Edit Informasi Personal" (handoff 6.17): name, username, and the display name experts see in anonymous mode (BR-15).
export default function EditProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const me = useMe();
  const m = me.data;
  const [name, setName] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  const v = { name: name ?? m?.name ?? "", username: username ?? m?.username ?? "", displayName: displayName ?? m?.displayName ?? "" };

  const save = async () => {
    const next: Errors = {};
    const n = nameError(v.name);
    if (n) next.name = n;
    if (!/^[a-z0-9_.]{3,30}$/i.test(v.username.trim())) next.username = "Username 3-30 karakter: huruf, angka, titik, atau garis bawah";
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const updated = await updateProfile({ name: v.name.trim(), username: v.username.trim(), displayName: v.displayName.trim() || null });
      qc.setQueryData(meKey, updated);
      toast.show({ kind: "success", title: "Profil tersimpan" });
      router.back();
    } catch (err) {
      if (err instanceof ApiError && err.code === "USERNAME_TAKEN") setErrors({ username: err.message });
      else if (err instanceof ApiError && err.fields) setErrors(err.fields);
      else toast.show({ kind: "danger", title: "Profil belum tersimpan", body: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  const clear = (k: keyof Errors) => setErrors((e) => ({ ...e, [k]: undefined }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.sheet }}>
      <Header title="Edit Informasi Personal" onBack={() => router.back()} />
      <KeyboardScroll contentContainerStyle={{ padding: layout.pagePadding, paddingTop: 22, paddingBottom: insets.bottom + 24, gap: 16 }}>
          {me.isPending ? (
            <View style={{ gap: 16 }}>
              <Skeleton height={71} />
              <Skeleton height={71} />
              <Skeleton height={71} />
            </View>
          ) : me.isError || !m ? (
            <ErrorState message={errorMessage(me.error, "Profil belum bisa dimuat.")} onRetry={() => me.refetch()} />
          ) : (
            <>
              <TextField labelTone="section" label="Nama" value={v.name} onChangeText={(t) => { setName(t); clear("name"); }} error={errors.name} autoComplete="name" />
              <TextField labelTone="section" label="Username" value={v.username} onChangeText={(t) => { setUsername(t); clear("username"); }} error={errors.username} autoCapitalize="none" autoCorrect={false} />
              <View style={{ gap: 6 }}>
                <TextField
                  labelTone="section"
                  label="Nama Samaran (Mode Anonim)"
                  placeholder="Anonim"
                  value={v.displayName}
                  maxLength={30}
                  onChangeText={(t) => { setDisplayName(t); clear("displayName"); }}
                  error={errors.displayName}
                />
                <Text variant="bodyXs" color={colors.text.secondary}>
                  Saat konsultasi anonim, ahli hanya melihat nama ini. Kosongkan untuk tampil sebagai &quot;Anonim&quot;.
                </Text>
              </View>
              <Button label="Simpan" loading={saving} onPress={save} />
            </>
          )}
        </KeyboardScroll>
    </View>
  );
}
