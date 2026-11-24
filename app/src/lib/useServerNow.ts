import { useEffect, useState } from "react";

/** Re-renders every `ms` and returns the device time. */
export function useTicker(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/**
 * The server's clock, ticking locally (BR-22: countdowns never trust the device clock).
 * `serverNow` is the value a response carried and `receivedAt` is when it arrived (react-query's `dataUpdatedAt`),
 * so the offset is derived without storing anything.
 */
export function useServerNow(serverNow: string | undefined, receivedAt: number, ms = 1000) {
  const now = useTicker(ms);
  if (!serverNow || !receivedAt) return now;
  return now + (Date.parse(serverNow) - receivedAt);
}
