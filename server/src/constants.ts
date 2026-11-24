// Editable constants (handoff §6.2, §6.4, BR-04).

export const CONCERNS = [
  "Frustrasi",
  "Lelah",
  "Butuh Teman Cerita",
  "Overwhelmed",
  "Panik",
  "Sulit Bersosialisasi",
  "Kesulitan Akademik",
  "Beban Kerja Tinggi",
] as const;

/** BR-04: assessment concern -> expert specialties (editable). */
export const CONCERN_SPECIALTIES: Record<string, string[]> = {
  Frustrasi: ["Emosi"],
  Lelah: ["Emosi", "Krisis Quarter-Life"],
  "Butuh Teman Cerita": ["Emosi", "Keluarga"],
  Overwhelmed: ["Emosi", "Krisis Quarter-Life"],
  Panik: ["Emosi"],
  "Sulit Bersosialisasi": ["Emosi", "Autisme"],
  "Kesulitan Akademik": ["Krisis Quarter-Life", "ADHD"],
  "Beban Kerja Tinggi": ["Krisis Quarter-Life", "Emosi"],
};

export const STUDENT_PATTERN = /mahasiswa|siswa|pelajar|student/i;

/** One-line explanation per specialty (tooltip on Detail Psikolog, M3 feedback). */
export const SPECIALTY_INFO: Record<string, string> = {
  ADHD: "Kesulitan fokus, mudah teralihkan, atau sulit mengatur waktu dan impuls.",
  Autisme: "Pendampingan untuk perbedaan komunikasi dan interaksi sosial.",
  Keluarga: "Konflik dan dinamika dalam keluarga.",
  Gender: "Isu identitas dan peran gender.",
  Pernikahan: "Hubungan pasangan dan kehidupan pernikahan.",
  "Tumbuh Kembang": "Perkembangan anak dan remaja.",
  Emosi: "Mengelola perasaan seperti cemas, sedih, atau marah.",
  Adiksi: "Kecanduan dan kebiasaan yang sulit dihentikan.",
  Anak: "Konseling untuk anak.",
  "Krisis Quarter-Life": "Kebingungan arah hidup, karier, dan jati diri di usia 20-an.",
  "Gangguan Makan": "Pola makan dan hubungan dengan tubuh.",
};
