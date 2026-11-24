import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cancelBooking, createInvoice, invoiceKey, METHOD_LABEL, usePaymentSummary, type PayMethod } from "@/api/bookings";
import { BottomSheet, Button, ErrorState, Header, Skeleton, Text, useToast } from "@/components";
import { errorMessage } from "@/features/auth/errors";
import { MethodCard, OrderCard, PriceBreakdown, SectionTitle } from "@/features/booking/BookingParts";
import { ApiError } from "@/lib/api";
import { rupiah } from "@/lib/format";
import { colors, fontFamily, layout } from "@/theme";

// L83.1 Pembayaran (Figma "L15"; UT8.3, S2 `siapkanPembayaran` + `buatTagihanKonsultasi`, FA-16..20, BR-10).
export default function Payment() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const summary = usePaymentSummary(String(bookingId));
  const [method, setMethod] = useState<PayMethod | null>(null);
  const [paying, setPaying] = useState(false);

  const s = summary.data;
  const expired = summary.error instanceof ApiError && summary.error.code === "BOOKING_EXPIRED";

  // Backing out releases the 15-minute hold right away so the slot is free again (cancelling an unpaid booking is free).
  const back = () => {
    if (s?.booking.status === "AWAITING_PAYMENT") {
      void cancelBooking(s.booking.id)
        .catch(() => undefined)
        .finally(() => void qc.invalidateQueries({ queryKey: ["slots", s.booking.expert.id] }));
    }
    router.back();
  };

  // BR-09: the expired hold released the slot; back to Pemesanan with fresh slots.
  const reselect = () => {
    void qc.invalidateQueries({ queryKey: ["slots"] });
    router.back();
  };

  const pay = async () => {
    if (!method || !s) return;
    setPaying(true);
    try {
      const inv = await createInvoice(s.booking.id, method);
      qc.setQueryData(invoiceKey(inv.invoiceRef), inv);
      router.push({ pathname: "/payment/[bookingId]/pending", params: { bookingId: s.booking.id, ref: inv.invoiceRef } });
    } catch (err) {
      if (err instanceof ApiError && err.code === "BOOKING_EXPIRED") void summary.refetch();
      else toast.show({ kind: "danger", title: "Tagihan belum bisa dibuat", body: errorMessage(err) });
    } finally {
      setPaying(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.sheet }}>
      <Header title="Pembayaran" onBack={back} />
      <ScrollView contentContainerStyle={{ padding: layout.pagePadding, paddingTop: 21, paddingBottom: 32, gap: 16 }}>
        {summary.isPending ? (
          <View style={{ gap: 16 }}>
            <Skeleton width={160} height={24} />
            <Skeleton height={104} />
            <Skeleton width={200} height={24} />
            <Skeleton height={164} />
            <Skeleton height={300} />
          </View>
        ) : summary.isError || !s ? (
          expired ? null : <ErrorState message={errorMessage(summary.error, "Rincian pembayaran belum bisa dimuat.")} onRetry={() => summary.refetch()} />
        ) : (
          <>
            <View style={{ gap: 12 }}>
              <SectionTitle>Detail Pesanan</SectionTitle>
              <OrderCard expert={s.booking.expert} mode={s.booking.mode} anonymous={s.booking.anonymous} />
            </View>
            <View style={{ gap: 12 }}>
              <SectionTitle>Rincian Pembayaran</SectionTitle>
              <PriceBreakdown pricing={s.pricing} />
            </View>
            <View style={{ gap: 12 }}>
              <SectionTitle>Metode Pembayaran</SectionTitle>
              <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
                {s.methods.map((m) => (
                  <MethodCard key={m} method={m} label={METHOD_LABEL[m]} selected={method === m} onPress={() => setMethod(m)} />
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {s ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 10 }]}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text color={colors.text.brandStrong} style={styles.total}>
              Total <Text color={colors.text.brandStrong} style={[styles.total, { fontFamily: fontFamily.bodyBold }]}>{rupiah(s.pricing.total)}</Text>
            </Text>
            {s.pricing.discount > 0 ? (
              <Text variant="bodyM" color={colors.text.brandStrong} style={{ textAlign: "right", lineHeight: 18, letterSpacing: -0.32 }}>
                Hemat {rupiah(s.pricing.discount)}
              </Text>
            ) : null}
          </View>
          <Button label="Bayar" disabled={!method} loading={paying} onPress={pay} style={{ width: 107, minHeight: 48 }} />
        </View>
      ) : null}

      <BottomSheet
        visible={expired}
        onClose={reselect}
        mascot="sad"
        title="Waktu pembayaran habis"
        body="Slot ini sudah dilepas. Pilih slot lagi untuk melanjutkan pemesanan ya."
        ctaLabel="Pilih Slot Lagi"
        onCta={reselect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 16, paddingHorizontal: 17.5, backgroundColor: colors.surface.payBar },
  total: { fontFamily: fontFamily.body, fontSize: 20, lineHeight: 24, letterSpacing: -0.4, textAlign: "right" },
});
