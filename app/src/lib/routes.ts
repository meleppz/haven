import type { Href } from "expo-router";

// The generated route types list these two only under their explicit "index" names, which are not real URLs
// (/assessment/index is "unmatched"). The real routes are "/" (Beranda, the first tab) and "/assessment" (the intro).
export const HOME = "/" as Href;
export const ASSESSMENT_INTRO = "/assessment" as Href;
