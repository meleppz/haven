import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold } from "@expo-google-fonts/figtree";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ToastProvider } from "@/components";
import { useAuth } from "@/features/auth/auth-store";
import { queryClient } from "@/lib/query";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Family names must match theme/typography.ts. Qanelas files live in assets/fonts.
  const [loaded, error] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    QanelasSoft_Bold: require("../../assets/fonts/QanelasSoft-Bold.otf"),
    QanelasSoft_SemiBold: require("../../assets/fonts/QanelasSoft-SemiBold.otf"),
    Qanelas_Regular: require("../../assets/fonts/Qanelas-Regular.otf"),
  });
  const token = useAuth((s) => s.token);
  const hydrated = useAuth((s) => s.hydrated);

  // Restore the session (token from secure storage) on launch.
  useEffect(() => {
    void useAuth.getState().hydrate();
  }, []);

  const ready = (loaded || !!error) && hydrated;
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ToastProvider>
          <Stack screenOptions={{ headerShown: false }}>
            {/* Route guard (handoff §5): signed out -> login; signed in -> the app. */}
            <Stack.Protected guard={!!token}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="assessment" />
              <Stack.Screen name="experts/[id]" />
              <Stack.Screen name="booking/[expertId]" />
            </Stack.Protected>
            <Stack.Protected guard={!token}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
          </Stack>
        </ToastProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
