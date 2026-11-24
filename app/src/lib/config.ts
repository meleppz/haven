// Phone + Expo Go cannot reach localhost: set EXPO_PUBLIC_API_URL=http://<LAN-IP>:3000 (handoff 3).
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
export const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === "1";
