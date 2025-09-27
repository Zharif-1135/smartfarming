// src/pages/Kontrol.js — full with lucide icons and responsive layout
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { db } from "../firebase";
import { onValue, ref, set, push, update } from "firebase/database";
import Header from "../components/Header";
import { thresholds, classify, uiaFromTAN } from "../utils/Threshold.js";
import { motion, AnimatePresence } from "framer-motion";
import {
  Fish,
  Sprout,
  Home,
  Bug,
  Waves,
  Droplet,
  Fan,
  Lightbulb,
  Power,
  ShieldAlert,
  Activity,
  History
} from "lucide-react";

/** ============================
 * UTIL & KONSTANTA
 * ============================ */
const now = () => Date.now();
const ms = { MIN: 60 * 1000, SEC: 1000 };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const toNum = (v) => (v === "-" || v === "" || v === null || v === undefined ? NaN : Number(v));
const normalize = (v) => (typeof v === "string" ? { state: v } : v || { state: "OFF" });

const useDebouncedRef = (delay = 600) => {
  const t = useRef(null);
  return (fn) => {
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => {
      fn();
      t.current = null;
    }, delay);
  };
};

// Cooldown per-perangkat (anti flip–flop)
const COOLDOWN = {
  aerator_kolam: 2 * ms.MIN,
  pompa_flush_kolam: 5 * ms.MIN,
  aerator_cacing: 2 * ms.MIN,
  pompa_cacing: 5 * ms.MIN,
  kipas_kandang: 2 * ms.MIN,
  lampu_kandang: 2 * ms.MIN,
  pompa_nutrisi_hidro: 3 * ms.MIN,
};

/** ============================
 * UI: Toggle, Cards, Dialog konfirmasi
 * ============================ */
function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors duration-300 shadow-inner
        ${checked ? "bg-emerald-500" : "bg-gray-300"}
        ${disabled ? "opacity-60 cursor-not-allowed" : "hover:brightness-105"}
      `}
      aria-label="toggle"
    >
      <span
        className={`inline-block h-7 w-7 transform rounded-full bg-white shadow-md transition-transform duration-300
          ${checked ? "translate-x-8" : "translate-x-1"}
        `}
      />
    </button>
  );
}

// Animated confirmation dialog (nice & cute ✨)
function useConfirm() {
  const [state, setState] = useState({ open: false, title: "", desc: "", resolve: null });
  const ask = useCallback((title, desc) => new Promise((res) => setState({ open: true, title, desc, resolve: res })), []);
  const close = (ans) => {
    if (state.resolve) state.resolve(ans);
    setState((s) => ({ ...s, open: false }));
  };
  const Dialog = (
    <AnimatePresence>
      {state.open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl border overflow-hidden"
          >
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4 text-white">
              <div className="text-lg font-semibold flex items-center gap-2">
                <Activity size={18} /> {state.title}
              </div>
              <div className="text-xs opacity-90">{state.desc}</div>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-sm text-gray-700">Lanjutkan tindakan ini?</div>
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => close(false)} className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300">
                  Tidak
                </button>
                <button onClick={() => close(true)} className="px-4 py-2 rounded-xl bg-emerald-600 text-white shadow hover:brightness-110">
                  Ya, lanjutkan
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
  return { ask, Dialog };
}

function DeviceCard({ name, dev, busy, onToggle, onLevel }) {
  const d = normalize(dev);
  const isOn = (d.state || "OFF") === "ON";
  const level = d.level ?? null;
  const online = d.ts ? now() - d.ts < 90 * ms.SEC : false;

  const base = "rounded-xl border p-4 transition-all duration-300";
  const onStyle = "bg-emerald-500 border-emerald-600 text-white shadow-lg";
  const offStyle = "bg-white border-gray-300 text-gray-800";

  const getIcon = () => {
    const nm = name.toLowerCase();
    if (nm.includes("aerator")) return <Waves size={18} />;
    if (nm.includes("pompa")) return <Droplet size={18} />;
    if (nm.includes("kipas")) return <Fan size={18} />;
    if (nm.includes("lampu")) return <Lightbulb size={18} />;
    return <Activity size={18} />;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`${base} ${isOn ? onStyle : offStyle}`}>
      <div className="flex items-start justify-between">
        <h3 className="font-semibold text-base flex items-center gap-2">
          {getIcon()}
          <span className="inline-block h-2.5 w-2.5 rounded-full shadow" style={{ background: online ? "#34d399" : "#9ca3af" }} />
          {name}
        </h3>
        <span className={`text-xs px-2 py-1 rounded flex-shrink-0 ${online ? (isOn ? "bg-white/20" : "bg-emerald-100 text-emerald-800") : "bg-gray-200 text-gray-700"}`}>
          {online ? "Online" : "Offline"}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-4">
        <Toggle checked={isOn} onChange={onToggle} disabled={busy} />
        {level !== null && (
          <div className="flex-1">
            <div className={`text-sm ${isOn ? "text-white/90" : "text-gray-700"}`}>
              Level: <strong>{level}%</strong>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={level}
              onChange={(e) => onLevel(clamp(Number(e.target.value), 0, 100))}
              className="w-full accent-emerald-600"
              disabled={busy}
            />
          </div>
        )}
      </div>

      <div className={`text-xs mt-2 ${isOn ? "text-white/80" : "text-gray-500"}`}>
        Last update: {d.ts ? new Date(d.ts).toLocaleString() : "—"}
      </div>
    </motion.div>
  );
}

function AutoBox({ label, enabled, onChange, status }) {
  const stat = status || { text: "Idle", tone: "info" };
  const toneClass =
    stat.tone === "ok" ? "bg-emerald-100 text-emerald-800" :
    stat.tone === "warn" ? "bg-yellow-100 text-yellow-800" :
    stat.tone === "danger" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700";

  return (
    <div className="rounded-xl border p-4 bg-white w-full sm:w-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h4 className="font-semibold text-base flex items-center gap-2">
            <Activity size={16} /> Mode Auto
          </h4>
          <div className="mt-1 text-xs">
            <span className={`px-2 py-0.5 rounded ${toneClass}`}>{stat.text}</span>
          </div>
        </div>
        <Toggle checked={enabled} onChange={onChange} />
      </div>
    </div>
  );
}

/** ============================
 * HALAMAN KONTROL
 * ============================ */
export default function Kontrol() {
  const [sensor, setSensor] = useState({});
  const [kontrol, setKontrol] = useState({});
  const [auto, setAuto] = useState({ kolam: false, hidro: false, kandang: false, cacing: false });
  const [busy, setBusy] = useState({});
  const [logs, setLogs] = useState([]);
  const autoStatusRef = useRef({}); // alasan auto terakhir
  const debounced = useDebouncedRef(600);
  const { ask, Dialog } = useConfirm();

  // Ambil data
  useEffect(() => {
    const u1 = onValue(ref(db, "sensor"), (s) => setSensor(s.val() || {}));
    const u2 = onValue(ref(db, "kontrol"), (s) => {
      const v = s.val() || {};
      const norm = {};
      Object.keys(v).forEach((k) => (norm[k] = normalize(v[k])));
      setKontrol(norm);
    });
    const u3 = onValue(ref(db, "kontrol_logs"), (snap) => {
      const v = snap.val() || {};
      const arr = Object.keys(v)
        .map((k) => ({ id: k, ...v[k] }))
        .sort((a, b) => b.ts - a.ts)
        .slice(0, 50);
      setLogs(arr);
    });
    const u4 = onValue(ref(db, "kontrol_auto"), (s) => setAuto({ ...{ kolam: false, hidro: false, kandang: false, cacing: false }, ...(s.val() || {}) }));
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  // Helper tulis + log
  const writeAndLog = (key, payload, by = "web") => {
    set(ref(db, `kontrol/${key}`), payload)
      .then(() => push(ref(db, "kontrol_logs"), { device: key, action: JSON.stringify(payload), by, ts: now() }))
      .catch(console.error);
  };

  const writeKontrol = async (key, payload, critical = false, by = "web") => {
    if (busy[key]) return;
    if (critical) {
      const ok = await ask("Konfirmasi Perintah", `Ubah status ${key} sekarang?`);
      if (!ok) return;
    }
    setBusy((s) => ({ ...s, [key]: true }));
    const finalPayload =
      typeof payload === "string"
        ? { state: payload, ts: now() }
        : { ...normalize(kontrol[key]), ...payload, ts: now() };

    debounced(() => {
      writeAndLog(key, finalPayload, by);
      setBusy((s) => ({ ...s, [key]: false }));
    });
  };

  const setLevel = (key, level, by = "web") =>
    writeKontrol(key, { level: clamp(level, 0, 100), state: level > 0 ? "ON" : "OFF" }, false, by);

  const canFlip = (key) => {
    const cd = COOLDOWN[key] || 2 * ms.MIN;
    const last = kontrol[key]?.ts || 0;
    return now() - last > cd;
  };

  // Tombol Global
  const emergencyOff = async () => {
    const ok = await ask("Mode Darurat", "Matikan SEMUA perangkat sekarang?");
    if (!ok) return;
    const updates = {};
    ["aerator_kolam","pompa_flush_kolam","aerator_cacing","pompa_cacing","kipas_kandang","lampu_kandang","pompa_nutrisi_hidro"].forEach((dev) => {
      updates[`kontrol/${dev}`] = { ...normalize(kontrol[dev]), state: "OFF", level: 0, ts: now() };
    });
    update(ref(db), updates).then(() => {
      push(ref(db, "kontrol_logs"), { device: "ALL", action: "EMERGENCY_OFF", by: "web", ts: now() });
    });
  };

  const powerAllOn = async () => {
    const ok = await ask("Hidupkan Semua", "Nyalakan semua perangkat dengan level default?");
    if (!ok) return;
    const updates = {};
    ["aerator_kolam","pompa_flush_kolam","aerator_cacing","pompa_cacing","kipas_kandang","lampu_kandang","pompa_nutrisi_hidro"].forEach((dev) => {
      updates[`kontrol/${dev}`] = { ...normalize(kontrol[dev]), state: "ON", level: normalize(kontrol[dev]).level ?? 70, ts: now() };
    });
    update(ref(db), updates).then(() => {
      push(ref(db, "kontrol_logs"), { device: "ALL", action: "POWER_ALL_ON", by: "web", ts: now() });
    });
  };

  const setAutoFlag = (zone, val) => {
    setAuto((s) => ({ ...s, [zone]: val }));
    update(ref(db), { [`kontrol_auto/${zone}`]: val });
    push(ref(db, "kontrol_logs"), { device: `AUTO_${zone.toUpperCase()}`, action: val ? "ON" : "OFF", by: "web", ts: now() });
  };

  /** ============================
   * LOGIKA AUTO — sepenuhnya merujuk Threshold.js
   * ============================ */
  const getOkRange = (domain, metric) => thresholds?.[domain]?.[metric]?.ok || [NaN, NaN];

  useEffect(() => {
    const tick = setInterval(() => {
      // ===== Kolam =====
      if (auto.kolam) {
        const DO = toNum(sensor?.kolam?.oksigen);
        const TAN = toNum(sensor?.kolam?.amonia); // total ammonia
        const pH = toNum(sensor?.kolam?.ph);
        const t = toNum(sensor?.kolam?.suhu);

        // Aerasi berdasarkan klasifikasi DO
        if (!Number.isNaN(DO)) {
          const clsDO = classify("kolam", "oksigen", DO);
          const isOn = (kontrol.aerator_kolam?.state || "OFF") === "ON";
          if ((clsDO.level === "warning" || clsDO.level === "danger") && !isOn && canFlip("aerator_kolam")) {
            writeKontrol("aerator_kolam", { state: "ON", level: 80 }, false, "auto");
            autoStatusRef.current.kolam = { text: "Aerasi: DO rendah → ON", tone: "warn" };
          }
          if (clsDO.level === "ok" && isOn && canFlip("aerator_kolam")) {
            writeKontrol("aerator_kolam", { state: "OFF", level: 0 }, false, "auto");
            autoStatusRef.current.kolam = { text: "Aerasi normal", tone: "ok" };
          }
        }

        // Flush kolam bila NH3 (UIA) keluar batas aman
        if (!Number.isNaN(TAN) && !Number.isNaN(pH) && !Number.isNaN(t)) {
          const { NH3_mgL } = uiaFromTAN(TAN, pH, t, 0);
          const clsNH3 = classify("kolam", "amonia_uia", NH3_mgL);
          const isOn = (kontrol.pompa_flush_kolam?.state || "OFF") === "ON";
          if ((clsNH3.level === "warning" || clsNH3.level === "danger") && !isOn && canFlip("pompa_flush_kolam")) {
            writeKontrol("pompa_flush_kolam", { state: "ON", level: 80 }, true, "auto");
            autoStatusRef.current.kolam = { text: "Flush: NH₃ tinggi → ON", tone: "danger" };
          }
          if (clsNH3.level === "ok" && isOn && canFlip("pompa_flush_kolam")) {
            writeKontrol("pompa_flush_kolam", { state: "OFF", level: 0 }, true, "auto");
          }
        }
      }

      // ===== Cacing / Ulat =====
      if (auto.cacing) {
        const DO = toNum(sensor?.cacing_sutra?.oksigen);
        const TAN = toNum(sensor?.cacing_sutra?.amonia);
        if (!Number.isNaN(DO)) {
          const cls = classify("cacing_sutra", "oksigen", DO);
          const isOn = (kontrol.aerator_cacing?.state || "OFF") === "ON";
          if ((cls.level === "warning" || cls.level === "danger") && !isOn && canFlip("aerator_cacing"))
            writeKontrol("aerator_cacing", { state: "ON", level: 70 }, false, "auto");
          if (cls.level === "ok" && isOn && canFlip("aerator_cacing"))
            writeKontrol("aerator_cacing", { state: "OFF", level: 0 }, false, "auto");
          autoStatusRef.current.cacing = cls.level === "ok" ? { text: "Aerasi Cacing normal", tone: "ok" } : { text: "Aerasi Cacing: DO rendah", tone: "warn" };
        }
        if (!Number.isNaN(TAN)) {
          const clsA = classify("cacing_sutra", "amonia_total", TAN);
          const isOn = (kontrol.pompa_cacing?.state || "OFF") === "ON";
          if ((clsA.level === "warning" || clsA.level === "danger") && !isOn && canFlip("pompa_cacing"))
            writeKontrol("pompa_cacing", { state: "ON", level: 70 }, true, "auto");
          if (clsA.level === "ok" && isOn && canFlip("pompa_cacing"))
            writeKontrol("pompa_cacing", { state: "OFF", level: 0 }, true, "auto");
          if (clsA.level !== "ok") autoStatusRef.current.cacing = { text: "Pompa Cacing: Amonia tinggi", tone: "danger" };
        }
      }

      // ===== Kandang =====
      if (auto.kandang) {
        const t = toNum(sensor?.kandang?.suhu);
        const rh = toNum(sensor?.kandang?.kelembaban);
        const lux = toNum(sensor?.kandang?.pencahayaan);

        const fanOn = (kontrol.kipas_kandang?.state || "OFF") === "ON";
        if (!Number.isNaN(t) && !Number.isNaN(rh)) {
          const clsT = classify("kandang", "suhu", t, { kelembaban: rh });
          if ((clsT.level === "warning" || clsT.level === "danger") && !fanOn && canFlip("kipas_kandang"))
            writeKontrol("kipas_kandang", { state: "ON", level: 80 }, false, "auto");
          if (clsT.level === "ok" && fanOn && canFlip("kipas_kandang"))
            writeKontrol("kipas_kandang", { state: "OFF", level: 0 }, false, "auto");
          autoStatusRef.current.kandang = clsT.level === "ok" ? { text: "Iklim kandang nyaman", tone: "ok" } : { text: "Ventilasi aktif", tone: "warn" };
        }

        const isLampOn = (kontrol.lampu_kandang?.state || "OFF") === "ON";
        if (!Number.isNaN(lux)) {
          const [lxMin, lxMax] = getOkRange("kandang", "intensitas_cahaya");
          const target = Math.round((lxMin + lxMax) / 2);
          if (lux < target - 5 && !isLampOn && canFlip("lampu_kandang"))
            writeKontrol("lampu_kandang", { state: "ON", level: 60 }, false, "auto");
          if (lux > target + 10 && isLampOn && canFlip("lampu_kandang"))
            writeKontrol("lampu_kandang", { state: "OFF", level: 0 }, false, "auto");
        }
      }

      // ===== Hidroponik =====
      if (auto.hidro) {
        const pH = toNum(sensor?.hidroponik?.ph);
        const tL = toNum(sensor?.hidroponik?.suhu);
        const isOn = (kontrol.pompa_nutrisi_hidro?.state || "OFF") === "ON";

        const clsPH = Number.isNaN(pH) ? { level: "unknown" } : classify("hidroponik", "ph", pH);
        const clsT = Number.isNaN(tL) ? { level: "unknown" } : classify("hidroponik", "suhu", tL);

        if (([clsPH.level, clsT.level].some((lv) => lv === "warning" || lv === "danger")) && !isOn && canFlip("pompa_nutrisi_hidro"))
          writeKontrol("pompa_nutrisi_hidro", { state: "ON", level: 70 }, false, "auto");
        if (clsPH.level === "ok" && clsT.level === "ok" && isOn && canFlip("pompa_nutrisi_hidro"))
          writeKontrol("pompa_nutrisi_hidro", { state: "OFF", level: 0 }, false, "auto");

        autoStatusRef.current.hidro = (clsPH.level === "ok" && clsT.level === "ok")
          ? { text: "Hidro stabil", tone: "ok" }
          : { text: "Sirkulasi aktif (penyesuaian pH/suhu)", tone: "warn" };
      }
    }, 4000);

    return () => clearInterval(tick);
  }, [auto, sensor, kontrol]);

  // Status Auto untuk UI
  const autoStatus = useMemo(
    () => ({
      kolam: autoStatusRef.current.kolam || { text: "Idle", tone: "info" },
      hidro: autoStatusRef.current.hidro || { text: "Idle", tone: "info" },
      kandang: autoStatusRef.current.kandang || { text: "Idle", tone: "info" },
      cacing: autoStatusRef.current.cacing || { text: "Idle", tone: "info" },
    }),
    [sensor, kontrol, auto]
  );

  // Status per ZONA (badge) — pakai classify agar konsisten
  const zoneBadge = (tone) =>
    tone === "ok" ? "bg-emerald-100 text-emerald-800" :
    tone === "warn" ? "bg-yellow-100 text-yellow-800" :
    tone === "danger" ? "bg-red-100 text-red-700" :
    "bg-gray-100 text-gray-700";

  const zoneStatus = {
    kolam: (() => {
      const DO = toNum(sensor?.kolam?.oksigen);
      const TAN = toNum(sensor?.kolam?.amonia);
      const ph = toNum(sensor?.kolam?.ph);
      const t = toNum(sensor?.kolam?.suhu);
      if (!Number.isNaN(TAN) && !Number.isNaN(ph) && !Number.isNaN(t)) {
        const { NH3_mgL } = uiaFromTAN(TAN, ph, t, 0);
        const c = classify("kolam", "amonia_uia", NH3_mgL);
        if (c.level === "danger") return { text: "Amonia tinggi", tone: "danger" };
        if (c.level === "warning") return { text: "Amonia waspada", tone: "warn" };
      }
      if (!Number.isNaN(DO)) {
        const c = classify("kolam", "oksigen", DO);
        if (c.level === "warning") return { text: "DO rendah", tone: "warn" };
        if (c.level === "danger") return { text: "DO kritis", tone: "danger" };
      }
      return { text: "Normal", tone: "ok" };
    })(),
    hidro: (() => {
      const pH = toNum(sensor?.hidroponik?.ph);
      const tL = toNum(sensor?.hidroponik?.suhu);
      const cpH = Number.isNaN(pH) ? { level: "unknown" } : classify("hidroponik", "ph", pH);
      const cT = Number.isNaN(tL) ? { level: "unknown" } : classify("hidroponik", "suhu", tL);
      if (cpH.level === "danger" || cT.level === "danger") return { text: "Di luar rentang", tone: "danger" };
      if (cpH.level === "warning" || cT.level === "warning") return { text: "Perlu penyesuaian", tone: "warn" };
      return { text: "Normal", tone: "ok" };
    })(),
    kandang: (() => {
      const t = toNum(sensor?.kandang?.suhu);
      const rh = toNum(sensor?.kandang?.kelembaban);
      if (!Number.isNaN(t)) {
        const c = classify("kandang", "suhu", t, { kelembaban: rh });
        if (c.level === "danger") return { text: "Panas/lembap tinggi", tone: "danger" };
        if (c.level === "warning") return { text: "Perlu ventilasi", tone: "warn" };
      }
      return { text: "Nyaman", tone: "ok" };
    })(),
    cacing: (() => {
      const DO = toNum(sensor?.cacing_sutra?.oksigen);
      const TAN = toNum(sensor?.cacing_sutra?.amonia);
      if (!Number.isNaN(TAN)) {
        const c = classify("cacing_sutra", "amonia_total", TAN);
        if (c.level === "danger") return { text: "Amonia tinggi", tone: "danger" };
        if (c.level === "warning") return { text: "Amonia waspada", tone: "warn" };
      }
      if (!Number.isNaN(DO)) {
        const c = classify("cacing_sutra", "oksigen", DO);
        if (c.level === "warning") return { text: "DO rendah", tone: "warn" };
        if (c.level === "danger") return { text: "DO kritis", tone: "danger" };
      }
      return { text: "Stabil", tone: "ok" };
    })(),
  };

  // List perangkat per zona
  const ZONE_DEVICES = {
    "Kolam Ikan": [
      { key: "aerator_kolam", name: "Aerator Kolam" },
      { key: "pompa_flush_kolam", name: "Pompa Flush Kolam", critical: true },
    ],
    "Hidroponik": [
      { key: "pompa_nutrisi_hidro", name: "Pompa Nutrisi Hidroponik" },
    ],
    "Kandang": [
      { key: "kipas_kandang", name: "Kipas Kandang" },
      { key: "lampu_kandang", name: "Lampu Kandang" },
    ],
    "Cacing Sutra": [
      { key: "aerator_cacing", name: "Aerator Cacing/Ulat" },
      { key: "pompa_cacing", name: "Pompa Cacing/Ulat", critical: true },
    ],
  };

  const renderZone = (zoneName, zoneKey) => {
    const zStatus = zoneStatus[zoneKey];
    const badgeCls = zoneBadge(zStatus.tone);
    const autoKey = zoneKey; // kolam/hidro/kandang/cacing

    const zoneIcon = {
      kolam: <Fish size={20} className="text-blue-500" />,
      hidro: <Sprout size={20} className="text-green-500" />,
      kandang: <Home size={20} className="text-amber-500" />,
      cacing: <Bug size={20} className="text-red-500" />,
    }[zoneKey];

    return (
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-lg font-bold flex items-center gap-2">
              {zoneIcon}
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {zoneName}
            </h2>
            <div className="mt-1 text-xs">
              <span className={`px-2 py-0.5 rounded ${badgeCls}`}>{zStatus.text}</span>
            </div>
          </div>
          <AutoBox
            enabled={!!auto[autoKey]}
            onChange={(v) => setAutoFlag(autoKey, v)}
            status={autoStatus[autoKey]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {ZONE_DEVICES[zoneName].map(({ key, name, critical }) => (
            <DeviceCard
              key={key}
              name={name}
              dev={kontrol[key]}
              busy={!!busy[key]}
              onToggle={async () => {
                const isOn = (normalize(kontrol[key]).state || "OFF") === "ON";
                if (critical) {
                  const ok = await ask("Konfirmasi Perangkat Kritis", `${name}: pastikan pergantian aman.`);
                  if (!ok) return;
                }
                writeKontrol(
                  key,
                  { state: isOn ? "OFF" : "ON", level: normalize(kontrol[key]).level ?? (isOn ? 0 : 70) },
                  false
                );
              }}
              onLevel={(v) => setLevel(key, v)}
            />
          ))}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Header />

      {/* Header + Aksi Global */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent flex items-center gap-2">
            <Power /> Kontrol Perangkat — SmartFarming
          </h1>
          <p className="text-sm text-gray-600 mt-1">Kontrol manual & otomatis per zona.</p>
        </div>
        <div className="flex items-stretch sm:items-center gap-2 flex-col sm:flex-row">
          <button onClick={powerAllOn} className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 text-white shadow hover:brightness-110 flex items-center justify-center gap-2">
            <Power size={16} /> Hidupkan Semua
          </button>
          <button onClick={emergencyOff} className="w-full sm:w-auto px-4 py-2 rounded-xl bg-red-600 text-white shadow hover:brightness-110 flex items-center justify-center gap-2">
            <ShieldAlert size={16} /> Mode Darurat
          </button>
        </div>
      </div>

      {/* ZONA */}
      <div className="grid grid-cols-1 gap-6">
        {renderZone("Kolam Ikan", "kolam")}
        {renderZone("Hidroponik", "hidro")}
        {renderZone("Kandang", "kandang")}
        {renderZone("Cacing Sutra", "cacing")}
      </div>

      {/* LOG */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
          <History /> Riwayat Perintah
        </h3>
        <div className="max-h-80 overflow-y-auto space-y-2 pr-2">
          {logs.map((l) => {
            let actionText = l.action;
            let state, level;

            try {
              const act = JSON.parse(l.action);
              state = act.state;
              level = act.level;
            } catch (e) {
              // fallback kalau bukan JSON
              state = l.action;
            }

            return (
              <motion.div
                key={l.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-2.5 border rounded-lg flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2"
              >
                <div>
                  <div className="font-medium flex items-center flex-wrap gap-x-2">
                    <Activity size={14}/> <span>{l.device}</span> —{" "}
                    <span className={state === "ON" ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                      {state}
                    </span>
                    {level !== undefined && (
                      <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">
                        Level {level}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-600 sm:text-right flex-shrink-0">
                  {new Date(l.ts).toLocaleString("id-ID")} oleh <strong>{l.by}</strong>
                </div>
              </motion.div>
            );
          })}
          {logs.length === 0 && <div className="text-sm text-gray-500 text-center py-4">Belum ada perintah</div>}
        </div>
      </div>

      {/* Global Confirmation Dialog */}
      {Dialog}
    </div>
  );
}