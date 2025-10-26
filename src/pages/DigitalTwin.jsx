// src/pages/DigitalTwin.jsx

import { Suspense, useEffect, useState, memo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Loader } from "@react-three/drei";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";
import Header from "../components/Header";

// --- Impor Ikon (Lengkap, tidak berubah) ---
import { 
  Zap, Sun, Wind, Droplet, Thermometer, Sprout,
  CheckCircle, AlertTriangle, AlertOctagon, HelpCircle,
  Cloud, Gauge, Eye, Sunrise, Sunset,
  CloudSun, CloudRain, Cloudy, Moon, SunMedium,
  CloudFog, Snowflake, CloudMoon, ThermometerSun,
  Navigation
} from "lucide-react"; 

// --- Impor Efek (DIPERBARUI) ---
import { 
  GrowLight, NutrientDrip, RainEffect, WindEffect, SunEffect, CloudEffect,
  InstancedGrass // <-- MENGGANTIKAN DynamicGround
} from "../components/models/Effects";
import Cabbage from "../components/models/Cabbage";
import { klass } from "../utils/Threshold.js"; 

// --- Komponen SensorStatusCard (Tidak berubah) ---
const statusStyles = {
  ok: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-50", border: "border-green-300" },
  warning: { icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-300" },
  danger: { icon: AlertOctagon, color: "text-red-600", bg: "bg-red-50", border: "border-red-300" },
  unknown: { icon: HelpCircle, color: "text-gray-500", bg: "bg-gray-50", border: "border-gray-300" },
};
const SensorStatusCard = memo(({ icon: Icon, label, value, unit, statusKey, target }) => {
  const style = statusStyles[statusKey] || statusStyles.unknown;
  const IconComponent = style.icon;
  return (
    <div className={`p-3 rounded-lg ${style.bg} border ${style.border}`}>
      <div className={`flex items-center gap-2 text-sm font-semibold ${style.color}`}>
        <Icon className="w-4 h-4" />
        <span>{label}</span>
      </div>
      <div className="my-1">
        <span className={`text-2xl font-bold ${style.color}`}>
          {value ?? 'N/A'}
        </span>
        <span className="text-sm text-gray-600 ml-1">{unit}</span>
      </div>
      <div className={`flex items-center gap-1.5 text-xs ${style.color}`}>
        <IconComponent className="w-3 h-3" />
        <span className="font-semibold capitalize">{statusKey}</span>
        <span className="hidden sm:inline">| Target: {target}</span>
      </div>
    </div>
  );
});
SensorStatusCard.displayName = 'SensorStatusCard';

// --- Komponen WeatherCard (Tidak berubah) ---
const WeatherCard = ({ icon: Icon, label, value, unit }) => (
  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center gap-3">
    <div className="flex-shrink-0">
      <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </div>
    </div>
    <div>
      <div className="text-sm font-medium text-gray-500">{label}</div>
      <div className="text-xl font-bold text-gray-900">
        {value ?? 'N/A'}
        {unit && <span className="text-base font-normal ml-1">{unit}</span>}
      </div>
    </div>
  </div>
);

// --- Fungsi helper cuaca (Tidak berubah) ---
const getWeatherIcon = (iconCode) => {
  if (!iconCode) return Cloudy;
  if (iconCode.startsWith('01')) return iconCode.endsWith('d') ? SunMedium : Moon;
  if (iconCode.startsWith('02')) return iconCode.endsWith('d') ? CloudSun : CloudMoon;
  if (iconCode.startsWith('03') || iconCode.startsWith('04')) return Cloudy;
  if (iconCode.startsWith('09') || iconCode.startsWith('10')) return CloudRain;
  if (iconCode.startsWith('11')) return Zap;
  if (iconCode.startsWith('13')) return Snowflake;
  if (iconCode.startsWith('50')) return CloudFog;
  return Cloudy;
};
const degToCompass = (num) => {
  if (num === undefined || num === null) return '';
  const val = Math.floor((num / 22.5) + 0.5);
  const arr = ["U", "UUT", "UT", "TUT", "T", "TGT", "TG", "SGT", "S", "SBD", "SB", "BBD", "B", "BBL", "BL", "UBL"];
  return arr[(val % 16)];
}
const msToKmh = (ms) => {
  if (ms === undefined || ms === null) return 'N/A';
  return (ms * 3.6).toFixed(1);
}
const mToKm = (m) => {
  if (m === undefined || m === null) return 'N/A';
  return (m / 1000).toFixed(1);
}
const formatTime = (unix) => {
  if (!unix) return 'N/A';
  return new Date(unix * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}
const capitalizeWords = (str) => {
  if (!str) return '';
  return str.replace(/\b\w/g, l => l.toUpperCase());
}

// --- Komponen Halaman DigitalTwin ---
export default function DigitalTwin() {
  // --- (Semua state dan useEffect tidak berubah) ---
  const [sensorData, setSensorData] = useState({});
  const [kontrolData, setKontrolData] = useState({});
  const [weatherData, setWeatherData] = useState(null); 
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState(null);

  useEffect(() => {
    const fetchWeather = async () => {
      const apiKey = "7efe5acf39a055f8b27dc5055208cc3b";
      const city = "Lhokseumawe";
      const lang = "id";
      const units = "metric";
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=${units}&lang=${lang}`;
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Error ${response.status}: Gagal mengambil data cuaca.`);
        const data = await response.json();
        setWeatherData(data);
        setWeatherError(null);
      } catch (error) {
        console.error("Kesalahan API Cuaca:", error);
        setWeatherError(error.message);
      } finally {
        setWeatherLoading(false);
      }
    };
    fetchWeather();
    const intervalId = setInterval(fetchWeather, 600000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const sensorRef = ref(db, 'sensor');
    const unsubSensor = onValue(sensorRef, (snapshot) => setSensorData(snapshot.val() || {}));
    const kontrolRef = ref(db, 'kontrol');
    // Mengambil data kontrol dengan key yang benar
    const unsubKontrol = onValue(kontrolRef, (snapshot) => {
      const fbData = snapshot.val() || {};
      // Normalisasi data kontrol agar selalu berupa objek { state: 'ON'/'OFF', level: 0-100 }
      const normalizeControl = (data) => {
        if (typeof data === 'string') return { state: data, level: data === 'ON' ? 100 : 0 };
        return { state: data?.state ?? 'OFF', level: data?.level ?? 0 };
      };

      setKontrolData({
        pompa_hidroponik: normalizeControl(fbData.pompa_hidroponik),
        lampu_hidroponik: normalizeControl(fbData.lampu_hidroponik),
        // Tambahkan kontrol lain jika diperlukan
      });
    });
    return () => { unsubSensor(); unsubKontrol(); };
  }, []);

  // --- KODE BARU: Menarik data kontrol yang disinkronkan ---
  const KONTROL_KEY_POMPA = 'pompa_hidroponik';
  const KONTROL_KEY_LAMPU = 'lampu_hidroponik';

  const pompaData = kontrolData[KONTROL_KEY_POMPA] || { state: 'OFF', level: 0 };
  const lampuData = kontrolData[KONTROL_KEY_LAMPU] || { state: 'OFF', level: 0 };
  
  const pompaState = pompaData.state;
  const lampuState = lampuData.state;
  const lampuLevel = lampuData.level;
  // --------------------------------------------------------

  const dataHidroponik = sensorData.hidroponik || {};
  const dataForCabbage = dataHidroponik;

  // --- Logika Cuaca (Tidak berubah) ---
  const wxNow = weatherData; 
  const isRaining = wxNow?.weather[0]?.main === 'Rain' || wxNow?.weather[0]?.main === 'Drizzle' || wxNow?.weather[0]?.main === 'Thunderstorm';
  const isDayTime = wxNow ? wxNow.weather[0].icon.endsWith('d') : true; 
  const windSpeed = wxNow?.wind?.speed ?? 0; // m/s
  const isWindy = windSpeed > 1.5; 
  const cloudiness = wxNow?.clouds?.all ?? 0; // %
  const isCloudy = cloudiness > 25; 

  // --- Logika Status Panel 2D (Tidak berubah) ---
  const phStatus = klass("hidroponik", "ph", dataHidroponik.ph);
  const suhuStatus = klass("hidroponik", "suhu", dataHidroponik.suhu);
  const ecStatus = klass("hidroponik", "ec", dataHidroponik.aliran_nutrisi);
  const kelembabanStatus = klass("hidroponik", "kelembaban", dataHidroponik.kelembaban);
  const cahayaStatus = klass("hidroponik", "intensitas_cahaya", dataHidroponik.intensitas_cahaya);

  const MainWeatherIcon = getWeatherIcon(wxNow?.weather[0]?.icon);
  const mainWeatherDescription = capitalizeWords(wxNow?.weather[0]?.description);

  return (
    <div className="p-6 space-y-6">
      <Header />
      
      {/* ... (Judul Halaman) ... */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <h1 className="text-2xl font-bold">Digital Twin - Sistem Hidroponik</h1>
      </div>

      {/* --- Panel Ringkasan Cuaca (Tidak berubah) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-6 rounded-2xl shadow-lg flex items-center gap-6">
          {weatherLoading ? (
            <div className="animate-pulse flex-shrink-0 w-20 h-20 bg-blue-400 rounded-full"></div>
          ) : (
            <MainWeatherIcon className="flex-shrink-0" size={80} strokeWidth={1.5} />
          )}
          <div className="flex-grow">
            {weatherLoading ? (
              <div className="animate-pulse">
                <div className="h-6 bg-blue-400 rounded w-3/4 mb-2"></div>
                <div className="h-10 bg-blue-400 rounded w-1/2"></div>
              </div>
            ) : (
              <>
                <div className="text-lg font-medium text-blue-100">
                  Cuaca Saat Ini {wxNow?.name && `di ${wxNow.name}`}
                </div>
                <div className="text-3xl sm:text-4xl font-bold">
                  {mainWeatherDescription || 'Memuat...'}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="lg:col-span-2 bg-gray-50 p-4 sm:p-6 rounded-lg shadow-inner border">
          <h3 className="font-bold text-xl mb-4 flex items-center gap-2 text-gray-800">
            <Cloud className="text-blue-500" />
            Detail Kondisi Cuaca
          </h3>
          {weatherLoading && (
            <div className="text-center text-gray-600 p-4">Memuat data cuaca...</div>
          )}
          {weatherError && (
            <div className="text-center text-red-600 p-4">
              <AlertTriangle className="inline-block mr-2" />
              {weatherError}
            </div>
          )}
          {!weatherLoading && !weatherError && wxNow && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <WeatherCard icon={Thermometer} label="Suhu" value={wxNow?.main?.temp?.toFixed(1)} unit="°C" />
              <WeatherCard icon={ThermometerSun} label="Suhu Seperti" value={wxNow?.main?.feels_like?.toFixed(1)} unit="°C" />
              <WeatherCard icon={Droplet} label="Kelembaban" value={wxNow?.main?.humidity} unit="%" />
              <WeatherCard icon={Wind} label="Angin" value={msToKmh(wxNow?.wind?.speed)} unit={`km/j ${degToCompass(wxNow?.wind?.deg)}`} />
              <WeatherCard icon={Navigation} label="Tiupan Angin" value={msToKmh(wxNow?.wind?.gust)} unit="km/j" />
              <WeatherCard icon={Cloudy} label="Tutupan Awan" value={wxNow?.clouds?.all} unit="%" />
              <WeatherCard icon={Gauge} label="Tekanan" value={wxNow?.main?.pressure} unit="mb" />
              <WeatherCard icon={Eye} label="Visibilitas" value={mToKm(wxNow?.visibility)} unit="km" />
              <WeatherCard icon={Sunrise} label="Matahari Terbit" value={formatTime(wxNow?.sys?.sunrise)} />
              <WeatherCard icon={Sunset} label="Matahari Terbenam" value={formatTime(wxNow?.sys?.sunset)} />
            </div>
          )}
        </div>
      </div>
      
      {/* --- Panggung 3D (DIPERBARUI untuk sinkronisasi) --- */}
      <div className="w-full h-[500px] bg-gray-100 rounded-2xl shadow-lg border relative overflow-hidden">
        <Loader />
        <Canvas 
          camera={{ position: [4, 3, 5], fov: 50 }} 
          shadows
          className="z-10"
        >
          <Suspense fallback={null}>
            <ambientLight intensity={isDayTime ? 0.6 : 0.2} />
            
            {/* Menggunakan state kontrol yang baru */}
            <GrowLight 
                visible={lampuState === 'ON'} 
                intensity={lampuLevel / 100} // Asumsi GrowLight menerima intensity 0-1
            />
            <NutrientDrip visible={pompaState === 'ON'} />

            <SunEffect visible={isDayTime && !isRaining} />
            <RainEffect visible={isRaining} />
            <WindEffect visible={isWindy} speed={windSpeed} /> 
            <CloudEffect visible={isCloudy} density={cloudiness / 100} />
            
            <Environment preset={isDayTime ? 'sunset' : 'night'} />
            
            {/* Model Utama */}
            <Cabbage 
              data={dataForCabbage} 
              control={kontrolData} 
              position={[0, 1.75, 0]}
            />
            
            {/* BARU: Lantai rumput 3D asli */}
            <InstancedGrass 
              windSpeed={windSpeed}
              isRaining={isRaining}
              isDayTime={isDayTime}
            />
            
            <OrbitControls 
              autoRotate={true} 
              autoRotateSpeed={0.5} 
              enableZoom={true} 
              maxDistance={15}
              minDistance={2}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* --- PANEL 2D TERPADU (DIPERBARUI untuk sinkronisasi) --- */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow border">
        <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
          <Sprout className="text-green-600" />
          Pusat Analisis & Kontrol Hidroponik
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <h4 className="text-lg font-semibold text-gray-700 mb-3">Status Sensor Realtime</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <SensorStatusCard
                icon={Droplet} label="pH Air" value={dataHidroponik.ph}
                unit="" statusKey={phStatus} target="5.5–6.5"
              />
              <SensorStatusCard
                icon={Zap} label="Nutrisi (EC)" value={dataHidroponik.aliran_nutrisi}
                unit="" statusKey={ecStatus} target="1.2–2.0"
              />
              <SensorStatusCard
                icon={Thermometer} label="Suhu Air" value={dataHidroponik.suhu}
                unit="°C" statusKey={suhuStatus} target="18–25 °C"
              />
              <SensorStatusCard
                icon={Wind} label="Kelembaban Udara" value={dataHidroponik.kelembaban}
                unit="%" statusKey={kelembabanStatus} target="50–70 %"
              />
              <SensorStatusCard
                icon={Sun} label="Intensitas Cahaya" value={dataHidroponik.intensitas_cahaya}
                unit="lux" statusKey={cahayaStatus} target="> 20k lux"
              />
            </div>
          </div>
          <div className="lg:col-span-4">
            <h4 className="text-lg font-semibold text-gray-700 mb-3">Status Kontrol Aktif</h4>
            <div className="space-y-4">
              {/* MENGGUNAKAN pompaState BARU */}
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border">
                <span className="font-semibold text-gray-700">Pompa Nutrisi</span>
                <span className={`font-bold text-md px-3 py-1 rounded-full ${
                  pompaState === 'ON' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {pompaState}
                </span>
              </div>
              {/* MENGGUNAKAN lampuState dan lampuLevel BARU */}
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border">
                <span className="font-semibold text-gray-700">Lampu Tumbuh</span>
                <span className={`font-bold text-md px-3 py-1 rounded-full ${
                  lampuState === 'ON' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {lampuState} ({lampuLevel}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}