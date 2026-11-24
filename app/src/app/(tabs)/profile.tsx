import { useMe } from "@/api/me";
import { Button, PlaceholderScreen, Text } from "@/components";
import { useAuth } from "@/features/auth/auth-store";
import { colors } from "@/theme";

// L84 Profil: Phase 6. For now it only offers "Keluar" so the login/logout round trip can be tested.
// (Phase 6 moves "Keluar" to Pengaturan with the confirmation sheet.)
export default function ProfileTab() {
  const me = useMe();
  const signOut = useAuth((s) => s.signOut);
  return (
    <PlaceholderScreen title="Profil">
      {me.data ? (
        <Text variant="bodyM" color={colors.text.secondary}>
          {me.data.name} (@{me.data.username})
        </Text>
      ) : null}
      <Button label="Keluar" variant="dangerOutline" onPress={() => void signOut()} />
    </PlaceholderScreen>
  );
}
