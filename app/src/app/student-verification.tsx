import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";
import { meKey, submitVerification, useMe, useVerification, verificationKey, type ProofFile } from "@/api/me";
import { BottomSheet, Button, Checkbox, ErrorState, Header, InlineLink, KeyboardScroll, Skeleton, Text, TextField, useToast } from "@/components";
import { errorMessage } from "@/features/auth/errors";
import { PanelCard, StudentBanner } from "@/features/booking/BookingParts";
import { ApiError } from "@/lib/api";
import { uiIcons } from "@/lib/ui-icons";
import { colors, fontFamily, layout, radius, shadow } from "@/theme";

const MAX_BYTES = 10 * 1024 * 1024; // BR-11
const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const longDate = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + 7 * 3_600_000); // WIB
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

type Errors = { name?: string; university?: string; proof?: string; acceptTerms?: string };

// L31 Verifikasi Status Mahasiswa (Figma "L14"; UT3.1, FA-17, BR-11). Verification happens once.
export default function StudentVerification() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const me = useMe();
  const verification = useVerification();

  const [nameChoice, setNameChoice] = useState<string | null>(null);
  const [university, setUniversity] = useState("");
  const [proof, setProof] = useState<ProofFile | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false); // we sent the form in this visit: show the success sheet once approved
  const [sheetClosed, setSheetClosed] = useState(false);

  const name = nameChoice ?? me.data?.name ?? "";
  const status = verification.data?.status;
  const fromBooking = from === "booking";
  const showSuccess = submitted && status === "VERIFIED" && !sheetClosed;

  const goBack = () => {
    void qc.invalidateQueries({ queryKey: meKey });
    router.back();
  };

  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ["image/jpeg", "image/png", "application/pdf"], copyToCacheDirectory: true });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    if (a.size !== undefined && a.size > MAX_BYTES) {
      setErrors((x) => ({ ...x, proof: "Ukuran dokumen maksimal 10 MB ya" }));
      return;
    }
    setProof({ uri: a.uri, name: a.name, mimeType: a.mimeType ?? "application/octet-stream", file: a.file });
    setErrors((x) => ({ ...x, proof: undefined }));
  };

  const submit = async () => {
    const next: Errors = {};
    if (!name.trim()) next.name = "Nama wajib diisi";
    if (!university.trim()) next.university = "Asal universitas wajib diisi";
    if (!proof) next.proof = "Unggah 1 dokumen ya (KTM, Transkrip, atau Jadwal Kuliah)";
    if (!accepted) next.acceptTerms = "Centang persetujuan S&K dulu ya";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      const v = await submitVerification({ name: name.trim(), university: university.trim(), acceptTerms: accepted, proof });
      qc.setQueryData(verificationKey, v); // PENDING: useVerification polls until the simulated approval lands
      setSubmitted(true);
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      else if (err instanceof ApiError && err.code === "ALREADY_VERIFIED") void verification.refetch();
      else toast.show({ kind: "danger", title: "Verifikasi belum terkirim", body: errorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  };

  const terms = () => toast.show({ kind: "info", title: "Syarat dan Ketentuan Haven", body: "Halaman S&K lengkap segera hadir." });

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.sheet }}>
      <Header title="Verifikasi Status Mahasiswa" onBack={goBack} />
      <KeyboardScroll contentContainerStyle={{ padding: layout.pagePadding, paddingTop: 23, paddingBottom: insets.bottom + 24, gap: 12 }}>
          <View style={[{ borderRadius: radius.card }, shadow.card]}>
            <StudentBanner title={"Aktifkan diskon khusus\nMahasiswa & dapatkan\npotongan 20%!"} />
          </View>

          {verification.isPending || me.isPending ? (
            <View style={{ gap: 16 }}>
              <Skeleton height={96} />
              <Skeleton height={71} />
              <Skeleton height={71} />
            </View>
          ) : verification.isError ? (
            <ErrorState message={errorMessage(verification.error, "Status verifikasi belum bisa dimuat.")} onRetry={() => verification.refetch()} />
          ) : status === "VERIFIED" && !submitted ? (
            <VerifiedState university={verification.data.university} verifiedAt={verification.data.verifiedAt} onBack={goBack} fromBooking={fromBooking} />
          ) : status === "PENDING" || (submitted && status === "VERIFIED") ? (
            <PanelCard style={{ padding: 16, gap: 8, alignItems: "center" }}>
              <Text variant="title" color={colors.text.section} style={{ textAlign: "center" }}>
                Dokumenmu sedang dicek
              </Text>
              <Text variant="bodyM" color={colors.text.secondary} style={{ textAlign: "center" }}>
                Biasanya hanya butuh beberapa detik. Kamu bisa menunggu di sini ya.
              </Text>
            </PanelCard>
          ) : (
            <>
              <Text variant="bodyM" color={colors.text.secondary} style={{ letterSpacing: -0.32 }}>
                Untuk proses verifikasi diskon mahasiswa, diperlukan bukti sebagai bagian dari Universitas (KTM, Transkrip, atau Jadwal Kuliah). Untuk perihal keamanan, baca{" "}
                <InlineLink color={colors.text.brand} onPress={terms}>
                  Syarat dan Ketentuan Haven.
                </InlineLink>
              </Text>

              <TextField labelTone="section" label="Nama" placeholder="Nama" value={name} onChangeText={(v) => { setNameChoice(v); setErrors((x) => ({ ...x, name: undefined })); }} error={errors.name} autoComplete="name" />
              <TextField labelTone="section" label="Asal Universitas" placeholder="Asal Universitas" value={university} onChangeText={(v) => { setUniversity(v); setErrors((x) => ({ ...x, university: undefined })); }} error={errors.university} />

              <View style={{ gap: 4 }}>
                <Text variant="bodyM" color={colors.text.section} style={{ fontFamily: fontFamily.bodyMedium, letterSpacing: -0.32 }}>
                  Bukti Pengguna Bagian dari Universitas
                </Text>
                <View style={{ gap: 8 }}>
                  <Text variant="bodyS" color={colors.text.label} style={{ fontFamily: fontFamily.bodyAlt }}>
                    KTM, Transkrip, atau Jadwal Kuliah
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    {/* Revision: once a document is attached the field turns green with a check, and the button offers "Ganti Dokumen". */}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={proof ? `Dokumen terunggah: ${proof.name}. Ganti dokumen` : "Unggah Dokumen"}
                      onPress={pick}
                      style={({ pressed }) => [styles.fileBtn, proof && styles.fileBtnDone, pressed && { opacity: 0.8 }]}
                    >
                      {proof ? <Ionicons name="checkmark-circle" size={20} color={colors.text.success} /> : <SvgXml xml={uiIcons.folderAdd} width={19} height={19} />}
                      <Text color={proof ? colors.text.success : colors.text.accent} style={{ fontFamily: fontFamily.bodyAlt, fontSize: 16, lineHeight: 20 }}>
                        {proof ? "Ganti Dokumen" : "Unggah Dokumen"}
                      </Text>
                    </Pressable>
                    {proof ? (
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text variant="bodyS" color={colors.text.success} style={{ fontFamily: fontFamily.bodySemibold, lineHeight: 17 }} numberOfLines={1}>
                          Dokumen terunggah
                        </Text>
                        <Text variant="bodyS" color={colors.text.success} style={{ fontFamily: fontFamily.bodyAlt, lineHeight: 17 }} numberOfLines={1}>
                          {proof.name}
                        </Text>
                      </View>
                    ) : (
                      <Text variant="bodyS" color={colors.text.label} style={{ flex: 1, fontFamily: fontFamily.bodyAlt, lineHeight: 17 }} numberOfLines={2}>
                        Unggah 1 dokumen, maksimal 10 MB.
                      </Text>
                    )}
                  </View>
                  {errors.proof ? (
                    <Text variant="bodyXs" color={colors.text.error}>
                      * {errors.proof}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={{ gap: 4 }}>
                <Checkbox label="Dengan ini saya menyetujui " selected={accepted} onPress={() => { setAccepted(!accepted); setErrors((x) => ({ ...x, acceptTerms: undefined })); }}>
                  <InlineLink onPress={terms}>S&K Haven.</InlineLink>
                </Checkbox>
                {errors.acceptTerms ? (
                  <Text variant="bodyXs" color={colors.text.error}>
                    * {errors.acceptTerms}
                  </Text>
                ) : null}
              </View>

              <Button label="Verifikasi Status" loading={submitting} onPress={submit} />
            </>
          )}
        </KeyboardScroll>

      <BottomSheet
        visible={showSuccess}
        onClose={() => setSheetClosed(true)}
        mascot="happySmall"
        title="Status mahasiswamu sudah terverifikasi!"
        body="Kamu bisa menikmati promo mahasiswa sekarang."
        ctaLabel={fromBooking ? "Kembali ke Halaman Pemesanan" : "Kembali"}
        onCta={() => {
          setSheetClosed(true);
          goBack();
        }}
      />
    </View>
  );
}

function VerifiedState({ university, verifiedAt, onBack, fromBooking }: { university: string | null; verifiedAt: string | null; onBack: () => void; fromBooking: boolean }) {
  return (
    <PanelCard style={{ padding: 16, gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <SvgXml xml={uiIcons.verifyBold} width={24} height={24} />
        <Text variant="title" color={colors.text.section}>
          Status mahasiswamu sudah terverifikasi
        </Text>
      </View>
      {university ? (
        <Text variant="bodyM" color={colors.text.secondary}>
          Universitas: {university}
        </Text>
      ) : null}
      {verifiedAt ? (
        <Text variant="bodyM" color={colors.text.secondary}>
          Terverifikasi sejak {longDate(verifiedAt)}
        </Text>
      ) : null}
      <Text variant="bodyS" color={colors.text.secondary}>
        Verifikasi cukup dilakukan sekali. Promo mahasiswa bisa kamu aktifkan di halaman pemesanan.
      </Text>
      <Button label={fromBooking ? "Kembali ke Halaman Pemesanan" : "Kembali"} variant="outline" onPress={onBack} />
    </PanelCard>
  );
}

const styles = StyleSheet.create({
  fileBtn: {
    width: 194,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.border.field,
    backgroundColor: colors.surface.card,
    ...shadow.card,
  },
  fileBtnDone: { borderColor: colors.border.success, borderWidth: 1.5 },
});
