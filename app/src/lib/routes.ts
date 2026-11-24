import type { Href } from "expo-router";

// The generated route types list these two only under their explicit "index" names, which are not real URLs
// (/assessment/index is "unmatched"). The real routes are "/" (Beranda, the first tab) and "/assessment" (the intro).
export const HOME = "/" as Href;
export const ASSESSMENT_INTRO = "/assessment" as Href;
// Same quirk for folders with an index.tsx: the real URLs are "/history" and "/payment/<id>".
export const HISTORY = "/history" as Href;
export const SETTINGS = "/settings" as Href;
export const DEV_MENU = "/dev" as Href;
