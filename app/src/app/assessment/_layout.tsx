import { Stack } from "expo-router";
import { stackTransition, WebScreenFade } from "@/components";

export default function AssessmentLayout() {
  return <Stack screenOptions={{ headerShown: false, ...stackTransition }} screenLayout={({ children }) => <WebScreenFade>{children}</WebScreenFade>} />;
}
