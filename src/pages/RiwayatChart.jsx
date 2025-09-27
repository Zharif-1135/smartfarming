import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db } from "../firebase";
import Header from "../components/Header";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Droplets,
  Thermometer,
  Wind,
  Zap,
  Bug,
  Sun,
  CloudRain,
  Leaf,
  Battery,
  Gauge,
} from "lucide-react";

// fungsi untuk hitung min, max, avg
const calcStats = (data, key) => {
  const values = data.map((d) => d[key]).filter((v) => v !== null && v !== undefined);
  if (values.length === 0) return { min: "-", max: "-", avg: "-" };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2);
  return { min, max, avg };
};

const StatBox = ({ label, stats, color, Icon }) => (
  <div className={`p-3 rounded-xl text-sm shadow bg-${color}-50 border border-${color}-200`}>
    <div className={`flex items-center gap-2 font-medium text-${color}-700`}>
      {Icon && <Icon className="w-4 h-4" />}
      {label}
    </div>
    <div className="flex justify-between mt-1 text-gray-800">
      <span>Min: <b>{stats.min}</b></span>
      <span>Avg: <b>{stats.avg}</b></span>
      <span>Max: <b>{stats.max}</b></span>
    </div>
  </div>
);

export default function RiwayatChart() {
  const [history, setHistory] = useState({});
  const [hidroponikMode, setHidroponikMode] = useState(1);

  useEffect(() => {
    const unsub = onValue(ref(db, "history"), (snap) => {
      setHistory(snap.val() || {});
    });
    return () => unsub();
  }, []);

  const dates = Object.keys(history).sort().slice(-7);

  const chartData = dates.map((d) => ({
    date: d,
    // Kolam
    suhuKolam: history[d]?.kolam?.suhu ?? null,
    phKolam: history[d]?.kolam?.ph ?? null,
    oksigenKolam: history[d]?.kolam?.oksigen ?? null,
    amoniaKolam: history[d]?.kolam?.amonia ?? null,
    // Cacing Sutra
    suhuCacing: history[d]?.ulat?.suhu ?? null,
    phCacing: history[d]?.ulat?.ph ?? null,
    oksigenCacing: history[d]?.ulat?.oksigen ?? null,
    amoniaCacing: history[d]?.ulat?.amonia ?? null,
    // Kandang
    suhuKandang: history[d]?.kandang?.suhu ?? null,
    kelembabanKandang: history[d]?.kandang?.kelembaban ?? null,
    kualitasUdara: history[d]?.kandang?.kualitas_udara ?? null,
    cahayaKandang: history[d]?.kandang?.pencahayaan ?? null,
    // Hidroponik
    phHidro: history[d]?.hidroponik?.ph ?? null,
    suhuHidro: history[d]?.hidroponik?.suhu ?? null,
    kelembabanHidro: history[d]?.hidroponik?.kelembaban ?? null,
    cahayaHidro: history[d]?.hidroponik?.intensitas_cahaya ?? null,
    ecHidro: history[d]?.hidroponik?.aliran_nutrisi ?? null,
    // Usage
    energi: history[d]?.usage?.energy?.value ?? null,
    air: history[d]?.usage?.water?.value ?? null,
    efisiensi: history[d]?.usage?.efficiency?.value ?? null,
  }));

  return (
    <div className="p-6 space-y-8">
      <Header />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Gauge className="w-6 h-6 text-emerald-700" /> Statistik 7 Hari Terakhir
        </h1>
        <p className="text-sm text-gray-600">
          Ringkasan visual & angka dari semua parameter budidaya
        </p>
      </div>

      {/* Kolam */}
      <section className="bg-white p-5 rounded-2xl shadow-md space-y-4">
        <h2 className="font-semibold text-lg text-emerald-700 flex items-center gap-2">
          <Droplets className="w-5 h-5 text-blue-500" /> Kolam Ikan
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatBox label="Suhu (°C)" stats={calcStats(chartData, "suhuKolam")} color="green" Icon={Thermometer} />
          <StatBox label="pH" stats={calcStats(chartData, "phKolam")} color="blue" Icon={Droplets} />
          <StatBox label="Oksigen (mg/L)" stats={calcStats(chartData, "oksigenKolam")} color="orange" Icon={Wind} />
          <StatBox label="Amonia (mg/L)" stats={calcStats(chartData, "amoniaKolam")} color="red" Icon={Zap} />
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid stroke="#e5e7eb" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="suhuKolam" stroke="#16a34a" name="Suhu (°C)" />
            <Line type="monotone" dataKey="phKolam" stroke="#2563eb" name="pH" />
            <Line type="monotone" dataKey="oksigenKolam" stroke="#f97316" name="Oksigen (mg/L)" />
            <Line type="monotone" dataKey="amoniaKolam" stroke="#dc2626" name="Amonia (mg/L)" />
          </LineChart>
        </ResponsiveContainer>
      </section>

      {/* Cacing Sutra */}
      <section className="bg-white p-5 rounded-2xl shadow-md space-y-4">
        <h2 className="font-semibold text-lg text-emerald-700 flex items-center gap-2">
          <Bug className="w-5 h-5 text-pink-600" /> Cacing Sutra
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatBox label="Suhu (°C)" stats={calcStats(chartData, "suhuCacing")} color="green" Icon={Thermometer} />
          <StatBox label="pH" stats={calcStats(chartData, "phCacing")} color="blue" Icon={Droplets} />
          <StatBox label="Oksigen (mg/L)" stats={calcStats(chartData, "oksigenCacing")} color="orange" Icon={Wind} />
          <StatBox label="Amonia (mg/L)" stats={calcStats(chartData, "amoniaCacing")} color="red" Icon={Zap} />
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid stroke="#e5e7eb" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="suhuCacing" stroke="#16a34a" name="Suhu (°C)" />
            <Line type="monotone" dataKey="phCacing" stroke="#2563eb" name="pH" />
            <Line type="monotone" dataKey="oksigenCacing" stroke="#f97316" name="Oksigen (mg/L)" />
            <Line type="monotone" dataKey="amoniaCacing" stroke="#dc2626" name="Amonia (mg/L)" />
          </LineChart>
        </ResponsiveContainer>
      </section>

      {/* Kandang */}
      <section className="bg-white p-5 rounded-2xl shadow-md space-y-4">
        <h2 className="font-semibold text-lg text-emerald-700 flex items-center gap-2">
          <Sun className="w-5 h-5 text-yellow-500" /> Kandang
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatBox label="Suhu Udara (°C)" stats={calcStats(chartData, "suhuKandang")} color="green" Icon={Thermometer} />
          <StatBox label="Kelembaban (%)" stats={calcStats(chartData, "kelembabanKandang")} color="blue" Icon={CloudRain} />
          <StatBox label="Kualitas Udara" stats={calcStats(chartData, "kualitasUdara")} color="red" Icon={Wind} />
          <StatBox label="Cahaya (Lux)" stats={calcStats(chartData, "cahayaKandang")} color="orange" Icon={Sun} />
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid stroke="#e5e7eb" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="suhuKandang" stroke="#16a34a" name="Suhu Udara (°C)" />
            <Line type="monotone" dataKey="kelembabanKandang" stroke="#2563eb" name="Kelembaban (%)" />
            <Line type="monotone" dataKey="kualitasUdara" stroke="#dc2626" name="Kualitas Udara" />
            <Line type="monotone" dataKey="cahayaKandang" stroke="#f97316" name="Cahaya (Lux)" />
          </LineChart>
        </ResponsiveContainer>
      </section>

      {/* Hidroponik */}
      <section className="bg-white p-5 rounded-2xl shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg text-emerald-700 flex items-center gap-2">
            <Leaf className="w-5 h-5 text-green-600" /> Hidroponik
          </h2>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setHidroponikMode(1)}
              className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                hidroponikMode === 1
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Mode 1: Cahaya
            </button>
            <button
              onClick={() => setHidroponikMode(2)}
              className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                hidroponikMode === 2
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Mode 2: Parameter Lain
            </button>
          </div>
        </div>
        
        {hidroponikMode === 1 ? (
          <>
            <div className="grid md:grid-cols-1 gap-3">
              <StatBox label="Cahaya (Lux)" stats={calcStats(chartData, "cahayaHidro")} color="orange" Icon={Sun} />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid stroke="#e5e7eb" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="cahayaHidro" stroke="#f97316" name="Cahaya (Lux)" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
              <StatBox label="pH Air" stats={calcStats(chartData, "phHidro")} color="blue" Icon={Droplets} />
              <StatBox label="Suhu Air (°C)" stats={calcStats(chartData, "suhuHidro")} color="green" Icon={Thermometer} />
              <StatBox label="Kelembaban (%)" stats={calcStats(chartData, "kelembabanHidro")} color="blue" Icon={CloudRain} />
              <StatBox label="Nutrisi (EC)" stats={calcStats(chartData, "ecHidro")} color="purple" Icon={Zap} />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid stroke="#e5e7eb" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="phHidro" stroke="#2563eb" name="pH Air" strokeWidth={2} />
                <Line type="monotone" dataKey="suhuHidro" stroke="#16a34a" name="Suhu Air (°C)" strokeWidth={2} />
                <Line type="monotone" dataKey="kelembabanHidro" stroke="#60a5fa" name="Kelembaban (%)" strokeWidth={2} />
                <Line type="monotone" dataKey="ecHidro" stroke="#9333ea" name="Nutrisi (EC)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </section>

      {/* Penggunaan Sistem */}
      <section className="bg-white p-5 rounded-2xl shadow-md space-y-4">
        <h2 className="font-semibold text-lg text-emerald-700 flex items-center gap-2">
          <Battery className="w-5 h-5 text-green-600" /> Penggunaan Sistem
        </h2>
        <div className="grid md:grid-cols-3 gap-3">
          <StatBox label="Energi (kWh)" stats={calcStats(chartData, "energi")} color="green" Icon={Battery} />
          <StatBox label="Air (L)" stats={calcStats(chartData, "air")} color="blue" Icon={Droplets} />
          <StatBox label="Efisiensi (%)" stats={calcStats(chartData, "efisiensi")} color="orange" Icon={Gauge} />
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid stroke="#e5e7eb" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="energi" fill="#16a34a" name="Energi (kWh)" />
            <Bar dataKey="air" fill="#2563eb" name="Air (L)" />
            <Bar dataKey="efisiensi" fill="#f97316" name="Efisiensi (%)" />
          </BarChart>
        </ResponsiveContainer>
      </section>
    </div>
  );
}