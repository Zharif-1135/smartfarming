// threshold.js
// ------------------------------------------------------------
// Satu-satunya sumber ambang (min/max/kelas) untuk Dashboard,
// Monitoring, dan Kontrol. Lengkap dengan helper klasifikasi
// & perhitungan amonia tak terionisasi (UIA, NH3).
//
// Sumber utama angka (ringkas):
// - DO kolam ≥5 mg/L ideal; minimum 4–5 mg/L untuk produksi (Boyd 2003; Mallya 2007).
// - pH kolam aman 6.5–9.0; NH3 (UIA) mulai berbahaya di 0.05 mg/L; akut ≥1–2 mg/L (US EPA 2013).
// - Suhu kolam tilapia umum 26–30 °C (banyak panduan budidaya).
// - Hidroponik: pH 5.5–6.5; suhu larutan 18–25 °C (beragam referensi hortikultura).
// - Kandang: panas berisiko >30 °C terutama bila RH >75%; NH3 udara target <25 ppm (ideal <10 ppm).
// - Cacing sutra (Tubifex): pH ~6.9–7.6; suhu 26–28 °C; DO ~2.7–5 mg/L; amonia (total) rendah.
// Lihat detail sumber pada pesan pendamping.

// ------------------------------------------------------------
// UTIL UMUM
const isNum = (v) => Number.isFinite(v);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/**
 * Hitung fraksi NH3 (unionized ammonia) & konsentrasi NH3 (mg/L) dari TAN (mg/L)
 * Algoritma Emerson (disederhanakan), cukup akurat utk air tawar praktis.
 * @param {number} TAN_mgL - Total Ammonia Nitrogen (mg/L sebagai N)
 * @param {number} pH
 * @param {number} tempC
 * @param {number} [salinityPPT=0] - salinitas ppt (0 untuk tawar)
 * @returns {{f_NH3:number, NH3_mgL:number}}
 */
export function uiaFromTAN(TAN_mgL, pH, tempC, salinityPPT = 0) {
  if (!isNum(TAN_mgL) || !isNum(pH) || !isNum(tempC)) return { f_NH3: NaN, NH3_mgL: NaN };
  // pKa menurut Emerson et al. (1975) dengan koreksi suhu & salinitas (air tawar ~0)
  const T = tempC;
  const pKa = 0.09018 + 2729.92 / (273.15 + T); // air tawar (salinity ~0 ppt)
  const f_NH3 = 1 / (1 + Math.pow(10, pKa - pH)); // fraksi NH3 dari TAN
  const NH3_mgL = TAN_mgL * f_NH3; // mg/L sebagai N (cukup untuk banding ambang toksik)
  return { f_NH3, NH3_mgL };
}

/**
 * Konversi level ke prioritas numerik
 */
const levelRank = { danger: 3, warning: 2, ok: 1, unknown: 0 };

/**
 * Ambang generik bertingkat: ok, warning, danger dengan zona transisi.
 * Struktur ambang setiap metrik:
 *  {
 *    ok: [min, max],         // di dalam = "ok"
 *    warnLow: number|null,   // jika < warnLow => "danger"; di [warnLow, ok.min) => "warning"
 *    warnHigh: number|null,  // jika > warnHigh => "danger"; di (ok.max, warnHigh] => "warning"
 *    units: "°C"|"mg/L"|"...",
 *    note?: "tambahan catatan"
 *  }
 */
export const thresholds = {
  // ===================== KOLAM (ikan air tawar / tilapia) =====================
  kolam: {
    suhu: {
      ok: [26, 30],           // praktik budidaya umum; banyak panduan menyarankan 28–30 °C
      warnLow: 24,
      warnHigh: 32,
      units: "°C",
      note: "Di bawah 24 °C pertumbuhan melambat; di atas 32 °C risiko stres panas meningkat."
    },
    ph: {
      ok: [6.5, 9.0],
      warnLow: 6.0,
      warnHigh: 9.5,
      units: "pH"
    },
    oksigen: {
      ok: [5, Infinity],      // ideal ≥5 mg/L
      warnLow: 3,             // 3–<5 mg/L = warning
      warnHigh: null,
      units: "mg/L",
      note: "Jaga aerasi; DO <3 mg/L berbahaya terutama jelang subuh."
    },
    // Jika kamu kirim TAN (mg/L) + pH + suhu, kita bisa klasifikasi via UIA (NH3 tak terionisasi)
    // Namun untuk kompatibilitas, kita sediakan juga 'amonia_total' langsung (TAN) dengan asumsi pH netral.
    amonia_uia: {
      // klasifikasi berbasis NH3 (unionized) mg/L
      ok: [0, 0.02],          // konservatif: <0.02 mg/L sangat aman
      warnLow: 0,             // bukan dipakai
      warnHigh: 0.05,         // 0.02–0.05 mg/L waspada
      units: "mg/L NH3-N",
      note: "NH3 ≥0.05 mg/L mulai merusak insang; ≥0.2 mg/L berbahaya, ≥1 mg/L sangat berbahaya."
    },
    amonia_total: {
      // fallback bila hanya TAN tanpa pH/suhu (sangat kasar → gunakan uiaFromTAN untuk akurasi)
      ok: [0, 0.5],
      warnLow: 0,
      warnHigh: 1.0,
      units: "mg/L TAN",
      note: "Gunakan klasifikasi UIA jika memungkinkan (butuh pH & suhu) untuk akurasi."
    }
  },

  // ===================== HIDROPONIK =====================
  hidroponik: {
    // pH generik untuk banyak sayuran daun (selada, sawi, dll.)
    ph: {
      ok: [5.5, 6.5],
      warnLow: 5.0,
      warnHigh: 7.0,
      units: "pH"
    },
    // suhu larutan nutrisi
    suhu: {
      ok: [18, 25],
      warnLow: 16,
      warnHigh: 28,
      units: "°C",
      note: "Larutan terlalu hangat menurunkan O2 terlarut & naikan risiko Pythium/akar busuk."
    },
    // Optional jika kamu punya sensor EC
    ec: {
      ok: [1.2, 2.5],   // nilai tengah yang aman untuk kebanyakan sayuran daun (lihat varietas bila perlu)
      warnLow: 0.8,
      warnHigh: 3.0,
      units: "mS/cm",
      note: "Sesuaikan per tanaman; lihat tabel spesifik varietas untuk presisi."
    },
    kelembaban: {
      ok: [50, 70],
      warnLow: 40,
      warnHigh: 80,
      units: "%RH",
      note: "RH tinggi + suhu tinggi meningkatkan rasa panas & risiko penyakit pernafasan."
    },
    intensitas_cahaya: {
      ok: [10000, 20000],       // broiler: grow 5–10 lux, brooding 20+; layer 10–30
      warnLow: 8000,
      warnHigh: 30000,
      units: "lux",
      note: "Sesuaikan fase/jenis. Layer sering 10–30 lux; brooding 20+; grow 5–10."
    }
  },

  // ===================== KANDANG (unggas generik) =====================
  kandang: {
    // suhu udara umum (dewasa). Anak/piyik butuh lebih hangat (tidak dicakup di sini).
    suhu: {
      ok: [20, 27],
      warnLow: 18,
      warnHigh: 30,
      units: "°C",
      note: "Heat stress meningkat >30 °C, terlebih jika RH >75%."
    },
    kelembaban: {
      ok: [50, 70],
      warnLow: 40,
      warnHigh: 80,
      units: "%RH",
      note: "RH tinggi + suhu tinggi meningkatkan rasa panas & risiko penyakit pernafasan."
    },
    // amonia udara (NH3) di kandang
    amonia: {
      ok: [0, 10],       // ideal <10 ppm
      warnLow: 0,
      warnHigh: 25,      // 10–25 ppm = warning
      units: "ppm",
      note: "Target <25 ppm (ketat); >25 ppm berbahaya untuk unggas & pekerja."
    },
    // intensitas cahaya tipikal di kandang (opsional, bila ada sensor lux)
    intensitas_cahaya: {
      ok: [5, 20],       // broiler: grow 5–10 lux, brooding 20+; layer 10–30
      warnLow: 3,
      warnHigh: 50,
      units: "lux",
      note: "Sesuaikan fase/jenis. Layer sering 10–30 lux; brooding 20+; grow 5–10."
    }
  },
  // ===================== ULAT (PLACEHOLDER UMUM) =====================
  // Jika kamu pakai ulat spesifik (mis. BSF/mealworm), override di project config.
  ulat: {
    suhu: {
      ok: [26, 28],
      warnLow: 24,
      warnHigh: 30,
      units: "°C"
    },
    ph: {
      ok: [6.9, 7.6],
      warnLow: 6.5,
      warnHigh: 8.0,
      units: "pH"
    },
    oksigen: {
      ok: [2.8, 5.0],
      warnLow: 2.0,
      warnHigh: null,
      units: "mg/L"
    },
    amonia_total: {
      ok: [0, 1.0],
      warnLow: 0,
      warnHigh: 3.0,
      units: "mg/L TAN"
    }
  },

  // ===================== PENGGUNAAN SISTEM =====================
usage: {
  energy: {
    ok: [0, 50],        // misal: <50 kWh = aman
    warnLow: 0,         // tidak dipakai, karena energy jarang <0
    warnHigh: 100,      // 50–100 = warning
    units: "kWh"
  },
  water: {
    ok: [0, 500],       // misal: <500 L = aman
    warnLow: 0,
    warnHigh: 1000,     // 500–1000 = warning
    units: "L"
  },
  efficiency: {
    ok: [75, 100],      // 75–100% = aman
    warnLow: 50,        // 50–75% = warning
    warnHigh: null,     // tidak ada batas atas
    units: "%"
  }
}

};

// ------------------------------------------------------------
// FUNGSI KLASIFIKASI
function classifyByBands(def, value) {
  if (!def || !isNum(value)) return { level: "unknown" };
  const [okMin, okMax] = def.ok;
  const { warnLow, warnHigh } = def;

  if (value >= okMin && value <= okMax) return { level: "ok" };
  if (warnLow != null && value >= warnLow && value < okMin) return { level: "warning" };
  if (warnHigh != null && value > okMax && value <= warnHigh) return { level: "warning" };
  if (warnLow != null && value < warnLow) return { level: "danger" };
  if (warnHigh != null && value > warnHigh) return { level: "danger" };
  // Bila hanya ada sisi bawah/atas saja
  if (warnLow == null && value < okMin) return { level: "warning" };
  if (warnHigh == null && value > okMax) return { level: "warning" };
  return { level: "unknown" };
}

/**
 * Klasifikasi status dengan domain & metrik
 * @param {"kolam"|"hidroponik"|"kandang"|"cacing_sutra"|"ulat"} domain
 * @param {string} metric - contoh: "suhu" | "ph" | "oksigen" | "amonia" | "amonia_total" | "amonia_uia" | "ec" | "kelembaban" | "intensitas_cahaya"
 * @param {number} value
 * @param {object} [extras] - informasi tambahan untuk penyesuaian, misalnya:
 *   - untuk kolam: { ph, suhu } bila metric === "amonia_total" agar dihitung UIA
 *   - untuk kandang: { kelembaban } agar suhu >30 °C + RH>75% otomatis "danger"
 */
export function classify(domain, metric, value, extras = {}) {
  const group = thresholds[domain] || {};
  let def = group[metric];

  // Khusus kolam: jika user memberi TAN + pH + suhu, konversi ke UIA untuk banding akurat
  if (domain === "kolam" && metric === "amonia_total" && isNum(value) && isNum(extras?.ph) && isNum(extras?.suhu)) {
    const { NH3_mgL } = uiaFromTAN(value, extras.ph, extras.suhu, 0);
    def = group.amonia_uia;
    const base = classifyByBands(def, NH3_mgL);
    return {
      ...base,
      message: `NH₃ (UIA) ≈ ${NH3_mgL.toFixed(3)} mg/L dari TAN ${value} mg/L @ pH ${extras.ph}, ${extras.suhu}°C`,
      target: `${def.ok[0]}–${def.ok[1]} ${def.units}`,
      range: def.ok,
      units: def.units
    };
  }

  const res = classifyByBands(def, value);

  // Penyesuaian aturan gabungan (contoh: heat stress kandang)
  if (domain === "kandang" && metric === "suhu" && isNum(value) && isNum(extras?.kelembaban)) {
    if (value > 30 && extras.kelembaban >= 75) {
      res.level = "danger"; // override eskalasi
    } else if (value >= 28 && extras.kelembaban >= 70 && levelRank[res.level] < levelRank["warning"]) {
      res.level = "warning";
    }
  }

  const units = def?.units || "";
  return {
    ...res,
    message:
      res.level === "ok"
        ? "Dalam rentang optimal."
        : res.level === "warning"
        ? "Mendekati batas—perlu antisipasi."
        : res.level === "danger"
        ? "Di luar batas aman! Tindakan segera diperlukan."
        : "Data tidak memadai.",
    target: def ? `${def.ok[0]}–${def.ok[1]} ${units}` : "-",
    range: def?.ok || null,
    units
  };
}

/**
 * Helper ringkas: hanya string level ("ok"/"warning"/"danger"/"unknown")
 */
export function klass(domain, metric, value, extras) {
  return classify(domain, metric, value, extras).level;
}

// ------------------------------------------------------------
// CONTOH PEMAKAIAN (hapus bila tidak ingin):
// const s = classify("kolam", "oksigen", 4.2); // -> { level: "warning", ... }
// const k = klass("kandang", "suhu", 31, { kelembaban: 80 }); // -> "danger"
// const { NH3_mgL } = uiaFromTAN(1.2, 8.2, 28); // hitung UIA
// ------------------------------------------------------------
export default { thresholds, classify, klass, uiaFromTAN };
