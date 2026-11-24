import { Redirect } from "expo-router";

// Entry of the signed-out group: the route guard sends signed-out users here, and we forward them to Masuk.
export default function AuthEntry() {
  return <Redirect href="/login" />;
}
