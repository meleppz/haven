import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { deleteAccount } from "@/api/me";
import { BottomSheet, Button, Header, Text, useToast } from "@/components";
import { useAuth } from "@/features/auth/auth-store";
import { errorMessage } from "@/features/auth/errors";
import { PanelCard } from "@/features/booking/BookingParts";
import { colors, fontFamily, layout } from "@/theme";

const POINTS = [
  { title: "Mode anonim", body: "Saat aktif, ahli hanya melihat nama samaranmu. Nama asli, email, nomor telepon, dan universitasmu tidak ditampilkan." },
  { title: "Sesi terenkripsi", body: "Ruang konsultasi ditandai terenkripsi end-to-end, dan riwayat chat hanya bisa dibuka olehmu dan ahli yang menanganimu." },
  { title: "Ulasan anonim", body: "Ulasan yang kamu tulis selalu tampil sebagai \"Anonymous\" di profil ahli." },
];

// "Privasi dan Keamanan" (handoff 6.17: stub). Short, general privacy notes plus the account deletion that the Figma
// modal "Hapus akun Haven?" (883:2833) belongs to.
export default function Privasi() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const remove = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      setConfirm(false);
      toast.show({ kind: "info", title: "Akunmu sudah dihapus", body: "Terima kasih sudah menggunakan Haven." });
      await useAuth.getState().signOut(); // the route guard takes the app back to Masuk
    } catch (err) {
      setConfirm(false);
      toast.show({ kind: "danger", title: "Akun belum bisa dihapus", body: errorMessage(err) });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.sheet }}>
      <Header title="Privasi dan Keamanan" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: layout.pagePadding, paddingTop: 22, paddingBottom: insets.bottom + 24, gap: 16 }}>
        <PanelCard style={{ padding: 16, gap: 14 }}>
          {POINTS.map((p) => (
            <View key={p.title} style={{ gap: 4 }}>
              <Text variant="bodyM" color={colors.text.brandStrong} style={{ fontFamily: fontFamily.bodySemibold }}>
                {p.title}
              </Text>
              <Text variant="bodyS" color={colors.text.secondary}>
                {p.body}
              </Text>
            </View>
          ))}
        </PanelCard>
        <View style={{ gap: 8, marginTop: 8 }}>
          <Text variant="bodyS" color={colors.text.secondary}>
            Menghapus akun akan menghapus profil, jadwal, riwayat konsultasi, dan chat-mu secara permanen.
          </Text>
          <Button label="Hapus Akun" variant="dangerOutline" onPress={() => setConfirm(true)} />
        </View>
      </ScrollView>

      {/* Figma modal 883:2833 */}
      <BottomSheet
        visible={confirm}
        onClose={() => setConfirm(false)}
        mascot="confused"
        title="Hapus akun Haven?"
        body="Akunmu akan terhapus permanen. Kamu tidak bisa memulihkan aksi ini."
        ctaLabel="Hapus Akun"
        loading={deleting}
        onCta={() => void remove()}
      />
    </View>
  );
}
