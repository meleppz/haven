// Simulated clock (handoff §10, BR-22). Business logic must call clock.now(), never new Date().
let offsetMs = 0;

export const clock = {
  now: () => new Date(Date.now() + offsetMs),
  setOffsetMinutes: (m: number) => { offsetMs = m * 60_000; },
  advanceMinutes: (m: number) => { offsetMs += m * 60_000; },
  reset: () => { offsetMs = 0; },
};
