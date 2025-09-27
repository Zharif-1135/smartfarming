import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { 
  CloudSun, Fish, Bug, Home, Sprout, Activity, Thermometer, 
  AlertCircle, CheckCircle2, CloudRain, Wind, Droplets, Sun 
} from "lucide-react";
import Header from "../components/Header";
import { classify, thresholds } from "../utils/Threshold";
import { getHistory, getTomorrowWeather, predictNext, estimateHarvestDays } from "../components/Prediksi";

// Konfigurasi domain dipindahkan ke luar komponen agar lebih efisien
const DOMAIN_CONFIG = {
  kolam: { 
    name: "Kolam Ikan", 
    icon: Fish,
    metrics: [
      { metric: "suhu", unit: "°C" }, { metric: "ph", unit: "pH" },
      { metric: "oksigen", unit: "mg/L" }, { metric: "amonia_total", unit: thresholds.kolam.amonia_total.units },
    ],
  },
  ulat: {
    name: "Cacing Sutra",
    icon: Bug,
    metrics: [
      { metric: "suhu", unit: "°C" }, { metric: "ph", unit: "pH" },
      { metric: "oksigen", unit: "mg/L" }, { metric: "amonia", unit: "mg/L TAN" },
    ],
  },
  kandang: {
    name: "Kandang",
    icon: Home,
    metrics: [
      { metric: "suhu", unit: "°C" }, { metric: "kelembaban", unit: "%RH" },
      { metric: "amonia", unit: "ppm" }, { metric: "intensitas_cahaya", key: "pencahayaan", unit: "lux" },
    ],
  },
  hidroponik: {
    name: "Hidroponik",
    icon: Sprout,
    metrics: [
      { metric: "ph", unit: "pH" }, { metric: "suhu", unit: "°C" },
      { metric: "kelembaban", unit: "%RH" }, { metric: "intensitas_cahaya", unit: "lux" },
      { metric: "ec", key: "aliran_nutrisi", unit: "mS/cm" },
    ],
  },
};

// Komponen kecil untuk baris statistik
function StatRow({ label, value, unit, icon: Icon }) {
    return (
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-gray-700">
            {Icon && <Icon className="w-4 h-4" />}
            <span>{label}</span>
        </div>
        <span className="font-semibold text-gray-900">
          {value !== undefined && value !== null ? `${value} ${unit}` : "-"}
        </span>
      </div>
    );
}

// Komponen Kartu Prediksi
function PredCard({ title, icon: Icon, rows, statusLevel }) {
  const statusStyles = {
    ok: "border-green-400 bg-green-50",
    warning: "border-yellow-400 bg-yellow-50",
    unknown: "border-red-400 bg-red-50",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.02 }}
      className={`rounded-2xl p-4 shadow-md border ${statusStyles[statusLevel] || statusStyles.unknown} transition-all`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-5 h-5 text-emerald-600" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="space-y-3">{rows}</div>
    </motion.div>
  );
}


// === KOMPONEN UTAMA HALAMAN PREDIKSI (FINAL) ===
export default function Prediksi() {
  const [tomorrow, setTomorrow] = useState(null);
  const [pred, setPred] = useState({});
  const [harvest, setHarvest] = useState({});
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    
    const runPredictions = async () => {
      setLoading(true);
      
      const [hist, weather] = await Promise.all([getHistory(), getTomorrowWeather()]);
      if (!mounted.current) return;

      setTomorrow(weather);
      
      // ===== PERBAIKAN UTAMA ADA DI BARIS INI =====
      // Menggunakan `weather.suhuAvg` yang benar, bukan `weather.suhu`
      const exo = hist.map(() => [weather.suhuAvg, weather.kelembaban, weather.cloud, weather.wind]);
      
      const out = {};
      
      for (const [domain, config] of Object.entries(DOMAIN_CONFIG)) {
        out[domain] = {};
        for (const it of config.metrics) {
          const key = it.key || it.metric;
          const series = hist.map(d => d?.[domain]?.[key]).filter(x => Number.isFinite(x));
          const useExo = /suhu|kelembaban/i.test(it.metric) ? exo : null;
          out[domain][it.metric] = await predictNext(domain, it.metric, series, useExo, weather);
        }
      }

      const recent = hist.slice(-30);
      const h = Object.keys(DOMAIN_CONFIG).reduce((acc, domain) => {
        acc[domain] = estimateHarvestDays(domain, recent);
        return acc;
      }, {});
      
      if (!mounted.current) return;
      setPred(out);
      setHarvest(h);
      setLoading(false);
    };
    
    runPredictions();
    
    return () => {
      mounted.current = false;
    };
  }, []);

  const renderDomain = useCallback((domain, config) => {
    const domainPreds = pred?.[domain] || {};
    let hasWarning = false, hasUnknown = false;
    
    const rows = config.metrics.map(({ metric }) => {
      const p = domainPreds[metric];
      const v = p?.value;
      const extras = (domain === "kandang" && metric === "suhu") ? { kelembaban: pred?.kandang?.kelembaban?.value } : {};
      const cls = Number.isFinite(v) ? classify(domain, metric, v, extras) : { level: "unknown", units: "", message: "Data tidak cukup untuk prediksi." };

      if (cls.level === "warning") hasWarning = true;
      if (cls.level === "unknown") hasUnknown = true;
      
      const color = cls.level === "ok" ? "text-green-600" : "text-red-600";
      const Icon = cls.level === "ok" ? CheckCircle2 : AlertCircle;

      return (
        <div key={metric} className="space-y-1">
          <div className="text-xs text-gray-600 flex items-center gap-1">
            <Icon className={`w-4 h-4 ${color}`} /> {metric.replace(/_/g, " ").toUpperCase()}
          </div>
          <div className="flex items-center justify-between text-sm p-2 rounded border bg-white/70">
            <span className="text-gray-700">Prediksi esok</span>
            <span className={`font-semibold ${color}`}>{Number.isFinite(v) ? v.toFixed(2) : "-"} {cls.units || ""}</span>
          </div>
          <div className={`text-xs italic ${color}`}>Status: {cls.level.toUpperCase()} — {cls.message}</div>
        </div>
      );
    });

    const statusLevel = hasWarning || hasUnknown ? "warning" : "ok";
    
    return <PredCard title={config.name} icon={config.icon} rows={rows} statusLevel={statusLevel} />;
  }, [pred]);


  return (
    <div className="flex flex-col w-full bg-gray-50 min-h-screen">
      <Header />
      
      <div className="px-6 pt-4">
        <div className="flex items-center gap-3">
          <CloudSun className="w-8 h-8 text-sky-600" />
          <div>
            <h1 className="text-2xl font-bold">Prediksi</h1>
            <p className="text-sm text-gray-600">Prediksi keadaan kandang & estimasi panen berbasis</p>
          </div>
        </div>
      </div>
      
      <main className="flex-grow p-6">
        {loading ? (
          <div className="text-center text-gray-500 py-16">Menganalisis data historis dan melatih model...</div>
        ) : (
          <>
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {Object.entries(DOMAIN_CONFIG).map(([domain, config]) => 
                <React.Fragment key={domain}>{renderDomain(domain, config)}</React.Fragment>
              )}
            </section>
            
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Estimasi Panen */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl p-4 shadow border bg-white col-span-1 md:col-span-2 lg:col-span-1">
                <div className="flex items-center gap-2 mb-2"><Activity className="w-5 h-5 text-emerald-600" /> <h3 className="font-semibold">Estimasi Panen</h3></div>
                <div className="space-y-2 text-sm">
                  {Object.entries(harvest).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="capitalize">{key.replace('_', ' ')}</span>
                      <span className="font-semibold">≈ {value} hari</span>
                    </div>
                  ))}
                  <p className="text-xs text-gray-500 pt-2">*Perkiraan dinamis berdasar kondisi 30 hari terakhir & target siklus.</p>
                </div>
              </motion.div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}