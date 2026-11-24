import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState, type ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Booking } from "@/api/bookings";
import { devExpertEnd, devSilenceExpert, useUpcomingBookings } from "@/api/sessions";
import { BottomSheet, Button, EmptyState, Header, Text, useToast } from "@/components";
import { useAuth } from "@/features/auth/auth-store";
import { errorMessage } from "@/features/auth/errors";
import { PanelCard } from "@/features/booking/BookingParts";
import { api } from "@/lib/api";
import { DEMO_MODE } from "@/lib/config";
import { shortDateTime } from "@/lib/format";
import { colors, fontFamily, layout } from "@/theme";

type ClientProfile = { anonymous: boolean; displayName: string; age: number | null; occupation: string | null; concerns: string[]; description: string | null; name?: string; email?: string | null };

// Dev menu (handoff §10; demo mode only). Opened by long-pressing the Profil avatar. Every action calls a /dev endpoint,
// so nothing here changes business rules; it only moves the simulation along.
// Paying or failing a pending invoice lives on the Menunggu Pembayaran screen ("Simulasikan: Berhasil | Gagal").
export default function DevMenu() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const upcoming = useUpcomingBookings();
  const [serverNow, setServerNow] = useState<string | null>(null);
  const [silenced, setSilenced] = useState<Record<string, boolean>>({});
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const run = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      toast.show({ kind: "success", title: label, durationMs: 1800 });
      void qc.invalidateQueries();
    } catch (err) {
      toast.show({ kind: "danger", title: `${label} gagal`, body: errorMessage(err) });
    }
  };

  const clock = (body: object, label: string) =>
    run(label, async () => {
      const r = await api<{ serverNow: string }>("/dev/clock", { body });
      setServerNow(r.serverNow);
    });

  if (!DEMO_MODE) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface.sheet }}>
        <Header title="Menu Demo" onBack={() => router.back()} />
        <EmptyState message="Menu demo hanya tersedia saat EXPO_PUBLIC_DEMO_MODE=1." />
      </View>
    );
  }

  const live = (upcoming.data?.items ?? []).filter((b) => b.canJoin || b.status === "IN_SESSION");

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.sheet }}>
      <Header title="Menu Demo" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: layout.pagePadding, paddingTop: 20, paddingBottom: insets.bottom + 32, gap: 16 }}>
        <Group title="Jam simulasi" note={serverNow ? `Waktu server: ${shortDateTime(serverNow)}` : "Majukan jam untuk membuka jendela sesi atau menguji kedaluwarsa."}>
          <Row>
            <Button size="sm" variant="outline" label="+5 menit" onPress={() => void clock({ advanceMinutes: 5 }, "Jam maju 5 menit")} />
            <Button size="sm" variant="outline" label="+30 menit" onPress={() => void clock({ advanceMinutes: 30 }, "Jam maju 30 menit")} />
            <Button size="sm" variant="outline" label="+1 hari" onPress={() => void clock({ advanceMinutes: 24 * 60 }, "Jam maju 1 hari")} />
            <Button size="sm" variant="outline" label="Reset jam" onPress={() => void clock({ reset: true }, "Jam kembali normal")} />
          </Row>
        </Group>

        <Group title="Sesi & akun">
          <Button
            label="Buat sesi mulai 10 menit lagi"
            onPress={() =>
              void run("Sesi dibuat", async () => {
                await api("/dev/sessions/start-soon", { body: {} });
                router.navigate("/sessions");
              })
            }
          />
          <Button label="Verifikasi mahasiswa instan" variant="outline" onPress={() => void run("Status mahasiswa terverifikasi", () => api("/dev/me/verify-student", { body: {} }))} />
        </Group>

        <Group title="Sesi yang bisa dimasuki" note="Kendalikan ahli simulasi untuk sesi di jendela masuk.">
          {live.length === 0 ? (
            <Text variant="bodyS" color={colors.text.secondary}>
              Belum ada. Buat sesi di atas lalu masuk dari Ruang Konsultasi.
            </Text>
          ) : (
            live.map((b) => (
              <SessionControls
                key={b.id}
                booking={b}
                silenced={!!silenced[b.id]}
                onSilence={(v) =>
                  void run(v ? "Ahli dibisukan" : "Ahli aktif lagi", async () => {
                    await devSilenceExpert(b.id, v);
                    setSilenced((s) => ({ ...s, [b.id]: v }));
                  })
                }
                onEnd={() => void run("Sesi diakhiri oleh ahli", () => devExpertEnd(b.id))}
                onProfile={() => void run("Profil sisi ahli dimuat", async () => setProfile(await api<ClientProfile>(`/sessions/${b.id}/client-profile`)))}
              />
            ))
          )}
        </Group>

        <Group title="Lainnya">
          <Button label="Galeri komponen" variant="outline" onPress={() => router.push("/dev/components")} />
          <Button label="Reset & isi ulang data demo" variant="dangerOutline" onPress={() => setConfirmReset(true)} />
        </Group>
      </ScrollView>

      <BottomSheet
        visible={!!profile}
        onClose={() => setProfile(null)}
        title={profile?.anonymous ? "Yang dilihat ahli (anonim)" : "Yang dilihat ahli"}
        body={
          profile
            ? [
                `Nama: ${profile.displayName}`,
                `Usia: ${profile.age ?? "-"} · ${profile.occupation ?? "-"}`,
                `Topik: ${profile.concerns.join(", ") || "-"}`,
                profile.anonymous ? "Nama asli, email, telepon, universitas: disembunyikan (BR-15)" : `Email: ${profile.email ?? "-"}`,
              ].join("\n")
            : undefined
        }
        ctaLabel="Tutup"
        onCta={() => setProfile(null)}
      />
      <BottomSheet
        visible={confirmReset}
        onClose={() => setConfirmReset(false)}
        mascot="confused"
        title="Reset data demo?"
        body="Semua data kembali ke data awal dan kamu perlu masuk lagi (choso@haven.id / haven123)."
        ctaLabel="Reset Data"
        danger
        onCta={() =>
          void run("Data demo direset", async () => {
            setConfirmReset(false);
            await api("/dev/reset", { body: {} });
            await useAuth.getState().signOut();
          })
        }
      />
    </View>
  );
}

function SessionControls({ booking: b, silenced, onSilence, onEnd, onProfile }: { booking: Booking; silenced: boolean; onSilence: (v: boolean) => void; onEnd: () => void; onProfile: () => void }) {
  return (
    <PanelCard style={{ padding: 12, gap: 8 }}>
      <Text variant="bodyM" color={colors.text.brandStrong} style={{ fontFamily: fontFamily.bodySemibold }}>
        {b.expert.name} · {b.slot.label}
      </Text>
      <Text variant="bodyXs" color={colors.text.secondary}>
        {b.status === "IN_SESSION" ? "Sedang berlangsung" : "Belum dimasuki"} · {b.mode}
      </Text>
      <Row>
        <Button size="sm" variant="outline" label={silenced ? "Aktifkan ahli" : "Bisukan ahli"} onPress={() => onSilence(!silenced)} />
        <Button size="sm" variant="outline" label="Profil sisi ahli" onPress={onProfile} />
        {b.status === "IN_SESSION" ? <Button size="sm" variant="dangerOutline" label="Ahli akhiri sesi" onPress={onEnd} /> : null}
      </Row>
    </PanelCard>
  );
}

const Group = ({ title, note, children }: { title: string; note?: string; children: ReactNode }) => (
  <View style={{ gap: 8 }}>
    <Text variant="title" color={colors.text.section}>
      {title}
    </Text>
    {note ? (
      <Text variant="bodyXs" color={colors.text.secondary}>
        {note}
      </Text>
    ) : null}
    {children}
  </View>
);

const Row = ({ children }: { children: ReactNode }) => <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{children}</View>;
