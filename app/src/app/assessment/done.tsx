import { useRouter } from "expo-router";
import { Button, SplashScene } from "@/components";
import { HOME } from "@/lib/routes";

// L41.5 Asesmen: selesai (the "Selesai isi asesmen" splash)
export default function AssessmentDone() {
  const router = useRouter();
  return (
    <SplashScene title="Terima Kasih sudah Berbagi" body="Ayo mulai bercerita dan temukan ruang amanmu dengan bantuan Haven!" mascot="wave">
      <Button label="Masuk ke Haven" onPress={() => router.replace(HOME)} />
    </SplashScene>
  );
}
