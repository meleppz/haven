import type { ReactNode } from "react";
import { Platform } from "react-native";
import Animated, { Easing, FadeIn } from "react-native-reanimated";

// Gentle screen transitions (user revision after Phase 4: "transisi antar layer dibikin lebih gentle").
// iOS/Android use the native stack animations below. The web build has no native stack animation, so each screen
// fades in as it mounts instead.

/** Default push/pop: an iOS-style slide on both platforms (Android's default is an abrupt fade/zoom). */
export const stackTransition = { animation: Platform.OS === "android" ? "ios_from_right" : "default", gestureEnabled: true } as const;

/** Splash-like full-screen moments (assessment intro/done, payment success, session done) cross-fade instead of sliding. */
export const fadeTransition = { animation: "fade", animationDuration: 380 } as const;

const enter = FadeIn.duration(260).easing(Easing.out(Easing.quad));

/** Web only: wraps every screen in a short fade-in (see `screenLayout` in the root and tab layouts). */
export function WebScreenFade({ children }: { children: ReactNode }) {
  if (Platform.OS !== "web") return <>{children}</>;
  return (
    <Animated.View entering={enter} style={{ flex: 1 }}>
      {children}
    </Animated.View>
  );
}
