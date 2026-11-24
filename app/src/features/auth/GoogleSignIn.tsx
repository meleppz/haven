import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchGoogleAccounts, googleSignIn } from "@/api/auth";
import { Avatar, Button, Text, useToast } from "@/components";
import { ApiError } from "@/lib/api";
import { ASSESSMENT_INTRO, HOME } from "@/lib/routes";
import { colors, radius, shadow } from "@/theme";
import { useAuth } from "./auth-store";

// "Masuk/Daftar dengan Google" is simulated with a mock account picker (handoff §6.1): not in the Figma design, so it is a
// plain bottom sheet in the app's style.
export function useGoogleSignIn() {
  const [visible, setVisible] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();
  const signIn = useAuth((s) => s.signIn);

  const pick = async (accountId: string) => {
    setBusyId(accountId);
    try {
      const r = await googleSignIn(accountId);
      await signIn(r.token);
      setVisible(false);
      router.replace(r.isNewUser ? ASSESSMENT_INTRO : HOME);
    } catch (e) {
      toast.show({ kind: "danger", title: e instanceof ApiError ? e.message : "Belum bisa masuk dengan Google. Coba lagi ya." });
    } finally {
      setBusyId(null);
    }
  };

  return { open: () => setVisible(true), sheet: <GoogleAccountSheet visible={visible} busyId={busyId} onClose={() => setVisible(false)} onPick={pick} /> };
}

type SheetProps = { visible: boolean; busyId: string | null; onClose: () => void; onPick: (id: string) => void };

function GoogleAccountSheet({ visible, busyId, onClose, onPick }: SheetProps) {
  const insets = useSafeAreaInsets();
  const accounts = useQuery({ queryKey: ["google-accounts"], queryFn: fetchGoogleAccounts, enabled: visible });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Tutup" />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <View style={styles.handle} />
        <Text variant="title" color={colors.text.brandStrong} style={{ textAlign: "center" }}>
          Pilih akun Google
        </Text>
        <Text variant="bodyXs" color={colors.text.secondary} style={{ textAlign: "center" }}>
          Ini akun contoh untuk demo Haven. Tidak ada data Google yang dipakai.
        </Text>

        <View style={{ alignSelf: "stretch", gap: 8, marginTop: 8 }}>
          {accounts.isPending ? (
            <View style={styles.skeleton} accessibilityLabel="Memuat akun" />
          ) : accounts.isError ? (
            <View style={{ gap: 12, alignItems: "center" }}>
              <Text variant="bodyS" color={colors.text.secondary} style={{ textAlign: "center" }}>
                {accounts.error instanceof ApiError ? accounts.error.message : "Akun belum bisa dimuat."}
              </Text>
              <Button label="Coba lagi" variant="outline" size="sm" onPress={() => accounts.refetch()} />
            </View>
          ) : (
            accounts.data.accounts.map((a) => (
              <Pressable
                key={a.id}
                accessibilityRole="button"
                disabled={busyId !== null}
                onPress={() => onPick(a.id)}
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface.muted }, busyId && busyId !== a.id && { opacity: 0.5 }]}
              >
                <Avatar name={a.name} size={40} />
                <View style={{ flex: 1 }}>
                  <Text variant="label">{a.name}</Text>
                  <Text variant="bodyXs" color={colors.text.secondary}>
                    {a.email}
                  </Text>
                </View>
                {busyId === a.id ? (
                  <Text variant="bodyXs" color={colors.text.brand}>
                    Masuk…
                  </Text>
                ) : null}
              </Pressable>
            ))
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { backgroundColor: colors.surface.card, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, paddingHorizontal: 24, paddingTop: 12, alignItems: "center", gap: 8 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border.default, marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.surface.card, ...shadow.card },
  skeleton: { height: 64, borderRadius: radius.card, backgroundColor: colors.surface.muted },
});
