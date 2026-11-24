import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import { Platform, Pressable } from "react-native";
import { fetchReceipt, METHOD_LABEL, type Receipt } from "@/api/bookings";
import { BottomSheet, Button, SplashScene, Text, useToast } from "@/components";
import { errorMessage } from "@/features/auth/errors";
import { MODE_FULL_LABEL } from "@/features/booking/BookingParts";
import { rupiah, shortDateTime } from "@/lib/format";
import { HOME } from "@/lib/routes";
import { colors, fontFamily, palette } from "@/theme";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

// FA-25 receipt as a small HTML page, printed to PDF on the device.
function receiptHtml(r: Receipt) {
  const row = (label: string, value: string, strong = false) =>
    `<tr><td>${esc(label)}</td><td class="v${strong ? " b" : ""}">${esc(value)}</td></tr>`;
  return `<!doctype html><html><head><meta charset="utf-8"/><style>
    body{font-family:-apple-system,Roboto,Helvetica,Arial,sans-serif;color:${palette.neutral[900]};padding:32px}
    h1{color:${palette.primary[900]};font-size:22px;margin:0 0 4px} .muted{color:${palette.neutral[800]};font-size:12px}
    table{width:100%;border-collapse:collapse;margin-top:16px;font-size:14px} td{padding:6px 0}
    .v{text-align:right} .b{font-weight:700;color:${palette.primary[900]};font-size:16px} hr{border:0;border-top:1px solid ${palette.neutral[400]};margin:8px 0}
  </style></head><body>
    <h1>Bukti Pembayaran Haven</h1>
    <div class="muted">${esc(r.issuer)}${r.demo ? " · Prototipe, bukan transaksi sungguhan" : ""}</div>
    <table>
      ${row("No. Bukti", r.receiptNo)}
      ${row("Dibayar", shortDateTime(r.paidAt))}
      ${row("Metode", METHOD_LABEL[r.method])}
      ${row("Nama", r.customerName)}
      ${row("Ahli", r.expert.name)}
      ${row("Jadwal", `${r.slot.date} · ${r.slot.label} WIB`)}
      ${row("Mode", MODE_FULL_LABEL[r.mode])}
    </table><hr/><table>
      ${row("Biaya Konsultasi", rupiah(r.pricing.tarif))}
      ${row("Biaya Administrasi", rupiah(r.pricing.adminFee))}
      ${r.pricing.discount > 0 ? row("Diskon Mahasiswa 20%", `- ${rupiah(r.pricing.discount)}`) : ""}
    </table><hr/><table>${row("Total", rupiah(r.pricing.total), true)}</table>
  </body></html>`;
}

// L83.3 Pembayaran Berhasil (Figma "Pembayaran berhasil - Splash"; same motion as the other splash screens).
export default function PaymentSuccess() {
  const { ref } = useLocalSearchParams<{ bookingId: string; ref: string }>();
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  // Close the whole booking flow (Pemesanan, Pembayaran, Menunggu) so "back" cannot return to it, then open the tab.
  const goTo = (href: Href) => {
    router.dismissAll();
    router.navigate(href);
  };

  const download = async () => {
    setBusy(true);
    try {
      const html = receiptHtml(await fetchReceipt(String(ref)));
      if (Platform.OS === "web") {
        await Print.printAsync({ html }); // the browser's print dialog can save as PDF
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: "Bukti Pembayaran" });
      }
      setDownloaded(true);
    } catch (err) {
      toast.show({ kind: "danger", title: "Bukti belum bisa diunduh", body: errorMessage(err, "Coba lagi sebentar ya.") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SplashScene title="Pembayaran Berhasil!" body={"Terima kasih telah menyelesaikan transaksi!\nJadwal konsultasi telah tercatat."} mascot="celebrate">
      <Button label="Unduh Bukti Pembayaran" loading={busy} onPress={download} />
      <Button label="Kembali ke Beranda" variant="outline" onPress={() => goTo(HOME)} />
      <Pressable accessibilityRole="link" hitSlop={10} onPress={() => goTo("/sessions")} style={{ alignSelf: "center", paddingVertical: 8 }}>
        <Text variant="bodyM" color={colors.text.brand} style={{ fontFamily: fontFamily.bodySemibold, textDecorationLine: "underline" }}>
          Lihat Jadwal
        </Text>
      </Pressable>
      {/* Figma modal 931:1964 */}
      <BottomSheet
        visible={downloaded}
        onClose={() => setDownloaded(false)}
        mascot="happySmall"
        title="Bukti pembayaran diunduh!"
        body="Silahkan cek folder unduhan pada perangkat"
        ctaLabel="Kembali ke Halaman Utama"
        onCta={() => {
          setDownloaded(false);
          goTo(HOME);
        }}
      />
    </SplashScene>
  );
}
