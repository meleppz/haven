import { useEffect, useRef, type ComponentRef, type ReactNode } from "react";
import { DeviceEventEmitter, Keyboard, KeyboardAvoidingView, Platform, ScrollView, TextInput, type KeyboardEvent, type ScrollViewProps, type ViewStyle } from "react-native";

// Keeps the focused field above the keyboard (revision after Phase 6: "push the frames up when the keyboard is shown").
// Android runs edge-to-edge (SDK 58), so the window no longer resizes for the keyboard: KeyboardAvoidingView pads on both
// platforms, and the scroll view then scrolls the focused input into view. TextField emits FIELD_FOCUS so moving
// between fields while the keyboard is already open also scrolls.

export const FIELD_FOCUS = "haven:field-focus";
const GAP = 24; // space kept between the field and the keyboard

export function KeyboardAwareScrollView({ children, onScroll, ...rest }: ScrollViewProps & { children: ReactNode }) {
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const offsetY = useRef(0);
  const keyboardTop = useRef<number | null>(null);

  useEffect(() => {
    const reveal = (delay: number) =>
      setTimeout(() => {
        const input = TextInput.State.currentlyFocusedInput();
        const top = keyboardTop.current;
        if (!input || top === null) return;
        input.measureInWindow((_x, y, _w, h) => {
          const overlap = y + h + GAP - top;
          if (overlap > 0) ref.current?.scrollTo({ y: offsetY.current + overlap, animated: true });
        });
      }, delay);

    const onShow = (e: KeyboardEvent) => {
      keyboardTop.current = e.endCoordinates.screenY;
      reveal(Platform.OS === "ios" ? 260 : 80); // after KeyboardAvoidingView has re-laid out
    };
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", onShow);
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => {
      keyboardTop.current = null;
    });
    const focus = DeviceEventEmitter.addListener(FIELD_FOCUS, () => reveal(60));
    return () => {
      show.remove();
      hide.remove();
      focus.remove();
    };
  }, []);

  return (
    <ScrollView
      ref={ref}
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
      onScroll={(e) => {
        offsetY.current = e.nativeEvent.contentOffset.y;
        onScroll?.(e);
      }}
      {...rest}
    >
      {children}
    </ScrollView>
  );
}

/** KeyboardAvoidingView + KeyboardAwareScrollView: the default body for any screen with text fields. */
export function KeyboardScroll({ style, ...rest }: ScrollViewProps & { children: ReactNode; style?: ViewStyle }) {
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <KeyboardAwareScrollView style={style} {...rest} />
    </KeyboardAvoidingView>
  );
}
