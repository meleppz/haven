import { useRouter } from "expo-router";
import { useState } from "react";
import { StepScreen, Text, TextField } from "@/components";
import { useAssessment } from "@/features/assessment/assessment-store";
import { ageError } from "@/lib/validators";
import { colors } from "@/theme";

// L41.2 Usia (assessment step 1 of 3)
export default function AgeScreen() {
  const router = useRouter();
  const { age: saved, set } = useAssessment();
  const [age, setAge] = useState(saved);
  const [error, setError] = useState<string>();

  function next() {
    const e = ageError(age);
    setError(e);
    if (e) return;
    set({ age: age.trim() });
    router.push("/assessment/occupation");
  }

  return (
    <StepScreen step={0} title="Berapa Usiamu?" onBack={() => router.back()} cta={{ label: "Lanjut", onPress: next, disabled: !age.trim() }}>
      <TextField
        label="Usia"
        placeholder="Usia"
        value={age}
        onChangeText={(v) => {
          setAge(v.replace(/\D/g, "").slice(0, 3));
          setError(undefined);
        }}
        error={error}
        keyboardType="number-pad"
        autoFocus
        maxLength={3}
        returnKeyType="next"
        onSubmitEditing={next}
      />
      <Text variant="bodyS" color={colors.text.specialty} style={{ marginTop: -16, paddingHorizontal: 8 }}>
        Pastikan usia sesuai dengan kartu identitas.
      </Text>
    </StepScreen>
  );
}
