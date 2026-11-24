import { useEffect, useState, type ReactNode } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";
import { uiIcons } from "@/lib/ui-icons";
import { colors, layout, palette } from "@/theme";
import { Mascot } from "./Art";
import { Backdrop, type Blob } from "./Backdrop";
import { Button } from "./Button";
import { ProgressDashes } from "./Misc";
import { Text } from "./Text";

// ---------------------------------------------------------------------------------------------------------------
// Masuk / Daftar: a hero (blurred blobs + the waving mascot + big title) above a white form panel.
// ---------------------------------------------------------------------------------------------------------------

// Figma L01 / Masuk: Ellipse 178 (primary-200, top-left) and Ellipse 177 (secondary-200, bottom-right of the hero).
const HERO_BLOBS: Blob[] = [
  { color: palette.primary[200], cx: 28, cy: -14.5, rx: 215, ry: 150.5, blur: 100 },
  { color: palette.secondary[200], cx: 366.5, cy: 419, rx: 195.5, ry: 118, blur: 100 },
];

type HeroProps = { title: string; fields: ReactNode; actions: ReactNode };

export function AuthHero({ title, fields, actions }: HeroProps) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // 419px on the design frame; shrinks on short phones so the form always fits.
  const heroH = Math.min(419, Math.max(250, height - 440));
  const mascotH = Math.min(286, heroH - insets.top - 70);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding">
      <ScrollView
        style={styles.flex}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={{ height: heroH }}>
          <Backdrop blobs={HERO_BLOBS} size={{ w: 393, h: 419 }} style={{ height: heroH }} />
          <View style={[styles.heroMascot, { top: insets.top + 9 }]}>
            <Mascot name="wave" size={mascotH} />
          </View>
          <Text variant="display" color={colors.text.brand} style={styles.heroTitle}>
            {title}
          </Text>
        </View>
        <View style={styles.panel}>
          <View style={{ gap: 16 }}>{fields}</View>
          <View style={{ gap: 12, marginTop: 24 }}>{actions}</View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** "Belum punya akun? Daftar": the link is bold, underlined, primary-500. */
export function AuthSwitchLink({ prompt, link, onPress }: { prompt: string; link: string; onPress: () => void }) {
  return (
    <Text variant="bodyM" color={palette.neutral[700]} style={{ textAlign: "center", letterSpacing: -0.32 }}>
      {prompt}{" "}
      <Text
        variant="bodyM"
        accessibilityRole="link"
        onPress={onPress}
        color={palette.primary[500]}
        style={{ fontFamily: "Figtree_700Bold", textDecorationLine: "underline", letterSpacing: -0.32 }}
      >
        {link}
      </Text>
    </Text>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Multi-step forms (OTP, Nama, Password, Usia, Pekerjaan, Permasalahan): back chevron, crumbs, centered title,
// content, and a "Lanjut" button docked above the keyboard.
// ---------------------------------------------------------------------------------------------------------------

// Figma L02..L08: Ellipse 177 (primary-100, bottom-right) and Ellipse 178 (secondary-100, top-left).
const STEP_BLOBS: Blob[] = [
  { color: palette.primary[100], cx: 366.5, cy: 524.5, rx: 195.5, ry: 139.5, blur: 100 },
  { color: palette.secondary[100], cx: 28, cy: 12.5, rx: 215, ry: 177.5, blur: 100 },
];

type StepProps = {
  step: 0 | 1 | 2;
  title: string;
  onBack: () => void;
  children: ReactNode;
  cta: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean };
  compact?: boolean; // tall content (chips + text area): the title sits right under the header
};

export function StepScreen({ step, title, onBack, children, cta, compact }: StepProps) {
  const insets = useSafeAreaInsets();
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", () => setKeyboard(true));
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setKeyboard(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return (
    <View style={styles.flex}>
      <Backdrop blobs={STEP_BLOBS} />
      <View style={{ height: insets.top + layout.minTouch }}>
        <View style={[styles.crumbs, { top: insets.top }]}>
          <ProgressDashes steps={3} current={step} />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Kembali" hitSlop={8} onPress={onBack} style={[styles.back, { top: Math.max(insets.top - 8, 0) }]}>
          <View style={{ transform: [{ rotate: "180deg" }] }}>
            <SvgXml xml={uiIcons.arrowRight} width={28} height={28} />
          </View>
        </Pressable>
      </View>
      <KeyboardAvoidingView style={styles.fill} behavior="padding">
        <ScrollView
          style={styles.fill}
          contentContainerStyle={{ paddingHorizontal: 17, paddingTop: compact ? 0 : 96 - 44, paddingBottom: 24, gap: 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text variant="h1" color={colors.text.specialty} style={{ textAlign: "center" }}>
            {title}
          </Text>
          {children}
        </ScrollView>
        <View style={{ paddingHorizontal: 16.5, paddingTop: 8, paddingBottom: keyboard ? 12 : Math.max(insets.bottom, 12) + 4 }}>
          <Button label={cta.label} onPress={cta.onPress} disabled={cta.disabled} loading={cta.loading} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface.page },
  fill: { flex: 1 }, // transparent: lets the blurred backdrop show through
  heroMascot: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  heroTitle: { position: "absolute", left: 18, bottom: 18 },
  panel: { flex: 1, backgroundColor: colors.surface.page, paddingHorizontal: 16, paddingTop: 36, paddingBottom: 40, justifyContent: "space-between" },
  crumbs: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  back: { position: "absolute", left: 20, width: layout.minTouch, height: layout.minTouch, alignItems: "center", justifyContent: "center" },
});
