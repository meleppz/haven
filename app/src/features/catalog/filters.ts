import { create } from "zustand";

// Catalog filter state (handoff §6.4). One store so the Beranda tiles can preset filters before opening Cari.
export const PRICE_MIN = 50_000;
export const PRICE_MAX = 2_000_000; // the slider's right end means "+Rp2.000.000": no upper limit

export const CATEGORIES = ["Semua", "Psikolog", "Psikiater"] as const;
export const SORTS = [
  { label: "Harga tertinggi", key: "price_desc" },
  { label: "Harga terendah", key: "price_asc" },
  { label: "Lama pengalaman", key: "experience" },
  { label: "Rating", key: "rating" },
] as const;
export const SPECIALTIES = ["ADHD", "Autisme", "Keluarga", "Gender", "Pernikahan", "Tumbuh Kembang", "Emosi", "Adiksi", "Anak"] as const;
export const EXPERIENCES = [
  { label: "Semua", key: "Semua" },
  { label: "1-2 thn", key: "1-2" },
  { label: "2-5 thn", key: "2-5" },
  { label: "> 5 thn", key: ">5" },
] as const;
// "Waktu" is not in the Figma filter sheet; it is added for the evening/weekend need (handoff §13 #4).
export const TIMES = ["Semua", "Pagi", "Siang", "Malam", "Akhir Pekan"] as const;

export const QUICK_CHIPS = [
  { label: "Konsultasi 24/7", key: "24x7" },
  { label: "Jadwal Terdekat", key: "nearest" },
  { label: "Promo Mahasiswa", key: "student" },
] as const;

export type SortKey = (typeof SORTS)[number]["key"];
export type ChipKey = (typeof QUICK_CHIPS)[number]["key"];

export type Filters = {
  q: string;
  category: (typeof CATEGORIES)[number];
  sort: SortKey | null;
  specialties: string[]; // empty = "Semua"
  minPrice: number;
  maxPrice: number;
  experience: (typeof EXPERIENCES)[number]["key"];
  time: (typeof TIMES)[number];
  chips: ChipKey[];
  availableToday: boolean;
};

export const defaultFilters: Filters = {
  q: "",
  category: "Semua",
  sort: null,
  specialties: [],
  minPrice: PRICE_MIN,
  maxPrice: PRICE_MAX,
  experience: "Semua",
  time: "Semua",
  chips: [],
  availableToday: false,
};

/** Filters that live in the sheet (the badge on the filter button counts these). */
export function activeSheetFilters(f: Filters) {
  return [
    f.category !== "Semua",
    f.sort !== null,
    f.specialties.length > 0,
    f.minPrice !== PRICE_MIN || f.maxPrice !== PRICE_MAX,
    f.experience !== "Semua",
    f.time !== "Semua",
  ].filter(Boolean).length;
}

/** -> query string params for GET /experts. */
export function toQuery(f: Filters): Record<string, string> {
  const q: Record<string, string> = {};
  if (f.q.trim()) q.q = f.q.trim();
  if (f.category !== "Semua") q.category = f.category;
  if (f.sort) q.sort = f.sort;
  if (f.specialties.length) q.specialties = f.specialties.join(",");
  if (f.minPrice !== PRICE_MIN) q.minPrice = String(f.minPrice);
  if (f.maxPrice !== PRICE_MAX) q.maxPrice = String(f.maxPrice);
  if (f.experience !== "Semua") q.experience = f.experience;
  if (f.time === "Akhir Pekan") q.weekend = "true";
  else if (f.time !== "Semua") q.timeOfDay = f.time;
  if (f.chips.length) q.chips = f.chips.join(",");
  if (f.availableToday) q.availableToday = "true";
  return q;
}

type CatalogState = {
  filters: Filters;
  focusSearch: boolean; // Beranda's search field opens Cari with the input focused
  patch: (p: Partial<Filters>) => void;
  reset: () => void;
  open: (preset: Partial<Filters>, focusSearch?: boolean) => void;
  consumeFocus: () => void;
};

export const useCatalog = create<CatalogState>((set) => ({
  filters: defaultFilters,
  focusSearch: false,
  patch: (p) => set((s) => ({ filters: { ...s.filters, ...p } })),
  reset: () => set({ filters: defaultFilters }),
  open: (preset, focusSearch = false) => set({ filters: { ...defaultFilters, ...preset }, focusSearch }),
  consumeFocus: () => set({ focusSearch: false }),
}));
