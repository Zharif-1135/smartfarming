// src/pages/Riwayat.jsx
import React, { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db as firebaseDB } from "../firebase.js";
import Header from "../components/Header.jsx";
import { classify } from "../utils/Threshold.js";
import {
  Droplets,
  Thermometer,
  Zap,
  Sun,
  Leaf,
  Wind,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  BarChart3,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getAllData, setData } from "../db"; // 🔥 IndexedDB utils

// helper
const toNum = (v) =>
  v === "-" || v === "" || v === null || v === undefined ? NaN : Number(v);

const toneColors = {
  ok: "bg-green-50 border-green-300 text-green-700",
  warn: "bg-yellow-50 border-yellow-300 text-yellow-700",
  danger: "bg-red-50 border-red-300 text-red-700",
  missing: "bg-gray-50 border-gray-300 text-gray-500",
};

const toneIcon = {
  ok: <CheckCircle2 className="w-5 h-5 text-green-600" />,
  warn: <AlertTriangle className="w-5 h-5 text-yellow-600" />,
  danger: <XCircle className="w-5 h-5 text-red-600" />,
  missing: <AlertTriangle className="w-5 h-5 text-gray-500" />,
};

const iconForLabel = (label) => {
  if (/suhu/i.test(label)) return <Thermometer className="w-5 h-5" />;
  if (/pH/i.test(label)) return <Droplets className="w-5 h-5" />;
  if (/oksigen/i.test(label)) return <Wind className="w-5 h-5" />;
  if (/kelembapan|kelembaban/i.test(label)) return <Droplets className="w-5 h-5" />;
  if (/air|energi|listrik/i.test(label)) return <Zap className="w-5 h-5" />;
  if (/cahaya/i.test(label)) return <Sun className="w-5 h-5" />;
  if (/nutrisi|ec/i.test(label)) return <Leaf className="w-5 h-5" />;
  return <Leaf className="w-5 h-5" />;
};

const mapTone = (cls, val) => {
  if (val === "-" || val === null || val === undefined) return "missing";
  if (cls.level === "ok") return "ok";
  if (cls.level === "warning") return "warn";
  if (cls.level === "danger") return "danger";
  return "missing";
};

const ParamCard = ({ domain, metric, label, value, extras }) => {
  const num = toNum(value);
  const cls = Number.isFinite(num)
    ? classify(domain, metric, num, extras)
    : { level: "unknown", message: "Data tidak tersedia", target: "-" };
  const tone = mapTone(cls, value);
  const unit = cls.units || "";

  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3 ${toneColors[tone]}`}>
      <div className="mt-0.5">{iconForLabel(label)}</div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="font-medium">{label}</span>
          <div className="flex items-center gap-1">
            {toneIcon[tone]}
            <span className="font-semibold">
              {value ?? "-"} {unit}
            </span>
          </div>
        </div>
        <div className="text-xs mt-1">
          {cls.message} <span className="italic">Target: {cls.target}</span>
        </div>
      </div>
    </div>
  );
};

const DayCard = ({ dateKey, data, usage }) => {
  return (
    <div className="rounded-2xl bg-white shadow-md border overflow-hidden hover:shadow-lg transition-all">
      <div className="px-5 py-3 border-b flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg">{dateKey}</h2>
          <p className="text-sm text-gray-600">Riwayat parameter lengkap</p>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Kolam Ikan */}
        <div>
          <h3 className="font-semibold mb-3 text-emerald-700">Kolam Ikan</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <ParamCard domain="kolam" metric="suhu" label="Suhu Air" value={data?.kolam?.suhu ?? "-"} />
            <ParamCard domain="kolam" metric="ph" label="pH Air" value={data?.kolam?.ph ?? "-"} />
            <ParamCard domain="kolam" metric="oksigen" label="Oksigen Terlarut" value={data?.kolam?.oksigen ?? "-"} />
            <ParamCard
              domain="kolam"
              metric="amonia_total"
              label="Amonia"
              value={data?.kolam?.amonia ?? "-"}
              extras={{ ph: data?.kolam?.ph, suhu: data?.kolam?.suhu }}
            />
          </div>
        </div>

        {/* Cacing Sutra */}
        <div>
          <h3 className="font-semibold mb-3 text-emerald-700">Cacing Sutra</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <ParamCard domain="ulat" metric="suhu" label="Suhu Air" value={data?.ulat?.suhu ?? "-"} />
            <ParamCard domain="ulat" metric="ph" label="pH Air" value={data?.ulat?.ph ?? "-"} />
            <ParamCard domain="ulat" metric="oksigen" label="Oksigen Terlarut" value={data?.ulat?.oksigen ?? "-"} />
            <ParamCard domain="ulat" metric="amonia_total" label="Amonia" value={data?.ulat?.amonia ?? "-"} />
          </div>
        </div>

        {/* Kandang */}
        <div>
          <h3 className="font-semibold mb-3 text-emerald-700">Kandang</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <ParamCard
              domain="kandang"
              metric="suhu"
              label="Suhu Udara"
              value={data?.kandang?.suhu ?? "-"}
              extras={{ kelembaban: data?.kandang?.kelembaban }}
            />
            <ParamCard domain="kandang" metric="kelembaban" label="Kelembapan Udara" value={data?.kandang?.kelembaban ?? "-"} />
            <ParamCard domain="kandang" metric="amonia" label="Kualitas Udara" value={data?.kandang?.kualitas_udara ?? "-"} />
            <ParamCard domain="kandang" metric="intensitas_cahaya" label="Pencahayaan" value={data?.kandang?.pencahayaan ?? "-"} />
          </div>
        </div>

        {/* Hidroponik */}
        <div>
          <h3 className="font-semibold mb-3 text-emerald-700">Hidroponik</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <ParamCard domain="hidroponik" metric="ph" label="pH Air" value={data?.hidroponik?.ph ?? "-"} />
            <ParamCard domain="hidroponik" metric="suhu" label="Suhu Air" value={data?.hidroponik?.suhu ?? "-"} />
            <ParamCard domain="hidroponik" metric="kelembaban" label="Kelembapan Udara" value={data?.hidroponik?.kelembaban ?? "-"} />
            <ParamCard domain="hidroponik" metric="intensitas_cahaya" label="Intensitas Cahaya" value={data?.hidroponik?.intensitas_cahaya ?? "-"} />
            <ParamCard domain="hidroponik" metric="ec" label="Aliran Nutrisi (EC)" value={data?.hidroponik?.aliran_nutrisi ?? "-"} />
          </div>
        </div>

        {/* Usage */}
        <div>
          <h3 className="font-semibold mb-3 text-emerald-700">Penggunaan Sistem</h3>
          <div className="grid md:grid-cols-3 gap-3">
            <ParamCard domain="usage" metric="energy" label="Energi (kWh)" value={usage?.energy?.value ?? "-"} />
            <ParamCard domain="usage" metric="water" label="Air (L)" value={usage?.water?.value ?? "-"} />
            <ParamCard domain="usage" metric="efficiency" label="Efisiensi (%)" value={usage?.efficiency?.value ?? "-"} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Riwayat() {
  const [history, setHistory] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    if (navigator.onLine) {
      const unsub = onValue(ref(firebaseDB, "history"), (snap) => {
        const val = snap.val() || {};
        setHistory(val);

        // simpan ke IndexedDB per tanggal
        Object.entries(val).forEach(([date, obj]) => {
          setData("history", { date, ...obj });
        });
      });
      return () => unsub();
    } else {
      (async () => {
        const offline = await getAllData("history");
        const obj = {};
        offline.forEach((d) => (obj[d.date] = d));
        setHistory(obj);
      })();
    }
  }, []);

  const dates = Object.keys(history).sort((a, b) => (a < b ? 1 : -1));

  return (
    <div className="p-6 space-y-6">
      <Header />

      {/* Header + tombol ke chart */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Riwayat Harian</h1>
          <p className="text-sm text-gray-600">
            Pantau kondisi lengkap dari semua parameter budidaya.
          </p>
        </div>
        <button
          onClick={() => navigate("/riwayat-chart")}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition"
        >
          <BarChart3 className="w-4 h-4" />
          Statistik 7 Hari
        </button>
      </div>

      {/* isi riwayat */}
      <div className="space-y-6">
        {dates.length > 0 ? (
          dates.map((d) => (
            <DayCard
              key={d}
              dateKey={d}
              data={{
                kolam: history[d]?.kolam,
                ulat: history[d]?.ulat,
                kandang: history[d]?.kandang,
                hidroponik: history[d]?.hidroponik,
              }}
              usage={history[d]?.usage}
            />
          ))
        ) : (
          <div className="rounded-xl border p-6 text-center text-gray-500">
            Belum ada data riwayat.
          </div>
        )}
      </div>
    </div>
  );
}
