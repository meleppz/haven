import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Chip, StepScreen, TextField } from "@/components";
import { useAssessment } from "@/features/assessment/assessment-store";
import { OCCUPATION_QUICK_PICKS } from "@/features/assessment/concerns";

// L41.3 Pekerjaan (assessment step 2 of 3). Free text, plus quick-pick chips (handoff addition).
export default function OccupationScreen() {
  const router = useRouter();
  const { occupation: saved, set } = useAssessment();
  const [occupation, setOccupation] = useState(saved);
  const [error, setError] = useState<string>();

  function next() {
    if (!occupation.trim()) {
      setError("Pekerjaan wajib diisi ya");
      return;
    }
    set({ occupation: occupation.trim() });
    router.push("/assessment/concerns");
  }

  return (
    <StepScreen step={1} title="Apa Pekerjaanmu?" onBack={() => router.back()} cta={{ label: "Lanjut", onPress: next, disabled: !occupation.trim() }}>
      <View style={{ flexDirection: "row", gap: 8, justifyContent: "center" }}>
        {OCCUPATION_QUICK_PICKS.map((o) => (
          <Chip
            key={o}
            label={o}
            selected={occupation.trim().toLowerCase() === o.toLowerCase()}
            onPress={() => {
              setOccupation(o);
              setError(undefined);
            }}
          />
        ))}
      </View>
      <View style={{ marginTop: -16 }}>
        <TextField
          label="Pekerjaan"
          placeholder="Pekerjaan"
          value={occupation}
          onChangeText={(v) => {
            setOccupation(v);
            setError(undefined);
          }}
          error={error}
          autoCapitalize="sentences"
          returnKeyType="next"
          onSubmitEditing={next}
        />
      </View>
    </StepScreen>
  );
}
