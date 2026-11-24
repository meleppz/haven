import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fontFamily, layout, radius } from "@/theme";
import { Text } from "./Text";

export type SheetAction = { label: string; icon?: keyof typeof Ionicons.glyphMap; onPress: () => void; danger?: boolean };

// A list of actions in the same bottom-sheet shell as BottomSheet (the video call's "…" menu).
export function ActionSheet({ visible, onClose, title, actions }: { visible: boolean; onClose: () => void; title?: string; actions: SheetAction[] }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Tutup" />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <View style={styles.handle} />
        {title ? (
          <Text variant="title" color={colors.text.brandStrong} style={{ textAlign: "center", marginBottom: 4 }}>
            {title}
          </Text>
        ) : null}
        {actions.map((a) => (
          <Pressable
            key={a.label}
            accessibilityRole="button"
            onPress={() => {
              onClose();
              a.onPress();
            }}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface.muted }]}
          >
            {a.icon ? <Ionicons name={a.icon} size={22} color={a.danger ? colors.action.danger : colors.text.brand} /> : null}
            <Text variant="bodyM" color={a.danger ? colors.action.danger : colors.text.brandStrong} style={{ fontFamily: fontFamily.bodySemibold }}>
              {a.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { backgroundColor: colors.surface.card, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, paddingHorizontal: 16, paddingTop: 12, gap: 4 },
  handle: { alignSelf: "center", width: 70, height: 4, borderRadius: 2, backgroundColor: colors.border.default, marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: layout.minTouch + 8, paddingHorizontal: 8, borderRadius: radius.control },
});
