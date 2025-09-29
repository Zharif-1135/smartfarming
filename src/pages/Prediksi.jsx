// src/pages/Prediksi.jsx
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { db } from "../firebase";
import { ref, get } from "firebase/database";
import {
  TrendingUp,
  Cloud,
  Sun,
  CloudRain,
  Thermometer,
  Droplets,
  Wind,
  Calendar,
  Fish,
  Bug,
  Home,
  Sprout,
} from "lucide-react";

import Header from "../components/Header";
import { getPredictions } from "../components/Prediksi";
import { classify } from "../utils/Threshold.js";

// =====================================================================================
// == BAGIAN 1: KOMPONEN UI INTERNAL (DENGAN PERBAIKAN)
// =====================================================================================

const LoadingCard = ({ status }) => (
  <div className="flex flex-col items-center justify-center p-8 bg-gray-50 border rounded-xl shadow-md gap-4 h-64">
    <motion.div animate={{ rotate: 360 }} transition={{ ease: "linear", duration: 1.5, repeat: Infinity }}>
      <TrendingUp className="w-12 h-12 text-purple-600" />
    </motion.div>
    <p className="font-semibold text-lg text-gray-700">Menganalisis Data...</p>
    <p className="text-sm text-gray-500 text-center">{status}</p>
  </div>
);

const WeatherForecast = () => {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const getWeatherIcon = (iconPhrase) => {
    const p = (iconPhrase || "").toLowerCase();
    if (p.includes("hujan") || p.includes("badai") || p.includes("gerimis")) return <CloudRain className="w-16 h-16 text-blue-500" />;
    if (p.includes("berawan") || p.includes("mendung")) return <Cloud className="w-16 h-16 text-gray-500" />;
    return <Sun className="w-16 h-16 text-yellow-500" />;
  };

  useEffect(() => {
    const fetchForecast = async () => {
      // ... (logika fetch tetap sama)
      const cacheKey = "weather-forecast-cache";
      const API_KEY = import.meta.env.VITE_ACCUWEATHER_KEY;
      const LOCATION_KEY = "205120";

      try {
        const cached = JSON.parse(localStorage.getItem(cacheKey));
        if (cached && (new Date().getTime() - cached.timestamp < 3 * 60 * 60 * 1000)) {
          setForecast(cached.data);
          return;
        }
        
        const res = await fetch(`https://dataservice.accuweather.com/forecasts/v1/daily/1day/${LOCATION_KEY}?apikey=${API_KEY}&language=id&metric=true`);
        if (!res.ok) throw new Error("Gagal mengambil data cuaca dari API.");
        
        const data = await res.json();
        if (data?.DailyForecasts?.[0]) {
          const forecastData = data.DailyForecasts[0];
          setForecast(forecastData);
          localStorage.setItem(cacheKey, JSON.stringify({ data: forecastData, timestamp: new Date().getTime() }));
        }
      } catch (err) {
        console.error("Kesalahan saat mengambil prakiraan cuaca:", err);
        const oldCache = JSON.parse(localStorage.getItem(cacheKey));
        if (oldCache) setForecast(oldCache.data);
      } finally {
        setLoading(false);
      }
    };
    fetchForecast();
  }, []);

  if (loading) return <div className="bg-gray-100 border rounded-2xl p-5 animate-pulse h-[260px]"></div>;
  if (!forecast) return <div className="bg-gray-100 border rounded-2xl p-5 text-center">Gagal memuat prakiraan cuaca.</div>;
  
  // --- PERBAIKAN ---
  // Menambahkan pengecekan `?.` (optional chaining) untuk mencegah error jika struktur data tidak lengkap
  const maxTemp = forecast.Temperature?.Maximum?.Value || "N/A";
  const minTemp = forecast.Temperature?.Minimum?.Value || "N/A";
  const iconPhrase = forecast.Day?.IconPhrase || "Cuaca tidak diketahui";
  const rainProb = forecast.Day?.PrecipitationProbability || "N/A";
  const humidity = forecast.RelativeHumidity?.Average || 'N/A';
  const windSpeed = forecast.Day?.Wind?.Speed?.Value || "N/A"; // Ini perbaikan utamanya

  return (
    <div className="bg-gradient-to-br from-blue-100 to-cyan-50 border border-blue-300 rounded-2xl shadow-lg p-5 flex flex-col gap-3">
      <h2 className="font-bold text-xl flex items-center gap-2 text-blue-800"><Cloud /> Prakiraan Cuaca Besok</h2>
      <div className="flex justify-center items-center gap-4 my-3 text-center">
        {getWeatherIcon(iconPhrase)}
        <div>
          <p className="text-5xl font-bold text-gray-800">{maxTemp}°<span className="text-3xl text-gray-500">/{minTemp}°</span></p>
          <p className="text-lg text-gray-600 capitalize">{iconPhrase}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm text-center">
        <div className="flex flex-col items-center"><Thermometer className="w-5 h-5 text-red-500 mb-1" /> Peluang Hujan: {rainProb}%</div>
        <div className="flex flex-col items-center"><Droplets className="w-5 h-5 text-blue-500 mb-1" /> Kelembapan: {humidity}%</div>
        <div className="flex flex-col items-center"><Wind className="w-5 h-5 text-gray-500 mb-1" /> Angin: {windSpeed} km/j</div>
      </div>
    </div>
  );
};

const HarvestCard = ({ harvestInfo }) => {
    // ... (Komponen ini tidak perlu diubah)
    if (!harvestInfo) return <div className="bg-gray-100 border rounded-2xl p-5 animate-pulse h-[260px]"></div>;
    return (
        <div className="bg-gradient-to-br from-green-100 to-lime-50 border border-green-300 rounded-2xl shadow-lg p-5 flex flex-col h-full justify-between">
          <div>
            <h2 className="font-bold text-xl flex items-center gap-2 text-green-800"><Calendar /> Estimasi Panen Hidroponik</h2>
            {harvestInfo.isReady ? (
              <div className="text-center my-4"><p className="text-2xl font-bold text-green-700">SIAP PANEN!</p><p className="text-gray-600">Tanaman sudah melewati masa tanam.</p></div>
            ) : (
              <div className="text-center my-4"><p className="text-gray-600">Perkiraan Panen Dalam:</p><p className="text-5xl font-bold text-gray-800">{harvestInfo.daysRemaining}</p><p className="text-lg text-gray-600">hari ({harvestInfo.harvestDate})</p></div>
            )}
          </div>
          <p className="text-xs text-center text-gray-500 italic mt-2">Estimasi berdasarkan tgl. tanam {harvestInfo.plantingDate} (siklus 45 hari).</p>
        </div>
    );
};

const PredictionGauge = ({ label, value, units, level, range }) => {
  const colors = { ok: "#16a34a", warning: "#f59e0b", danger: "#dc2626", unknown: "#6b7280" };
  const color = colors[level] || colors.unknown;

  // --- PERBAIKAN ---n
  // Pastikan semua nilai numerik sebelum digunakan untuk kalkulasi animasi
  const isValueValid = typeof value === 'number' && !isNaN(value);
  const [min, max] = Array.isArray(range) ? range : [0, isValueValid ? value * 2 : 100];
  
  const percentage = isValueValid && max > min ? ((value - min) / (max - min)) * 100 : 0;
  const circumference = 2 * Math.PI * 40;
  
  // Memberikan nilai default yang aman (lingkaran kosong) jika nilai tidak valid
  const initialOffset = circumference; 
  const targetOffset = isValueValid ? circumference - (percentage / 100) * circumference : circumference;

  return (
    <div className="flex items-center gap-4 p-2 rounded-lg bg-gray-50/80 border border-gray-200">
      <div className="relative w-24 h-24 flex-shrink-0">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="transparent" stroke="#e5e7eb" strokeWidth="8" />
          <motion.circle 
            cx="50" cy="50" r="40" fill="transparent" 
            stroke={color} strokeWidth="8" strokeLinecap="round" 
            strokeDasharray={circumference} 
            transform="rotate(-90 50 50)" 
            initial={{ strokeDashoffset: initialOffset }}
            animate={{ strokeDashoffset: targetOffset }}
            transition={{ duration: 1, ease: "circOut" }} 
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-bold text-xl" style={{ color }}>{isValueValid ? value.toFixed(1) : "-"}</span>
            <span className="text-xs text-gray-500">{units}</span>
        </div>
      </div>
      <div className="flex flex-col"><span className="font-semibold text-gray-800">{label}</span><span className="text-xs text-gray-500 italic">Target: {range ? `${range[0]}-${range[1]}` : "-"} {units}</span></div>
    </div>
  );
};

const PredictionCategoryCard = ({ domain, title, items, Icon, color }) => (
  // ... (Komponen ini tidak perlu diubah)
  <motion.div className="bg-white rounded-2xl shadow-lg p-5 flex flex-col gap-4 border" variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}>
    <h2 className="font-bold text-xl flex items-center gap-3"><Icon className={`w-7 h-7 ${color}`} />{title}</h2>
    <div className="space-y-3 w-full">
      {items.map((item, index) => {
        const valueAsNumber = typeof item.value === 'number' && !isNaN(item.value) ? item.value : NaN;
        const cls = classify(domain, item.metric, valueAsNumber);
        return <PredictionGauge key={index} label={item.label} value={valueAsNumber} units={cls.units} level={cls.level} range={cls.range} />;
      })}
    </div>
  </motion.div>
);

// =====================================================================================
// == BAGIAN 2: KOMPONEN UTAMA HALAMAN PREDIKSI
// =====================================================================================

export default function Prediksi() {
  // ... (Logika utama komponen ini tidak perlu diubah)
  const [status, setStatus] = useState("Inisialisasi...");
  const [predictions, setPredictions] = useState(null);
  const [harvestInfo, setHarvestInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const sensorPreds = await getPredictions(setStatus);
        setPredictions(sensorPreds);

        setStatus("Menghitung estimasi panen...");
        const snapshot = await get(ref(db, "sensor/hidroponik/tanggal_tanam"));
        const plantingDateStr = snapshot.val() || new Date().toISOString().split('T')[0];
        const plantingDate = new Date(plantingDateStr);
        const harvestDate = new Date(plantingDate);
        harvestDate.setDate(plantingDate.getDate() + 45);
        const timeDiff = harvestDate.getTime() - new Date().getTime();
        const daysRemaining = Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));
        setHarvestInfo({
            plantingDate: plantingDate.toLocaleDateString('id-ID'),
            harvestDate: harvestDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' }),
            daysRemaining,
            isReady: daysRemaining === 0
        });
      } catch (err) {
        console.error("Gagal memuat prediksi:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllData();
  }, []);

  if (error) {
    return (
        <div className="flex flex-col w-full">
            <Header />
            <div className="flex flex-col items-center justify-center p-8 text-center h-screen">
                <h2 className="text-xl font-bold text-red-600">Gagal Memuat Prediksi</h2>
                <p className="text-gray-600 mt-2">{error}</p>
                <p className="text-sm text-gray-500 mt-4 italic">Pastikan koneksi internet stabil dan data historis cukup (minimal 8 hari).</p>
            </div>
        </div>
    );
  }

  return (
    <div className="flex flex-col w-full bg-gray-50 min-h-screen">
      <Header />
      <div className="px-6 pt-4 flex items-center gap-3">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.5 }}><TrendingUp className="w-10 h-10 text-purple-600" /></motion.div>
        <div><h1 className="text-2xl font-bold">Prediksi & Estimasi</h1><p className="text-sm text-gray-600">Analisis Cerdas untuk Perencanaan Esok Hari</p></div>
      </div>

      <div className="p-6">
        {isLoading ? <LoadingCard status={status} /> : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2"><WeatherForecast /></div>
              <HarvestCard harvestInfo={harvestInfo} />
            </div>
            {predictions && (
              <>
                <h2 className="text-xl font-bold mt-8 mb-4 px-1">Prediksi Kondisi Sistem</h2>
                <motion.div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
                  <PredictionCategoryCard domain="kolam" title="Kolam Ikan" Icon={Fish} color="text-blue-600" items={[{ label: "Suhu Air", metric: "suhu", value: predictions.kolam?.suhu }, { label: "pH Air", metric: "ph", value: predictions.kolam?.ph }, { label: "Oksigen Terlarut", metric: "oksigen", value: predictions.kolam?.oksigen }, { label: "Amonia", metric: "amonia_total", value: predictions.kolam?.amonia }]} />
                  <PredictionCategoryCard domain="ulat" title="Cacing Sutra" Icon={Bug} color="text-amber-800" items={[{ label: "Suhu Air", metric: "suhu", value: predictions.ulat?.suhu }, { label: "pH Air", metric: "ph", value: predictions.ulat?.ph }]} />
                  <PredictionCategoryCard domain="kandang" title="Kandang" Icon={Home} color="text-yellow-600" items={[{ label: "Suhu Udara", metric: "suhu", value: predictions.kandang?.suhu }, { label: "Kelembapan", metric: "kelembaban", value: predictions.kandang?.kelembaban }, { label: "Kualitas Udara", metric: "amonia", value: predictions.kandang?.kualitas_udara }]} />
                  <PredictionCategoryCard domain="hidroponik" title="Hidroponik" Icon={Sprout} color="text-green-600" items={[{ label: "pH Air", metric: "ph", value: predictions.hidroponik?.ph }, { label: "Suhu Air", metric: "suhu", value: predictions.hidroponik?.suhu }, { label: "Nutrisi (EC)", metric: "ec", value: predictions.hidroponik?.aliran_nutrisi }]} />
                </motion.div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}