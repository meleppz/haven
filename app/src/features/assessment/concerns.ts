// Assessment concern chips (handoff §6.2), in the order of the Figma screen.
export const CONCERN_OPTIONS = [
  "Frustrasi",
  "Lelah",
  "Butuh Teman Cerita",
  "Overwhelmed",
  "Panik",
  "Sulit Bersosialisasi",
  "Kesulitan Akademik",
  "Beban Kerja Tinggi",
] as const;

// Quick picks above the occupation field. They make the student check in the recommendation rule (BR-04) reliable.
export const OCCUPATION_QUICK_PICKS = ["Mahasiswa", "Pekerja"] as const;
