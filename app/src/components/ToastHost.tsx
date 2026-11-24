import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Toast } from "./Misc";

// In-app toasts only (push notifications are out of scope, handoff §2).
type ToastInput = { kind?: "info" | "danger" | "success"; title: string; body?: string; durationMs?: number };
type ToastItem = ToastInput & { id: number };

const ToastContext = createContext<{ show: (t: ToastInput) => void }>({ show: () => undefined });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const show = useCallback((t: ToastInput) => {
    const id = nextId.current++;
    setItems((cur) => [...cur.slice(-2), { ...t, id }]);
    setTimeout(() => setItems((cur) => cur.filter((x) => x.id !== id)), t.durationMs ?? 3500);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View pointerEvents="none" style={[styles.host, { top: insets.top + 8 }]}>
        {items.map((t) => (
          <Animated.View key={t.id} entering={FadeInUp.duration(220)} exiting={FadeOutUp.duration(180)}>
            <Toast kind={t.kind} title={t.title} body={t.body} />
          </Animated.View>
        ))}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  host: { position: "absolute", left: 16, right: 16, gap: 8, zIndex: 100 },
});
