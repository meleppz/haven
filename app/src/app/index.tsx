import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchHealth } from "@/api/health";
import { Text } from "@/components";
import { API_URL, DEMO_MODE } from "@/lib/config";
import { colors, gradients, layout } from "@/theme";

// Phase 0 placeholder home: proves fonts, theme, safe areas, and LAN reachability of the server.
export default function Index() {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState("Mengecek server…");

  useEffect(() => {
    fetchHealth()
      .then((h) => setStatus(`Server tersambung (${h.serverNow})`))
      .catch(() => setStatus(`Server belum terjangkau di ${API_URL}`));
  }, []);

  return (
    <LinearGradient {...gradients.hero} style={{ flex: 1, paddingTop: insets.top + 48, paddingHorizontal: layout.pagePadding, gap: 12 }}>
      <Text variant="display" color={colors.text.brandStrong}>
        Haven
      </Text>
      <Text variant="bodyM" color={colors.text.secondary}>
        Ruang Telekonsultasi Mental yang Aman dan Empatik.
      </Text>
      <Text variant="bodyS" color={colors.text.secondary}>
        {status}
      </Text>
      {DEMO_MODE ? (
        <View style={{ marginTop: 16 }}>
          <Link href={"/dev/components" as never}>
            <Text variant="label" color={colors.text.brand}>
              Buka galeri komponen
            </Text>
          </Link>
        </View>
      ) : null}
    </LinearGradient>
  );
}
