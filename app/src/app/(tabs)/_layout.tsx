import { Tabs } from "expo-router";
import { BottomNavbar, WebScreenFade, type NavTab } from "@/components";

// Bottom tabs (handoff §5): Beranda, Cari, Ruang Konsultasi, Pesan, Profil. The navbar is the Figma component.
const ROUTE_TO_TAB: Record<string, NavTab> = {
  index: "Beranda",
  search: "Cari",
  sessions: "Ruang Konsultasi",
  messages: "Pesan",
  profile: "Profil",
};
const TAB_TO_ROUTE = Object.fromEntries(Object.entries(ROUTE_TO_TAB).map(([route, tab]) => [tab, route])) as Record<NavTab, string>;

export default function TabsLayout() {
  return (
    <Tabs
      // Tabs cross-fade instead of switching instantly (revision); on web each tab also fades in on first mount.
      screenOptions={{ headerShown: false, animation: "fade" }}
      screenLayout={({ children }) => <WebScreenFade>{children}</WebScreenFade>}
      tabBar={({ state, navigateToTab }) => (
        <BottomNavbar
          active={ROUTE_TO_TAB[state.routes[state.index].name] ?? "Beranda"}
          onPress={(tab) => {
            const route = state.routes.find((r) => r.name === TAB_TO_ROUTE[tab]);
            if (route) navigateToTab(route.key);
          }}
        />
      )}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="sessions" />
      <Tabs.Screen name="messages" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
