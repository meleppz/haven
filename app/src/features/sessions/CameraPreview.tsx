import { CameraView, useCameraPermissions } from "expo-camera";
import * as Linking from "expo-linking";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components";
import { colors, fontFamily } from "@/theme";

type Props = { facing: "front" | "back"; enabled: boolean; style?: ViewStyle; compact?: boolean };

// The user's own camera (front by default). Handoff 6.10: if permission is denied, show "Kamera tidak aktif" with a way
// to open Settings; the person can still enter the session. Camera off / voice sessions show the same placeholder.
export function CameraPreview({ facing, enabled, style, compact }: Props) {
  const [permission, request] = useCameraPermissions();

  if (enabled && permission?.granted) {
    return <CameraView style={[StyleSheet.absoluteFill, style]} facing={facing} mirror={facing === "front"} />;
  }

  const denied = enabled && permission && !permission.granted;
  return (
    <View style={[StyleSheet.absoluteFill, styles.placeholder, style]}>
      <Ionicons name="videocam-off" size={compact ? 22 : 40} color={colors.text.onPrimary} />
      {!compact ? (
        <Text variant="bodyM" color={colors.text.onPrimary} style={{ fontFamily: fontFamily.bodySemibold }}>
          Kamera tidak aktif
        </Text>
      ) : null}
      {denied && !compact ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => (permission.canAskAgain ? void request() : void Linking.openSettings())}
          style={({ pressed }) => [styles.permBtn, pressed && { opacity: 0.8 }]}
        >
          <Text variant="label" color={colors.text.brandStrong}>
            {permission.canAskAgain ? "Izinkan Kamera" : "Buka Pengaturan"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { backgroundColor: colors.surface.callStage, alignItems: "center", justifyContent: "center", gap: 10 },
  permBtn: { marginTop: 4, backgroundColor: colors.action.secondary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, minHeight: 44, justifyContent: "center" },
});
