// src/pages/Monitoring.js
import { useEffect, useState } from "react";
import { onValue, ref, set } from "firebase/database";
import { db } from "../firebase";
import Header from "../components/Header";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { classify } from "../utils/Threshold.js";
import { motion } from "framer-motion";
import { Leaf, Fish, Bug, Home, Sprout, Zap, Droplet, Gauge, TrendingUp } from "lucide-react";

// Warna berdasarkan perubahan persen
const getPercentStyles = (diff) => {
  if (diff > 0) return { text: "text-green-600", border: "border-green-400", bg: "bg-green-50" };
  if (diff < 0) return { text: "text-red-600", border: "border-red-400", bg: "bg-red-50" };
  return { text: "text-gray-700", border: "border-gray-300", bg: "bg-gray-50" };
};

// Komponen statistik atas
const StatBox = ({ title, value, diff, Icon, color }) => {
  const styles = getPercentStyles(diff);
  let diffText =
    diff > 0
      ? `+${diff}% dari sehari yang lalu`
      : diff < 0
      ? `${diff}% dari sehari yang lalu`
      : "Tidak ada perubahan dari kemarin";

  return (
    <div
      className={`border ${styles.border} ${styles.bg} rounded-xl shadow p-4 flex flex-col items-start transition-all duration-300 hover:scale-[1.02]`}
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon className={`w-6 h-6 ${color}`} />}
        <div className="text-lg font-bold">{title}</div>
      </div>
      <div className="text-2xl font-semibold">{value}</div>
      <div className={`mt-1 text-sm ${styles.text}`}>{diffText}</div>
    </div>
  );
};

// Tentukan warna dominan card berdasarkan status semua item
const getCardStyle = (results, items) => {
  const levels = results.map((r) => r.level);
  const hasMissing = items.some((it) => it.value === "-" || it.value === null || it.value === undefined);

  if (hasMissing && levels.every((lv) => lv === "unknown" || lv === "danger")) {
    return { border: "border-red-400", grad: "from-red-100 to-red-50" };
  }
  if (hasMissing) {
    return { border: "border-yellow-400", grad: "from-yellow-100 to-yellow-50" };
  }
  if (levels.every((lv) => lv === "ok")) {
    return { border: "border-green-400", grad: "from-green-100 to-green-50" };
  }
  if (levels.some((lv) => lv === "warning" || lv === "danger")) {
    return { border: "border-yellow-400", grad: "from-yellow-100 to-yellow-50" };
  }
  return { border: "border-gray-300", grad: "from-gray-100 to-gray-50" };
};

// Komponen card budidaya dengan ikon berbeda + warna
const CategoryCard = ({ domain, title, items, Icon, color }) => {
  const results = items.map((item) =>
    classify(domain, item.metric, item.value === "-" ? NaN : Number(item.value), item.extras)
  );
  const style = getCardStyle(results, items);

  return (
    <div
      className={`group rounded-2xl shadow-lg p-5 flex flex-col gap-3 border ${style.border} 
        bg-gradient-to-br ${style.grad} transition-all duration-300 hover:scale-[1.02] hover:shadow-md`}
    >
      <h2 className="font-bold text-xl mb-1 flex items-center gap-2">
        <Icon className={`w-6 h-6 ${color} group-hover:scale-110 transition-transform duration-300`} />
        {title}
      </h2>
      <div className="text-sm space-y-3 w-full">
        {items.map((item, index) => {
          const cls = results[index];
          const isMissing = item.value === "-" || item.value === null || item.value === undefined;
          const colorClass = isMissing
            ? "text-red-600"
            : cls.level === "ok"
            ? "text-green-700"
            : cls.level === "warning"
            ? "text-yellow-700"
            : cls.level === "danger"
            ? "text-red-700"
            : "text-gray-500";

          return (
            <div
              key={index}
              className="p-2 rounded-lg bg-white/80 flex flex-col border border-gray-200 shadow-sm transition-all duration-200 hover:scale-[1.01]"
            >
              <div className="flex justify-between items-center">
                <span className={`font-medium ${colorClass}`}>{item.label}</span>
                <span className={`font-bold ${colorClass}`}>
                  {item.value ?? "-"} {cls.units}
                </span>
              </div>
              <div className="text-xs text-gray-600 mt-1 leading-snug">
                {cls.message} <br />
                <span className="italic">Target: {cls.target}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Simpan history harian ke Firebase
const saveDailyHistory = async (dateKey, data, usage) => {
  try {
    await set(ref(db, `history/${dateKey}`), {
      ...data,  // simpan semua data sensor (kolam, kandang, dll)
      usage     // tambahkan penggunaan energi/air/efisiensi
    });
  } catch (err) {
    console.error("Gagal menyimpan history:", err);
  }
};


export default function Monitoring() {
  const [data, setData] = useState({});
  const [usage, setUsage] = useState({
    energy: { value: 0, diff: 0 },
    water: { value: 0, diff: 0 },
    efficiency: { value: 0, diff: 0 },
  });
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const unsub1 = onValue(ref(db, "sensor"), (snap) => {
      setData(snap.val() || {});
    });

    const unsub2 = onValue(ref(db, "usage"), (snap) => {
      const val = snap.val() || {};
      setUsage({
        energy: val.energy || { value: 0, diff: 0 },
        water: val.water || { value: 0, diff: 0 },
        efficiency: val.efficiency || { value: 0, diff: 0 },
      });
    });

    const unsub3 = onValue(ref(db, "history"), (snap) => {
      const val = snap.val() || {};
      const arr = Object.keys(val)
        .sort()
        .slice(-7)
        .map((date) => ({
          date,
          energy: val[date]?.usage?.energy?.value || 0,
          water: val[date]?.usage?.water?.value || 0,
          efficiency: val[date]?.usage?.efficiency?.value || 0,
        }));
      setHistory(arr);
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, []);

  useEffect(() => {
    if (Object.keys(data).length > 0 && usage.energy?.value) {
      const today = new Date().toISOString().split("T")[0];
      saveDailyHistory(today, data, usage);
    }
  }, [data, usage]);

  return (
    <div className="flex flex-col w-full">
      <Header />

      {/* Judul + Logo Global */}
      <div className="px-6 pt-4 flex items-center gap-3">
        <motion.div
          initial={{ rotate: -180, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <Leaf className="w-10 h-10 text-green-600" />
        </motion.div>
        <div>
          <h1 className="text-2xl font-bold">Monitoring</h1>
          <div className="text-sm text-gray-600">Pantau sistem budidaya Anda</div>
        </div>
      </div>

      {/* Kotak penggunaan */}
      {/* PENYESUAIAN: Grid ini sudah responsif, 1 kolom di mobile, 3 di desktop. Tidak ada perubahan. */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
        <StatBox title="Penggunaan Energi" value={`${usage.energy?.value ?? 0} kWh`} diff={usage.energy?.diff ?? 0} Icon={Zap} color="text-yellow-500" />
        <StatBox title="Penggunaan Air" value={`${usage.water?.value ?? 0} L`} diff={usage.water?.diff ?? 0} Icon={Droplet} color="text-blue-500" />
        <StatBox title="Efisiensi Sistem" value={`${usage.efficiency?.value ?? 0}%`} diff={usage.efficiency?.diff ?? 0} Icon={Gauge} color="text-green-600" />
      </div>

      {/* Grafik Tren */}
      <div className="px-6 mb-6 transition-opacity duration-700">
        <div className="bg-white border rounded-xl shadow p-4 hover:shadow-lg transition-all duration-300">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            Tren 7 Hari Terakhir
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="energy" stroke="#16a34a" name="Energi (kWh)" />
              <Line type="monotone" dataKey="water" stroke="#2563eb" name="Air (L)" />
              <Line type="monotone" dataKey="efficiency" stroke="#f59e0b" name="Efisiensi (%)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Card budidaya */}
      {/* PENYESUAIAN:
        Kelas grid diubah untuk memberikan tata letak yang lebih baik di layar tablet.
        - `lg:grid-cols-3` ditambahkan agar di tablet besar menampilkan 3 kolom.
        - `lg:grid-cols-4` diubah menjadi `xl:grid-cols-4` agar 4 kolom hanya aktif di layar yang sangat lebar.
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6">
        <CategoryCard
          domain="kolam"
          title="Kolam Ikan"
          Icon={Fish}
          color="text-blue-600"
          items={[
            { label: "Suhu Air", metric: "suhu", value: data.kolam?.suhu ?? "-" },
            { label: "pH Air", metric: "ph", value: data.kolam?.ph ?? "-" },
            { label: "Oksigen Terlarut", metric: "oksigen", value: data.kolam?.oksigen ?? "-" },
            {
              label: "Amonia",
              metric: "amonia_total",
              value: data.kolam?.amonia ?? "-",
              extras: { ph: data.kolam?.ph, suhu: data.kolam?.suhu },
            },
          ]}
        />
        <CategoryCard
          domain="ulat"
          title="Cacing Sutra"
          Icon={Bug}
          color="text-amber-800"
          items={[
            { label: "Suhu Air", metric: "suhu", value: data.ulat?.suhu != null ? Number(data.ulat?.suhu) : "-" },
            { label: "pH Air", metric: "ph", value: data.ulat?.ph != null ? Number(data.ulat?.ph) : "-" },
            { label: "Oksigen Terlarut", metric: "oksigen", value: data.ulat?.oksigen != null ? Number(data.ulat?.oksigen) : "-" },
            { label: "Amonia", metric: "amonia_total", value: data.ulat?.amonia != null ? Number(data.ulat?.amonia) : "-" },
          ]}
        />
        <CategoryCard
          domain="kandang"
          title="Kandang"
          Icon={Home}
          color="text-yellow-600"
          items={[
            { label: "Suhu Udara", metric: "suhu", value: data.kandang?.suhu ?? "-", extras: { kelembaban: data.kandang?.kelembaban } },
            { label: "Kelembapan Udara", metric: "kelembaban", value: data.kandang?.kelembaban ?? "-" },
            { label: "Kualitas Udara", metric: "amonia", value: data.kandang?.kualitas_udara ?? "-" },
            { label: "Pencahayaan", metric: "intensitas_cahaya", value: data.kandang?.pencahayaan ?? "-" },
          ]}
        />
        <CategoryCard
          domain="hidroponik"
          title="Hidroponik"
          Icon={Sprout}
          color="text-green-600"
          items={[
            { label: "pH Air", metric: "ph", value: data.hidroponik?.ph ?? "-" },
            { label: "Suhu Air", metric: "suhu", value: data.hidroponik?.suhu ?? "-" },
            { label: "Kelembapan Udara", metric: "kelembaban", value: data.hidroponik?.kelembaban ?? "-" },
            { label: "Intensitas Cahaya", metric: "intensitas_cahaya", value: data.hidroponik?.intensitas_cahaya ?? "-" },
            { label: "Aliran Nutrisi (EC)", metric: "ec", value: data.hidroponik?.aliran_nutrisi ?? "-" },
          ]}
        />
      </div>
    </div>
  );
}