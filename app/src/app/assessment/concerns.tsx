import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { meKey, saveAssessment } from "@/api/me";
import { Chip, StepScreen, Text, TextField, useToast } from "@/components";
import { useAssessment } from "@/features/assessment/assessment-store";
import { CONCERN_OPTIONS } from "@/features/assessment/concerns";
import { errorMessage } from "@/features/auth/errors";
import { colors, fontFamily } from "@/theme";

// L41.4 Permasalahan (assessment step 3 of 3). At least one concern; the description is optional (max 500).
export default function ConcernsScreen() {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const a = useAssessment();
  const [loading, setLoading] = useState(false);

  const toggle = (c: string) => a.set({ concerns: a.concerns.includes(c) ? a.concerns.filter((x) => x !== c) : [...a.concerns, c] });

  async function submit() {
    setLoading(true);
    try {
      await saveAssessment({ age: Number(a.age), occupation: a.occupation, concerns: a.concerns, note: a.note.trim() || undefined });
      await queryClient.invalidateQueries({ queryKey: meKey });
      a.reset();
      router.replace("/assessment/done");
    } catch (e) {
      toast.show({ kind: "danger", title: errorMessage(e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <StepScreen
      step={2}
      compact
      title="Apa yang kamu rasakan?"
      onBack={() => router.back()}
      cta={{ label: "Lanjut", onPress: submit, disabled: a.concerns.length === 0, loading }}
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
        {CONCERN_OPTIONS.map((c) => (
          <Chip key={c} label={c} selected={a.concerns.includes(c)} onPress={() => toggle(c)} />
        ))}
      </View>
      <View style={{ gap: 8, marginTop: -8 }}>
        <Text variant="bodyS" color={colors.text.specialty} style={{ fontFamily: fontFamily.bodySemibold }}>
          Deskripsikan Permasalahanmu (opsional)
        </Text>
        <TextField placeholder="Masalah" value={a.note} onChangeText={(v) => a.set({ note: v })} multiline maxLength={500} style={{ minHeight: 141 }} />
      </View>
    </StepScreen>
  );
}
