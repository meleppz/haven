// Simulated clock (handoff §10, BR-22). Business logic must call clock.now(), never new Date().
let offsetMs = 0;
let frozen: Date | null = null; // tests pin the time to check exact window boundaries

export const clock = {
  now: () => (frozen ? new Date(frozen.getTime()) : new Date(Date.now() + offsetMs)),
  setOffsetMinutes: (m: number) => {
    offsetMs = m * 60_000;
  },
  advanceMinutes: (m: number) => {
    if (frozen) frozen = new Date(frozen.getTime() + m * 60_000);
    else offsetMs += m * 60_000;
  },
  freeze: (d: Date) => {
    frozen = new Date(d.getTime());
  },
  reset: () => {
    offsetMs = 0;
    frozen = null;
  },
};
