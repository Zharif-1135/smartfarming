// src/pages/Dashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { ref, onValue, set } from "firebase/database";
import { db } from "../firebase";
import Header from "../components/Header";
import { classify } from "../utils/Threshold";
import { motion } from "framer-motion";
import {
  Fish,
  Sprout,
  Home,
  Bug,
  Activity,
  Thermometer,
  Droplet,
  Gauge,
  Wind,
  Sun,
  Cloud,
  CloudRain,
  CloudSun,
  AlertTriangle,
  CheckCircle2,
  Wifi,
  WifiOff,
  Clock,
  ArrowUpRight,
  Waves,
} from "lucide-react";

// ===================== KONFIGURASI OPENWEATHERMAP ======================
// Menggunakan API Gratis (data/2.5)
const OWM_API_KEY = "7efe5acf39a055f8b27dc5055208cc3b";
const OWM_LAT = 5.18;
const OWM_LON = 97.15;

// Helper arah angin (derajat -> kompas)
const toCompass = (deg) => {
  if (!Number.isFinite(deg)) return "-";
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const idx = Math.round(deg / 22.5) % 16;
  return dirs[idx];
};

// (Fungsi uviToText tidak lagi digunakan karena UV Index tidak ada di plan free)

export default function Dashboard() {
  const [data, setData] = useState({
    hidroponik: { suhu: "-", ph: "-", kelembaban: "-", intensitas_cahaya: "-", aliran_nutrisi: "-" },
    kandang: { suhu: "-", kelembaban: "-", amonia: "-", kualitas_udara: "-", pencahayaan: "-" },
    kolam: { suhu: "-", ph: "-", oksigen: "-", amonia: "-" },
    ulat: { suhu: "-", ph: "-", oksigen: "-", amonia: "-", kelembaban: "-", intensitas_cahaya: "-" },
  });

  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [alerts, setAlerts] = useState([]);

  // =============== CUACA (OpenWeatherMap – API Gratis /data/2.5) ===============
  const [wxNow, setWxNow] = useState(null);
  const [wxDaily, setWxDaily] = useState(null);
  const [wxLoading, setWxLoading] = useState(true);

  useEffect(() => {
    let canceled = false;
    async function loadWeather() {
      try {
        setWxLoading(true);
        
        // PANGGILAN 1: Current Weather (untuk wxNow)
        // Menggunakan endpoint /data/2.5/weather
        const nowRes = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${OWM_LAT}&lon=${OWM_LON}&appid=${OWM_API_KEY}&units=metric&lang=id`
        );
        const now = await nowRes.json();
        if (now.cod !== 200) throw new Error(now.message || 'Gagal mengambil data cuaca saat ini');

        // PANGGILAN 2: 5-Day/3-Hour Forecast (untuk wxDaily)
        // Menggunakan endpoint /data/2.5/forecast
        const d1Res = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${OWM_LAT}&lon=${OWM_LON}&appid=${OWM_API_KEY}&units=metric&lang=id`
        );
        const d1 = await d1Res.json();
        if (d1.cod !== "200") throw new Error(d1.message || 'Gagal mengambil data prakiraan');

        if (!canceled) {
          // 'now' adalah objek utuh dari /weather
          setWxNow(now); 
          // 'd1.list[0]' adalah prakiraan 3 jam ke depan
          setWxDaily(d1?.list?.[0] || null); 
        }
      } catch (e) {
        console.error("Gagal ambil data cuaca:", e);
      } finally {
        if (!canceled) setWxLoading(false);
      }
    }
    if (OWM_API_KEY && OWM_LAT && OWM_LON) loadWeather();
    return () => {
      canceled = true;
    };
  }, []);

  // ===================== SENSOR REALTIME & HISTORY =====================
  useEffect(() => {
    // ... (FungSI ini tidak diubah) ...
    const sensorRef = ref(db, "sensor");
    const unsub = onValue(sensorRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setData(val);
        const ts = Date.now();
        setLastUpdate(ts);

        // simpan data harian (ringan)
        const today = new Date().toISOString().split("T")[0];
        const historyRef = ref(db, `history/${today}`);
        set(historyRef, val);

        // hitung peringatan
        const newAlerts = generateAlerts(val, ts);
        setAlerts(newAlerts.slice(0, 10));
      } else {
        setAlerts([
          {
            id: "no-data",
            severity: "danger",
            title: "Data sensor tidak ditemukan",
            detail:
              "Tidak ada data sensor di database. Periksa koneksi perangkat atau path 'sensor'.",
          },
        ]);
      }
    });

    return () => unsub();
  }, []);

  // ========================= UTIL & STATUS ============================
  // ... (Fungsi toNum, getStatus, generateAlerts, overallSeverity, getSystemStatusBoxes tidak diubah) ...
  const toNum = (v) => {
    if (v === "-" || v === null || v === undefined || v === "") return NaN;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : NaN;
  };

  const getStatus = (domain, metric, value, extras = {}, lastUpdateTime = lastUpdate) => {
    const isMati =
      Date.now() - lastUpdateTime > 60000 ||
      value === "-" ||
      value === null ||
      value === undefined ||
      Number.isNaN(toNum(value));
    if (isMati) {
      return { label: "Mati", color: "bg-gray-500", bg: "bg-gray-100", severity: "danger" };
    }

    const res = classify(domain, metric, toNum(value), extras);
    const map = {
      ok: { label: "Optimal", color: "bg-green-500", bg: "bg-green-50", severity: "info" },
      warning: { label: "Waspada", color: "bg-yellow-500", bg: "bg-yellow-50", severity: "warning" },
      danger: { label: "Bahaya", color: "bg-red-500", bg: "bg-red-50", severity: "danger" },
      unknown: { label: "–", color: "bg-gray-400", bg: "bg-white", severity: "info" },
    };
    return map[res.level] || map.unknown;
  };

  function generateAlerts(val, nowTime) {
    const list = [];
    
    const domainDisplayNames = {
      kolam: "Kolam Ikan",
      hidroponik: "Hidroponik",
      kandang: "Kandang",
      ulat: "Cacing Sutra", 
    };

    const pushAlert = (id, severity, title, detail) => {
      list.push({ id, severity, title, detail });
    };

    const sections = ["kolam", "hidroponik", "kandang", "ulat"];
    sections.forEach((s) => {
      if (!val[s]) {
        const displayName = domainDisplayNames[s] || capitalize(s);
        pushAlert(
          `${s}-missing`,
          "danger",
          `${displayName}: data tidak tersedia`,
          `Path sensor "${s}" tidak ditemukan atau offline.`
        );
      }
    });

    const checkParam = (domain, metric, raw, extras = {}) => {
      const num = toNum(raw);
      if (Number.isNaN(num)) return;
      const res = classify(domain, metric, num, extras);
      if (res.level !== "ok") {
        const displayName = domainDisplayNames[domain] || capitalize(domain);
        pushAlert(
          `${domain}-${metric}`,
          res.level,
          `${displayName}: ${metric.replace(/_/g, " ")} tidak optimal`,
          res.message
        );
      }
    };

    checkParam("kolam", "suhu", val.kolam?.suhu);
    checkParam("kolam", "ph", val.kolam?.ph);
    checkParam("kolam", "oksigen", val.kolam?.oksigen);
    checkParam("kolam", "amonia_total", val.kolam?.amonia, {
      ph: val.kolam?.ph,
      suhu: val.kolam?.suhu,
    });
    checkParam("ulat", "suhu", val.ulat?.suhu);
    checkParam("ulat", "ph", val.ulat?.ph);
    checkParam("ulat", "oksigen", val.ulat?.oksigen);
    checkParam("ulat", "amonia_total", val.ulat?.amonia);
    checkParam("kandang", "suhu", val.kandang?.suhu, {
      kelembaban: toNum(val.kandang?.kelembaban),
    });
    checkParam("kandang", "kelembaban", val.kandang?.kelembaban);
    checkParam("kandang", "amonia", val.kandang?.kualitas_udara);
    checkParam("kandang", "intensitas_cahaya", val.kandang?.pencahayaan);
    checkParam("hidroponik", "ph", val.hidroponik?.ph);
    checkParam("hidroponik", "suhu", val.hidroponik?.suhu);
    checkParam("hidroponik", "kelembaban", val.hidroponik?.kelembaban);
    checkParam("hidroponik", "intensitas_cahaya", val.hidroponik?.intensitas_cahaya);
    checkParam("hidroponik", "ec", val.hidroponik?.aliran_nutrisi);
    if (Date.now() - nowTime > 60000) {
      pushAlert(
        "data-stale",
        "danger",
        "Data tidak up-to-date",
        "Tidak menerima data baru dalam 60 detik. Periksa koneksi."
      );
    }
    if (list.length === 0) {
      list.push({
        id: "ok",
        severity: "info",
        title: "Semua parameter normal",
        detail: "Tidak ditemukan anomali. Sistem bekerja normal.",
      });
    }
    return list;
  }

  const overallSeverity = (alertsArr) => {
    if (!alertsArr || alertsArr.length === 0) return "info";
    if (alertsArr.some((a) => a.severity === "danger")) return "danger";
    if (alertsArr.some((a) => a.severity === "warning")) return "warning";
    return "info";
  };

  const getSystemStatusBoxes = (alertsList) => {
    const sections = [
      { id: "kolam", label: "Kolam Ikan", data: data.kolam },
      { id: "hidroponik", label: "Hidroponik", data: data.hidroponik },
      { id: "kandang", label: "Kandang", data: data.kandang },
      { id: "ulat", label: "Cacing Sutra", data: data.ulat }
    ];
    const inactiveSections = [];
    sections.forEach((section) => {
      const sectionData = section.data;
      let isActive = false;
      if (sectionData) {
        const values = Object.values(sectionData);
        isActive = values.some(value => 
          value !== "-" && 
          value !== null && 
          value !== undefined && 
          value !== ""
        );
      }
      const hasMissingAlert = (alertsList || []).some(alert => 
        alert.id === `${section.id}-missing`
      );
      if (!isActive || hasMissingAlert) {
        inactiveSections.push({
          id: section.id,
          label: section.label,
          severity: "danger"
        });
      }
    });
    if (inactiveSections.length > 0) {
      return inactiveSections.slice(0, 4);
    }
    return [{ 
      id: "all-ok", 
      label: "Semua sistem online", 
      severity: "info" 
    }];
  };


  // ========================= UI COMPONENTS ============================
  // ... (Komponen Badge, CategoryCard, PeringatanTerbaru tidak diubah) ...
  const Badge = ({ severity, children }) => {
    const map = {
      danger: "bg-red-500 text-white",
      warning: "bg-yellow-500 text-white",
      info: "bg-emerald-600 text-white",
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${map[severity] || ""}`}>
        {children}
      </span>
    );
  };

  const CategoryCard = ({ title, items, status, icon: Icon }) => (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      whileHover={{ y: -2 }}
      className={`relative overflow-hidden rounded-2xl border shadow-sm ${status.bg}`}
    >
      <div className="absolute -right-6 -top-6 opacity-10">
        <Icon className="w-24 h-24" />
      </div>
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-emerald-700" />
            <h2 className="font-bold text-lg">{title}</h2>
          </div>
          <Badge severity={status.severity}>{status.label}</Badge>
        </div>

        <div className="text-sm w-full mt-1 divide-y divide-gray-200/70 bg-white/60 rounded-xl border">
          {items.map((item, index) => (
            <div key={index} className="flex justify-between items-center py-2 px-3">
              <div className="flex items-center gap-2 text-gray-700">
                {item.icon}
                <span>{item.label}</span>
              </div>
              <div className="font-semibold">
                {item.value} {item.unit}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );

  const PeringatanTerbaru = ({ alertsList }) => {
    const sev = overallSeverity(alertsList);
    const styleMap = {
      danger: "bg-red-50 border-red-400 text-red-800",
      warning: "bg-yellow-50 border-yellow-400 text-yellow-800",
      info: "bg-emerald-50 border-emerald-400 text-emerald-800",
    };
    const MAX = 10;
    const toShow = (alertsList || []).slice(0, MAX);
    const hiddenCount = Math.max(0, (alertsList?.length || 0) - MAX);

    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`w-full p-4 rounded-2xl border ${styleMap[sev]}`}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {sev === "danger" ? (
              <AlertTriangle className="w-5 h-5" />
            ) : sev === "warning" ? (
              <CloudSun className="w-5 h-5" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
            <h2 className="font-bold text-lg">Peringatan Terbaru</h2>
          </div>
          <Badge severity={sev}>{sev.toUpperCase()}</Badge>
        </div>

        <div className="mt-4 grid gap-2 max-h-72 overflow-y-auto">
          {toShow.map((a) => (
            <div
              key={a.id}
              className="p-3 rounded-xl border bg-white/70 flex items-start justify-between"
            >
              <div>
                <div className="font-semibold">{a.title}</div>
                <div className="text-xs text-gray-700 mt-1">{a.detail}</div>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded font-semibold ${
                  a.severity === "danger"
                    ? "bg-red-100 text-red-700"
                    : a.severity === "warning"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {a.severity.toUpperCase()}
              </span>
            </div>
          ))}
          {hiddenCount > 0 && (
            <div className="text-center text-sm text-gray-600 py-2">
              +{hiddenCount} peringatan lainnya…
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  // ========================= STATUS DOMAIN ============================
  // ... (Bagian ini tidak diubah) ...
  const kolamStatus = getStatus("kolam", "suhu", data.kolam.suhu);
  const hidroStatus = getStatus("hidroponik", "suhu", data.hidroponik.suhu);
  const kandangStatus = getStatus("kandang", "suhu", data.kandang.suhu, {
    kelembaban: toNum(data.kandang.kelembaban),
  });
  const ulatStatus = getStatus("ulat", "suhu", data.ulat.suhu);
  const systemBoxes = getSystemStatusBoxes(alerts);
  const timeAgo = useMemo(() => {
    const diff = Date.now() - lastUpdate;
    if (diff < 1500) return "baru saja";
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s} dtk lalu`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m} mnt lalu`;
    const h = Math.floor(m / 60);
    return `${h} jam lalu`;
  }, [lastUpdate]);

  // ========================= WEATHER VIEW (detailed) ==================
  // ===== DIUBAH UNTUK API GRATIS (/weather & /forecast) =====
  const WeatherDetail = () => {
    const now = wxNow; // OWM 'weather' object
    const d1 = wxDaily; // OWM 'forecast.list[0]' object

    // Mapping data OWM dari /weather
    // OWM wind_speed -> m/s, konversi ke km/j ( * 3.6)
    const windSp = now?.wind?.speed * 3.6;
    const windDir = now?.wind?.deg;
    // OWM wind_gust -> m/s, konversi ke km/j ( * 3.6)
    const gust = now?.wind?.gust * 3.6;
    const humid = now?.main?.humidity;
    const temp = now?.main?.temp;
    const realFeel = now?.main?.feels_like;
    // OWM visibility -> meters, konversi ke km ( / 1000)
    const vis = now?.visibility / 1000;
    const cloudCover = now?.clouds?.all;
    const pressure = now?.main?.pressure; // OWM hPa == mb
    
    // Mapping data OWM dari /forecast (list[0])
    // OWM pop (prob. of precipitation) -> 0..1, konversi ke % ( * 100)
    const rainProb = d1?.pop * 100;
    
    // OWM (dt) adalah UNIX timestamp, konversi ke Date
    const obsTime = now?.dt ? new Date(now.dt * 1000) : null;
    
    // Frasa cuaca dari list[0]
    const d1Phrase = d1?.weather?.[0]?.description || "-";

    return (
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border bg-white/80 p-4 shadow-sm"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sun className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold">Kondisi Cuaca Lengkap</h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Clock className="w-4 h-4" />
            {obsTime ? obsTime.toLocaleString() : "–"}
          </div>
        </div>

        {/* Data yang tersedia di plan FREE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <MetricRow icon={<Thermometer className="w-4 h-4" />} label="Suhu" value={fmt(temp, "°C")} />
          <MetricRow icon={<Thermometer className="w-4 h-4" />} label="Suhu Seperti" value={fmt(realFeel, "°C")} />
          <MetricRow icon={<Droplet className="w-4 h-4" />} label="Kelembaban" value={fmt(humid, "%")} />
          <MetricRow icon={<Wind className="w-4 h-4" />} label="Angin" value={`${fmt(windSp, "km/j")}, ${toCompass(windDir)}`} />
          {Number.isFinite(gust) && gust > 0 && (
            <MetricRow icon={<Wind className="w-4 h-4" />} label="Tiupan" value={fmt(gust, "km/j")} />
          )}
          <MetricRow icon={<Cloud className="w-4 h-4" />} label="Tutupan Awan" value={fmt(cloudCover, "%")} />
          <MetricRow icon={<Gauge className="w-4 h-4" />} label="Tekanan" value={fmt(pressure, "mb")} />
          <MetricRow icon={<Activity className="w-4 h-4" />} label="Visibilitas" value={fmt(vis, "km")} />
          <MetricRow icon={<CloudRain className="w-4 h-4" />} label="Prob. Presipitasi" value={fmt(rainProb, "%")} />
          
          {/* Data ini tidak ada di plan free, jadi kita tampilkan N/A */}
          <MetricRow icon={<Sun className="w-4 h-4 text-gray-400" />} label="UV Index" value={"N/A (Paid)"} />
          <MetricRow icon={<Droplet className="w-4 h-4 text-gray-400" />} label="Titik Embun" value={"N/A (Paid)"} />
        </div>

        {d1 && (
          <div className="mt-3 text-xs text-gray-700">
            <div className="flex items-center gap-2">
              <CloudSun className="w-4 h-4 text-sky-500" />
              <span>
                Prakiraan (3 Jam): {capitalize(d1Phrase)}
              </span>
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  const MetricRow = ({ icon, label, value }) => (
    // ... (Komponen ini tidak diubah)
    <div className="flex items-center justify-between rounded-lg border bg-white/60 px-3 py-2">
      <div className="flex items-center gap-2 text-gray-700">
        {icon}
        <span>{label}</span>
      </div>
      <span className="font-semibold">{value}</span>
    </div>
  );
  
  const fmt = (v, unit) => (Number.isFinite(v) ? `${v.toFixed?.(1)} ${unit}` : "-");

  // =============================== RENDER ==============================
  return (
    // ... (Bagian Render JSX tidak diubah)
    <div className="flex flex-col w-full">
      <Header />

      {/* Header Top */}
      <div className="px-6 pt-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-100">
              <Activity className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Dashboard Smart Farming</h1>
              <div className="text-sm text-gray-600">
                Pemantauan real-time – <span className="inline-flex items-center gap-1">
                  <Clock className="w-4 h-4" /> diperbarui {timeAgo}
                </span>
              </div>
            </div>
          </div>

          {/* System status bar */}
          <div className="flex items-center gap-2 flex-wrap justify-start md:justify-end">
            {systemBoxes.map((b) => {
              const map = {
                danger: "bg-red-500 text-white",
                warning: "bg-yellow-500 text-white",
                info: "bg-emerald-600 text-white",
              };
              return (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`${map[b.severity]} px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 shadow`}
                >
                  {b.severity === "danger" ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
                  {b.label}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5 p-6">
        {/* Kartu Domain */}
        <div className="xl:col-span-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <CategoryCard
            title="Kolam Ikan"
            icon={Fish}
            items={[
              { label: "Suhu", value: data.kolam.suhu, unit: "°C", icon: <Thermometer className="w-4 h-4 text-emerald-700" /> },
              { label: "pH", value: data.kolam.ph, unit: "", icon: <Gauge className="w-4 h-4 text-emerald-700" /> },
              { label: "Oksigen", value: data.kolam.oksigen, unit: "mg/L", icon: <Waves className="w-4 h-4 text-emerald-700" /> },
            ]}
            status={kolamStatus}
          />
          <CategoryCard
            title="Hidroponik"
            icon={Sprout}
            items={[
              { label: "Suhu", value: data.hidroponik.suhu, unit: "°C", icon: <Thermometer className="w-4 h-4 text-emerald-700" /> },
              { label: "pH", value: data.hidroponik.ph, unit: "", icon: <Gauge className="w-4 h-4 text-emerald-700" /> },
              { label: "intensitas Cahaya", value: data.hidroponik.intensitas_cahaya, unit: "", icon: <Gauge className="w-4 h-4 text-emerald-700" /> }
            ]}
            status={hidroStatus}
          />
          <CategoryCard
            title="Kandang"
            icon={Home}
            items={[
              { label: "Suhu", value: data.kandang.suhu, unit: "°C", icon: <Thermometer className="w-4 h-4 text-emerald-700" /> },
              { label: "Kelembaban", value: data.kandang.kelembaban, unit: "%", icon: <Droplet className="w-4 h-4 text-emerald-700" /> },
              { label: "Amonia", value: data.kandang.kualitas_udara, unit: "ppm", icon: <AlertTriangle className="w-4 h-4 text-emerald-700" /> },
            ]}
            status={kandangStatus}
          />
          <CategoryCard
            title="Cacing Sutra"
            icon={Bug}
            items={[
              { label: "Suhu", value: data.ulat.suhu, unit: "°C", icon: <Thermometer className="w-4 h-4 text-emerald-700" /> },
              { label: "Kelembaban", value: data.ulat.kelembaban, unit: "%", icon: <Droplet className="w-4 h-4 text-emerald-700" /> },
              { label: "Intensitas Cahaya", value: data.ulat.intensitas_cahaya, unit: "lux", icon: <Sun className="w-4 h-4 text-emerald-700" /> },
            ]}
            status={ulatStatus}
          />
        </div>

        {/* Kondisi Cuaca Lengkap */}
        <div className="flex flex-col gap-4">
          {/* Detail lengkap */}
          {!wxLoading && (wxNow || wxDaily) ? (
            <WeatherDetail />
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl border bg-white/70 p-4 text-sm text-gray-600"
            >
              Memuat detail cuaca…
            </motion.div>
          )}
        </div>
      </div>

      {/* Alerts */}
      <div className="px-6 pb-8">
        <PeringatanTerbaru alertsList={alerts} />
      </div>
    </div>
  );
}

function capitalize(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}