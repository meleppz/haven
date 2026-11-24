import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { reviewBooking, useBooking } from "@/api/bookings";
import { Button, SplashScene, Text, TextField, useToast } from "@/components";
import { errorMessage } from "@/features/auth/errors";
import { HOME } from "@/lib/routes";
import { colors } from "@/theme";

// L53.1 Sesi Selesai + Ulasan (Figma "Konsultasi selesai - Splash"; UT5.3, BR-17). Same motion as the other splashes.
// Bottom buttons (revision): "Kirim Ulasan" submits the review, "Lewati" skips it.
export default function SessionDone() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const id = String(bookingId);
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const booking = useBooking(id);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [needStars, setNeedStars] = useState(false);

  const alreadyReviewed = !!booking.data?.reviewed;

  // Revision: "Kirim Ulasan" sends the review (BR-17: a star rating is required), "Lewati" skips it. Both go to Beranda.
  const home = () => {
    void qc.invalidateQueries({ queryKey: ["bookings"] });
    router.dismissAll();
    router.navigate(HOME as Href);
  };

  const send = async () => {
    if (rating === 0) {
      setNeedStars(true);
      return;
    }
    setBusy(true);
    try {
      await reviewBooking(id, rating, text.trim() || undefined);
      void qc.invalidateQueries({ queryKey: ["reviews"] });
      void qc.invalidateQueries({ queryKey: ["expert"] });
      toast.show({ kind: "success", title: "Terima kasih atas ulasanmu!" });
      home();
    } catch (err) {
      toast.show({ kind: "danger", title: "Ulasan belum terkirim", body: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SplashScene title="Konsultasi Selesai!" body="Terima kasih sudah berani bercerita!" mascot="celebrate" mascotSize={200} scrollable>
      <Button
        label="Lihat Ringkasan Konsultasi"
        size="sm"
        onPress={() => router.push({ pathname: "/history/[bookingId]", params: { bookingId: id } })}
        style={{ alignSelf: "center", marginTop: -8 }}
      />

      {alreadyReviewed ? (
        <Text variant="bodyM" color={colors.text.brandStrong} style={{ textAlign: "center", marginVertical: 8 }}>
          Kamu sudah memberi ulasan untuk sesi ini.
        </Text>
      ) : (
        <>
          <View accessibilityRole="radiogroup" accessibilityLabel="Beri rating" style={{ flexDirection: "row", justifyContent: "center", gap: 2, marginTop: 8 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                accessibilityRole="radio"
                accessibilityLabel={`${n} bintang`}
                accessibilityState={{ selected: rating === n }}
                hitSlop={4}
                onPress={() => {
                  setRating(rating === n ? 0 : n);
                  setNeedStars(false);
                }}
                style={{ width: 40, height: 44, alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name={n <= rating ? "star" : "star-outline"} size={32} color={colors.rating.star} />
              </Pressable>
            ))}
          </View>
          {needStars ? (
            <Text variant="bodyS" color={colors.text.error} style={{ textAlign: "center", marginTop: -8 }}>
              Pilih bintang dulu ya, atau tekan Lewati.
            </Text>
          ) : null}
          <TextField multiline maxLength={500} placeholder="Tuliskan ulasan..." value={text} onChangeText={setText} style={{ minHeight: 118 }} />
        </>
      )}

      {alreadyReviewed ? (
        <Button label="Kembali ke Beranda" onPress={home} style={{ marginTop: 8 }} />
      ) : (
        <>
          <Button label="Kirim Ulasan" loading={busy} onPress={() => void send()} style={{ marginTop: 8 }} />
          <Button label="Lewati" variant="outline" disabled={busy} onPress={home} />
        </>
      )}
    </SplashScene>
  );
}
