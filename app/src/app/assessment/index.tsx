import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Button, SplashScene } from "@/components";
import { useRegistration } from "@/features/auth/registration-store";
import { HOME } from "@/lib/routes";

// L41.1 Asesmen: intro (the "Baru Masuk" splash). No progress dashes here (deliberate M4 change).
export default function AssessmentIntro() {
  const router = useRouter();

  useEffect(() => {
    useRegistration.getState().reset(); // registration is finished once we get here
  }, []);

  return (
    <SplashScene
      title="Selamat datang di Haven!"
      body="Akunmu berhasil dibuat. Lakukan asesmen singkat supaya Haven bisa menyesuaikan layanan terbaik untukmu!"
      mascot="wave"
    >
      <Button label="Isi Asesmen 2 Menit" onPress={() => router.push("/assessment/age")} />
      {/* Skipping is fine: the assessment banner then stays on Beranda. */}
      <Button label="Nanti Aja" variant="outline" onPress={() => router.replace(HOME)} />
    </SplashScene>
  );
}
