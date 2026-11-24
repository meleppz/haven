import { useState, type ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Accordion, Avatar, Badge, BottomNavbar, BottomSheet, Button, Card, Checkbox, Chip, ChipGroup, DateSelector, FeatureIcon, Header, Label, Mascot, ProgressDashes,
  Radio, RatingStars, SearchField, SegmentedTabs, SlotChip, SpecialtyChip, StatTile, Text, TextField, Toast, Toggle,
  type ButtonVariant, type NavTab,
} from "@/components";
import { colors, layout } from "@/theme";

const variants: ButtonVariant[] = ["primary", "outline", "secondary", "secondaryOutline", "danger", "dangerOutline", "primaryTonal"];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 12 }}>
      <Text variant="h3" color={colors.text.brand}>
        {title}
      </Text>
      {children}
    </View>
  );
}

// Component gallery (demo mode). Compare against the Figma "Design System Haven" board (node 629:841).
export default function ComponentGallery() {
  const insets = useSafeAreaInsets();
  const [chips, setChips] = useState<string[]>(["Emosi"]);
  const [tab, setTab] = useState("About");
  const [on, setOn] = useState(true);
  const [radio, setRadio] = useState("QRIS");
  const [check, setCheck] = useState(false);
  const [date, setDate] = useState(new Date());
  const [slot, setSlot] = useState("14.00-15.00");
  const [nav, setNav] = useState<NavTab>("Beranda");
  const [sheet, setSheet] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.page }}>
      <Header title="Komponen" />
      <ScrollView contentContainerStyle={{ padding: layout.pagePadding, paddingBottom: insets.bottom + 32, gap: 28 }}>
        <Section title="Typography">
          <Text variant="display">Display 42</Text>
          <Text variant="h1">H1 32</Text>
          <Text variant="h2">H2 24</Text>
          <Text variant="h3">H3 20</Text>
          <Text variant="title">Title 18</Text>
          <Text variant="bodyM">Body M 16</Text>
          <Text variant="bodyS">Body S 14</Text>
          <Text variant="bodyXs">Body XS 12</Text>
        </Section>

        <Section title="Mascot & ikon (latar transparan)">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, backgroundColor: colors.surface.dateBar, padding: 12, borderRadius: 12 }}>
            <Mascot name="sad" size={72} />
            <Mascot name="confused" size={72} />
            <Mascot name="annoyed" size={72} />
            <Mascot name="celebrate" size={72} />
            <Mascot name="happySmall" size={72} />
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, backgroundColor: colors.surface.muted, padding: 12, borderRadius: 12 }}>
            {(["hariIni", "ahli247", "promo", "mahasiswa", "cariAhli", "rating", "riwayat", "bantuan"] as const).map((n) => (
              <FeatureIcon key={n} name={n} size={56} />
            ))}
          </View>
        </Section>

        <Section title="Button">
          {variants.map((v) => (
            <Button key={v} label={v} variant={v} />
          ))}
          <Button label="Disabled" disabled />
          <Button label="Loading" loading />
          <Button label="Lihat Profil" size="sm" />
        </Section>

        <Section title="Chip">
          <ChipGroup options={["Emosi", "ADHD", "Keluarga", "Anak"]} value={chips} onChange={setChips} multi />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Chip label="Okt 11" size="sm" />
            <Chip label="Okt 12" size="sm" selected />
          </View>
          <SpecialtyChip label="Kecanduan / Adiksi" />
        </Section>

        <Section title="Label & Badge">
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Label kind="secondary" label="Secondary" />
            <Label kind="primary" label="Primary" />
            <Label kind="success" label="Success" />
            <Label kind="danger" label="Danger" />
            <Label kind="warning" label="Warning" />
          </View>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Badge kind="verified" />
            <Badge kind="active" />
            <Badge kind="done" />
            <Badge kind="encrypted" label="Terenkripsi End-to-End · Anonim" />
          </View>
        </Section>

        <Section title="Fields">
          <SearchField />
          <TextField label="Email/No. Telepon" placeholder="Email/No. Telepon" />
          <TextField label="Password" placeholder="Password" secureTextEntry />
          <TextField label="Nama" placeholder="Nama" error="Nama minimal 2 karakter ya" />
          <TextField label="Deskripsi Singkat Masalah" placeholder="Ceritakan masalahmu dengan singkat" multiline />
        </Section>

        <Section title="Toggle, Radio, Checkbox">
          <Toggle value={on} onValueChange={setOn} />
          {["QRIS", "Transfer Bank"].map((m) => (
            <Radio key={m} label={m} selected={radio === m} onPress={() => setRadio(m)} />
          ))}
          <Checkbox label="Dengan ini saya menyetujui S&K Haven." selected={check} onPress={() => setCheck(!check)} />
        </Section>

        <Section title="Kalender & slot">
          <DateSelector value={date} onChange={setDate} markedDates={[new Date()]} />
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {["09.00-10.00", "14.00-15.00", "19.00-20.00"].map((s) => (
              <SlotChip key={s} label={s} selected={slot === s} onPress={() => setSlot(s)} />
            ))}
            <SlotChip label="20.00-21.00" disabled />
          </View>
        </Section>

        <Section title="Tabs, dashes, rating, stats">
          <SegmentedTabs tabs={["About", "Appointment", "Review"]} value={tab} onChange={setTab} />
          <ProgressDashes steps={3} current={1} />
          <RatingStars rating={4.5} count={200} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <StatTile value="100+" label="Jam Konseling" />
            <StatTile value="3+" label="Tahun Pengalaman" />
            <StatTile value="60+" label="Klien Terbantu" />
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Avatar name="Nadia, M.Psi." />
            <Avatar name="dr. Rania Putri, Sp.KJ" />
          </View>
        </Section>

        <Section title="Card, Accordion, Toast">
          <Card>
            <Text variant="h2" color={colors.text.brand}>
              Nadia, M.Psi.
            </Text>
            <Text variant="bodyM">Adiksi | Keluarga</Text>
            <Button label="Lihat Profil" size="sm" />
          </Card>
          <Accordion title="Apa metode pembayaran yang diterima?">
            <Text variant="bodyS">QRIS, Transfer Bank (BCA), Virtual Account, E-Wallet (DANA, GoPay, OVO).</Text>
          </Accordion>
          <Toast title="10 menit lagi ada konsultasi!" body="Siap-siap masuk ruang konsultasi ya." />
          <Toast kind="danger" title="Slot ini baru saja dipesan orang lain." body="Silakan pilih slot lain." />
          <Toast kind="success" title="Status mahasiswamu sudah terverifikasi!" body="Kamu bisa menikmati promo mahasiswa sekarang." />
        </Section>

        <Section title="Bottom sheet">
          <Button label="Buka bottom sheet" variant="outline" onPress={() => setSheet(true)} />
        </Section>
      </ScrollView>

      <BottomNavbar active={nav} onPress={setNav} />
      <BottomSheet
        visible={sheet}
        onClose={() => setSheet(false)}
        mascot="confused"
        title="Keluar dari aplikasi Haven?"
        body="Kamu perlu masuk kembali dengan akunmu jika ingin mengakses fitur-fitur di Haven."
        ctaLabel="Keluar"
        onCta={() => setSheet(false)}
        danger
      />
    </View>
  );
}
