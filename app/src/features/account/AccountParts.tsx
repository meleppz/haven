import { Fragment, useState, type ReactNode } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { Text, Toggle } from "@/components";
import { uiIcons } from "@/lib/ui-icons";
import { colors, fontFamily, layout, radius, shadow } from "@/theme";

// Pieces of L84 Profil, L71 Pengaturan and their sub-pages (Figma "Profil", "L34 - Pengaturan").

/** Handoff 6.16 FAQ. The privacy answer stays general (prototype). */
export const FAQ: { q: string; a: string }[] = [
  {
    q: "Apakah privasi saya aman dengan Haven?",
    a: "Kamu bisa berkonsultasi dalam mode anonim, sehingga ahli hanya melihat nama samaranmu. Riwayat dan catatan konsultasimu hanya bisa dilihat olehmu dan ahli yang menanganimu, dan sesi konsultasi ditandai terenkripsi end-to-end.",
  },
  {
    q: "Apakah saya dapat membatalkan atau mengubah jadwal konsultasi?",
    a: "Kamu dapat membatalkan atau mengubah jadwal konsultasi paling tidak 2x24 jam sebelum jadwal seharusnya. Jika kurang dari 2x24 jam, jadwal tidak bisa dipindahkan dan pembatalan konsultasi akan mengalami denda.",
  },
  {
    q: "Apa metode pembayaran yang diterima?",
    a: "Kamu bisa membayar lewat QRIS, Transfer Bank (BCA), Virtual Account, atau E-Wallet (DANA, GoPay, OVO).",
  },
];

/** Figma FAQ: Qanelas SemiBold 20 title, full-width rules, rows with a circled chevron; an open answer has a left rule. */
export function FaqList() {
  const [open, setOpen] = useState<number | null>(1); // the hi-fi shows the second question open
  return (
    <View style={{ gap: 12 }}>
      <Text color={colors.text.section} style={styles.faqTitle}>
        Pertanyaan yang Sering Ditanyakan (FAQ)
      </Text>
      <View style={styles.rule} />
      {FAQ.map((item, i) => {
        const on = open === i;
        return (
          <Fragment key={item.q}>
            <View style={{ gap: 4 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: on }}
                onPress={() => setOpen(on ? null : i)}
                style={styles.faqRow}
              >
                <Text color={colors.text.brandStrong} style={styles.faqQ}>
                  {item.q}
                </Text>
                <View style={{ transform: [{ rotate: on ? "180deg" : "0deg" }] }}>
                  <SvgXml xml={uiIcons.faqArrow} width={22.7} height={22.7} />
                </View>
              </Pressable>
              {on ? (
                <View style={styles.answer}>
                  <Text color={colors.text.secondary} style={styles.faqA}>
                    {item.a}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={styles.rule} />
          </Fragment>
        );
      })}
    </View>
  );
}

/** Profil stat tile: translucent secondary-200, Qanelas SemiBold 20 value, 12px two-line label. */
export function ProfileStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat} accessibilityLabel={`${value} ${label.replace("\n", " ")}`}>
      <Text color={colors.text.section} style={styles.statValue}>
        {value}
      </Text>
      <Text color={colors.text.secondary} style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
}

export type SettingRow =
  | { kind: "link"; label: string; onPress: () => void }
  | { kind: "toggle"; label: string; value: boolean; onChange: (v: boolean) => void; caption?: string };

/** Pengaturan card: white, radius 12, rows separated by neutral-400 rules (no chevrons, as in Figma). */
export function SettingsCard({ rows }: { rows: SettingRow[] }) {
  return (
    <View style={styles.card}>
      {rows.map((r, i) => (
        <Fragment key={r.label}>
          {i > 0 ? <View style={styles.rowRule} /> : null}
          {r.kind === "link" ? (
            <Pressable accessibilityRole="button" onPress={r.onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
              <Text variant="bodyM" color={colors.text.primary} style={styles.rowText}>
                {r.label}
              </Text>
            </Pressable>
          ) : (
            <View style={{ gap: 12 }}>
              <View style={styles.row}>
                <Text variant="bodyM" color={colors.text.primary} style={styles.rowText}>
                  {r.label}
                </Text>
                <Toggle value={r.value} onValueChange={r.onChange} accessibilityLabel={r.label} />
              </View>
              {r.caption ? (
                <Text color={colors.text.caption} style={{ fontSize: 12, lineHeight: 14, letterSpacing: -0.24, marginTop: -6 }}>
                  {r.caption}
                </Text>
              ) : null}
            </View>
          )}
        </Fragment>
      ))}
    </View>
  );
}

/** Section title above a settings card ("Profil", "Aplikasi", "Privasi dan Keamanan"). */
export const SettingsSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <View style={{ gap: 12 }}>
    <Text color={colors.text.brand} style={styles.sectionTitle}>
      {title}
    </Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  faqTitle: { fontFamily: fontFamily.headingSemibold, fontSize: 20, lineHeight: 23, letterSpacing: -0.4 },
  rule: { height: 1, marginHorizontal: -5, backgroundColor: colors.border.divider },
  faqRow: { flexDirection: "row", alignItems: "center", gap: 16, minHeight: layout.minTouch, paddingHorizontal: 8 },
  faqQ: { flex: 1, fontFamily: fontFamily.bodyMedium, fontSize: 16, lineHeight: 22.7, letterSpacing: -0.32 },
  answer: { marginLeft: 6, marginBottom: 8, paddingLeft: 16, paddingVertical: 4, borderLeftWidth: 2, borderLeftColor: colors.border.faqAnswer },
  faqA: { fontSize: 12, lineHeight: 22.7, letterSpacing: -0.24, fontFamily: fontFamily.body },
  stat: { flex: 1, alignItems: "center", gap: 4, paddingHorizontal: 2, paddingVertical: 8, borderRadius: radius.card, backgroundColor: colors.surface.statTile, ...shadow.card },
  statValue: { fontFamily: fontFamily.headingSemibold, fontSize: 20, lineHeight: 24, letterSpacing: -0.4, textAlign: "center" },
  statLabel: { fontSize: 12, lineHeight: 14, letterSpacing: -0.24, textAlign: "center", fontFamily: fontFamily.body },
  card: { backgroundColor: colors.surface.card, borderRadius: radius.card, paddingHorizontal: 16, paddingVertical: 4, ...shadow.card },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: layout.minTouch },
  rowText: { flex: 1, letterSpacing: -0.32 },
  rowRule: { height: 1, backgroundColor: colors.border.divider },
  sectionTitle: { fontFamily: fontFamily.headingSemibold, fontSize: 20, lineHeight: 25, letterSpacing: -0.4 },
});

/**
 * "Butuh bantuan darurat?" (handoff §13 recommended addition, approved by the user after Phase 6).
 * Sources checked Nov 2026: Kemenkes Healing119.id (call 119 ext. 8, or WhatsApp from healing119.id; psychological
 * first aid, no registration) and 119 for medical emergencies. Haven itself is not an emergency service.
 */
export function CrisisCard() {
  return (
    <View style={crisisStyles.crisis} accessibilityRole="summary">
      <Text color={colors.text.brandStrong} style={crisisStyles.crisisTitle}>
        Butuh bantuan darurat?
      </Text>
      <Text variant="bodyS" color={colors.text.primary}>
        Kalau kamu sedang merasa tidak aman atau berpikir untuk menyakiti diri sendiri, kamu tidak sendirian. Haven bukan layanan darurat, jadi
        hubungi layanan di bawah ini sekarang ya.
      </Text>
      <CrisisLine
        title="Healing119.id (Kemenkes)"
        detail="Teman bicara untuk pertolongan pertama psikologis. Gratis, tanpa daftar."
        actions={[
          { label: "Telepon 119 ext. 8", url: "tel:119,8" },
          { label: "Chat lewat healing119.id", url: "https://healing119.id" },
        ]}
      />
      <CrisisLine title="Gawat darurat medis" detail="Kalau ada bahaya langsung terhadap nyawa." actions={[{ label: "Telepon 119", url: "tel:119" }]} />
    </View>
  );
}

function CrisisLine({ title, detail, actions }: { title: string; detail: string; actions: { label: string; url: string }[] }) {
  return (
    <View style={{ gap: 6 }}>
      <Text variant="bodyM" color={colors.text.brandStrong} style={{ fontFamily: fontFamily.bodySemibold }}>
        {title}
      </Text>
      <Text variant="bodyS" color={colors.text.secondary}>
        {detail}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {actions.map((a) => (
          <Pressable
            key={a.url}
            accessibilityRole="link"
            onPress={() => void Linking.openURL(a.url)}
            style={({ pressed }) => [crisisStyles.crisisBtn, pressed && { opacity: 0.8 }]}
          >
            <Text variant="label" color={colors.text.onAction}>
              {a.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const crisisStyles = StyleSheet.create({
  crisis: { gap: 12, padding: 16, borderRadius: radius.card, backgroundColor: colors.surface.crisis, borderWidth: 1, borderColor: colors.border.crisis },
  crisisTitle: { fontFamily: fontFamily.bodySemibold, fontSize: 18, lineHeight: 24 },
  crisisBtn: { minHeight: layout.minTouch, justifyContent: "center", paddingHorizontal: 14, borderRadius: radius.control, backgroundColor: colors.action.primary },
});
