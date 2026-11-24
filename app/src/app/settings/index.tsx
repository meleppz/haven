import { useQueryClient } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { meKey, updateSettings, useMe, type Me } from "@/api/me";
import { BottomSheet, Button, ErrorState, Header, Skeleton, useToast } from "@/components";
import { useAuth } from "@/features/auth/auth-store";
import { errorMessage } from "@/features/auth/errors";
import { SettingsCard, SettingsSection } from "@/features/account/AccountParts";
import { colors, layout } from "@/theme";

// L71 Pengaturan (Figma "L34 - Pengaturan"; UT7.1; handoff 6.17). The two toggles are the BR-21 / BR-14 defaults
// that Pemesanan reads.
export default function Pengaturan() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const me = useMe();
  const [logout, setLogout] = useState(false);
  const m = me.data;

  // Optimistic: flip it in the cache, roll back if the server says no.
  const toggle = async (key: keyof Me["settings"], value: boolean) => {
    if (!m) return;
    const prev = m;
    qc.setQueryData<Me>(meKey, { ...m, settings: { ...m.settings, [key]: value } });
    try {
      await updateSettings({ [key]: value });
    } catch (err) {
      qc.setQueryData<Me>(meKey, prev);
      toast.show({ kind: "danger", title: "Pengaturan belum tersimpan", body: errorMessage(err) });
    }
  };

  const go = (href: Href) => () => router.push(href);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.sheet }}>
      <Header title="Pengaturan" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: layout.pagePadding, paddingTop: 23, paddingBottom: insets.bottom + 24, gap: 20 }}>
        {me.isPending ? (
          <View style={{ gap: 20 }}>
            <Skeleton height={86} />
            <Skeleton height={180} />
            <Skeleton height={165} />
          </View>
        ) : me.isError || !m ? (
          <ErrorState message={errorMessage(me.error, "Pengaturan belum bisa dimuat.")} onRetry={() => me.refetch()} />
        ) : (
          <>
            <SettingsSection title="Profil">
              <SettingsCard
                rows={[
                  { kind: "link", label: "Edit Informasi Personal", onPress: go("/settings/edit-profile") },
                  { kind: "link", label: "Ganti Kata Sandi", onPress: go("/settings/password") },
                ]}
              />
            </SettingsSection>
            <SettingsSection title="Aplikasi">
              <SettingsCard
                rows={[
                  { kind: "link", label: "Notifikasi", onPress: go("/settings/notifications") },
                  { kind: "link", label: "Pusat Bantuan", onPress: go("/settings/help") },
                  { kind: "link", label: "Tentang Haven", onPress: go("/settings/about") },
                  { kind: "toggle", label: "Gunakan Promo Mahasiswa Otomatis", value: m.settings.autoStudentPromo, onChange: (v) => void toggle("autoStudentPromo", v) },
                ]}
              />
            </SettingsSection>
            <SettingsSection title="Privasi dan Keamanan">
              <SettingsCard
                rows={[
                  { kind: "link", label: "Privasi dan Keamanan", onPress: go("/settings/privacy") },
                  { kind: "link", label: "Aktivitas Akun", onPress: go("/settings/activity") },
                  {
                    kind: "toggle",
                    label: "Aktifkan Mode Anonim",
                    value: m.settings.defaultAnonymous,
                    onChange: (v) => void toggle("defaultAnonymous", v),
                    caption: "Berlaku otomatis untuk semua konsultasi berikutnya",
                  },
                ]}
              />
            </SettingsSection>
            <Button label="Keluar" variant="danger" onPress={() => setLogout(true)} />
          </>
        )}
      </ScrollView>

      {/* Figma modal 883:2832 */}
      <BottomSheet
        visible={logout}
        onClose={() => setLogout(false)}
        mascot="confused"
        title="Keluar dari aplikasi Haven?"
        body="Kamu perlu masuk kembali dengan akunmu jika ingin mengakses fitur-fitur di Haven."
        ctaLabel="Keluar"
        onCta={() => {
          setLogout(false);
          void useAuth.getState().signOut(); // the route guard takes the app back to Masuk (L81.1)
        }}
      />
    </View>
  );
}
