import { useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useEffect, useRef, useState, type ComponentRef } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";
import { createInvoice, invoiceKey, METHOD_LABEL, simulateGatewayPay, usePaymentStatus, type Invoice } from "@/api/bookings";
import { BottomSheet, Button, EmptyState, Header, Text, useToast } from "@/components";
import { errorMessage } from "@/features/auth/errors";
import { PanelCard, PriceBreakdown, SectionTitle } from "@/features/booking/BookingParts";
import { paymentLogos } from "@/lib/assets";
import { DEMO_MODE } from "@/lib/config";
import { rupiah } from "@/lib/format";
import { colors, fontFamily, layout } from "@/theme";

const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

// L83.2 Menunggu Pembayaran (Figma "L16 - QRIS"; S2 `selesaikanPembayaran`, S3 polling, BR-09, BR-12).
export default function PaymentPending() {
  const { ref } = useLocalSearchParams<{ bookingId: string; ref: string }>();
  const qc = useQueryClient();
  // The invoice (with its QR payload / VA number) comes from the "Bayar" call on L83.1.
  const inv = qc.getQueryData<Invoice>(invoiceKey(String(ref)));
  const router = useRouter();

  if (!inv) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface.sheet }}>
        <Header title="Pembayaran" onBack={() => router.back()} />
        <EmptyState mascot="confused" message="Tagihan ini tidak ditemukan. Pilih metode pembayaran lagi ya." actionLabel="Kembali ke Pembayaran" onAction={() => router.back()} />
      </View>
    );
  }
  return <Pending key={inv.invoiceRef} inv={inv} />;
}

function Pending({ inv }: { inv: Invoice }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const qrRef = useRef<ComponentRef<typeof View>>(null);
  const status = usePaymentStatus(inv.invoiceRef, true);

  // Countdowns use the server clock (handoff: never the device clock): keep the offset measured when the invoice arrived.
  const [offset] = useState(() => Date.parse(inv.serverNow) - Date.now());
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const remaining = Date.parse(inv.expiresAt) - (now + offset);

  const st = status.data?.status;
  const expired = st === "EXPIRED" || st === "CANCELLED" || (st !== "PAID" && remaining <= 0);
  const failed = st === "FAILED";
  const [simulating, setSimulating] = useState<"success" | "fail" | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (st === "PAID") {
      void qc.invalidateQueries({ queryKey: ["bookings"] });
      router.replace({ pathname: "/payment/[bookingId]/success", params: { bookingId: inv.bookingId, ref: inv.invoiceRef } });
    } else if (st === "FAILED") {
      toast.show({ kind: "danger", title: "Pembayaran gagal", body: "Belum ada dana yang terpotong. Coba bayar lagi atau ganti metode ya." });
    }
  }, [st, inv.bookingId, inv.invoiceRef, qc, router, toast]);

  // BR-09: an expired hold released the slot. Back to Pemesanan (two screens down) with fresh slots.
  const pickAgain = () => {
    void qc.invalidateQueries({ queryKey: ["slots"] });
    router.dismiss(2);
  };

  // After a failed attempt the invoice is closed; a new one with the same method keeps the person on this screen.
  const retry = async () => {
    setRetrying(true);
    try {
      const next = await createInvoice(inv.bookingId, inv.method);
      qc.setQueryData(invoiceKey(next.invoiceRef), next);
      router.setParams({ ref: next.invoiceRef });
    } catch (err) {
      toast.show({ kind: "danger", title: "Tagihan belum bisa dibuat", body: errorMessage(err) });
    } finally {
      setRetrying(false);
    }
  };

  const downloadQr = async () => {
    try {
      const uri = await captureRef(qrRef as Parameters<typeof captureRef>[0], { format: "png", quality: 1 });
      if (Platform.OS === "web" || !(await Sharing.isAvailableAsync())) throw new Error("unavailable");
      await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Simpan Kode QR" });
    } catch {
      toast.show({ kind: "info", title: "Kode QR belum bisa diunduh", body: "Coba ambil tangkapan layar dulu ya." });
    }
  };

  const copy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    toast.show({ kind: "success", title: "Tersalin!", durationMs: 1800 });
  };

  const simulate = async (outcome: "success" | "fail") => {
    setSimulating(outcome);
    try {
      await simulateGatewayPay(inv.invoiceRef, outcome);
      await status.refetch();
    } catch (err) {
      toast.show({ kind: "danger", title: "Simulasi gagal", body: errorMessage(err) });
    } finally {
      setSimulating(null);
    }
  };

  const countdown = (
    <Text variant="bodyM" color={colors.text.brandStrong} style={{ textAlign: "center", letterSpacing: -0.32, lineHeight: 23 }}>
      Selesaikan pembayaran dalam <Text variant="bodyM" color={colors.text.brandStrong} style={{ fontFamily: fontFamily.bodyBold }}>{mmss(remaining)}</Text>
    </Text>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.sheet }}>
      <Header title="Pembayaran" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: layout.pagePadding, paddingTop: 21, paddingBottom: 24, gap: 12 }}>
        <View style={{ gap: 12 }}>
          <SectionTitle>Rincian Pembayaran</SectionTitle>
          <PriceBreakdown pricing={inv.pricing} />
        </View>

        {inv.method === "QRIS" ? (
          <View style={{ alignItems: "center", gap: 8, marginTop: 4 }}>
            <Image source={paymentLogos.qris} style={{ width: 178.6, height: 53.6 }} contentFit="contain" accessibilityLabel="QRIS" />
            <View ref={qrRef} collapsable={false} style={styles.qr}>
              <QRCode value={inv.destination} size={285} backgroundColor={colors.surface.qr} quietZone={12} />
            </View>
            <View style={styles.rule} />
            {countdown}
          </View>
        ) : (
          <PanelCard style={{ padding: 16, gap: 12 }}>
            <Text variant="title" color={colors.text.section}>
              {METHOD_LABEL[inv.method]}
            </Text>
            {inv.method === "EWALLET" ? (
              <Text variant="bodyM" color={colors.text.secondary}>
                Bayar {rupiah(inv.amount)} lewat aplikasi e-wallet pilihanmu (DANA, gopay, OVO).
              </Text>
            ) : (
              <>
                <Text variant="bodyS" color={colors.text.secondary}>
                  {inv.method === "VIRTUAL_ACCOUNT" ? "Nomor Virtual Account" : "Transfer ke rekening"}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Text color={colors.text.brandStrong} selectable style={{ flex: 1, fontFamily: fontFamily.bodyBold, fontSize: 20, lineHeight: 26, letterSpacing: inv.method === "VIRTUAL_ACCOUNT" ? 1 : -0.2 }}>
                    {inv.method === "VIRTUAL_ACCOUNT" ? inv.destination.replace(/(\d{4})(?=\d)/g, "$1 ") : inv.destination}
                  </Text>
                  <Button label="Salin" variant="outline" size="xs" onPress={() => copy(inv.method === "VIRTUAL_ACCOUNT" ? inv.destination : inv.destination.replace(/^BCA\s+([\d-]+).*$/, "$1").replace(/-/g, ""))} />
                </View>
                <Text variant="bodyS" color={colors.text.secondary}>
                  Jumlah transfer: {rupiah(inv.amount)} (pastikan sama persis ya)
                </Text>
              </>
            )}
            <View style={styles.rule} />
            {countdown}
          </PanelCard>
        )}

        {failed ? (
          <PanelCard style={{ padding: 16, gap: 8 }}>
            <Text variant="bodyM" color={colors.text.error}>
              Pembayaran sebelumnya gagal dan belum ada dana yang terpotong.
            </Text>
            <Button label="Coba Bayar Lagi" variant="outline" loading={retrying} onPress={retry} />
          </PanelCard>
        ) : null}

        {DEMO_MODE && st === "PENDING" ? (
          <View style={styles.dev}>
            <Text variant="bodyXs" color={colors.text.secondary}>
              Simulasikan:
            </Text>
            <Pressable accessibilityRole="button" hitSlop={10} disabled={!!simulating} onPress={() => simulate("success")}>
              <Text variant="bodyXs" color={colors.text.brand} style={{ fontFamily: fontFamily.bodySemibold }}>
                {simulating === "success" ? "Memproses…" : "Berhasil"}
              </Text>
            </Pressable>
            <Text variant="bodyXs" color={colors.text.secondary}>
              |
            </Text>
            <Pressable accessibilityRole="button" hitSlop={10} disabled={!!simulating} onPress={() => simulate("fail")}>
              <Text variant="bodyXs" color={colors.text.error} style={{ fontFamily: fontFamily.bodySemibold }}>
                {simulating === "fail" ? "Memproses…" : "Gagal"}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 14 }]}>
        {inv.method === "QRIS" ? <Button label="Unduh Kode QR" onPress={downloadQr} /> : null}
        {inv.method === "EWALLET" ? <Button label="Buka Aplikasi" onPress={() => toast.show({ kind: "info", title: "Buka aplikasi e-wallet", body: "Di prototipe ini, pakai tombol simulasi untuk membayar ya." })} /> : null}
        <Button label="Ganti Metode Pembayaran" variant="outline" onPress={() => router.back()} />
      </View>

      <BottomSheet
        visible={expired}
        onClose={pickAgain}
        mascot="sad"
        title="Waktu pembayaran habis"
        body="Slot ini sudah dilepas. Pilih slot lagi untuk melanjutkan pemesanan ya."
        ctaLabel="Pilih Slot Lagi"
        onCta={pickAgain}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  qr: { width: 309, height: 309, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface.qr },
  rule: { height: 1, alignSelf: "stretch", marginHorizontal: 15, backgroundColor: colors.border.divider },
  footer: { paddingTop: 16, paddingHorizontal: layout.pagePadding, gap: 8, backgroundColor: colors.surface.sheet },
  dev: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 8, opacity: 0.8 },
});
