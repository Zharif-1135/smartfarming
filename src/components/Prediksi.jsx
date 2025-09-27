import * as tf from "@tensorflow/tfjs";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";
import { classify, thresholds } from "../utils/Threshold";

// --- KONFIGURASI ---
const ACCUWEATHER_API_KEY = "zoka_dd02f3fe7458d4c34ba195d242ea840d4_1a3c2bfa";
const LOCATION_KEY = "205120"; // Lhokseumawe
const WINDOW = 7, MIN_TRAIN = 14, MAX_EPOCHS = 80, BATCH = 8, LR = 0.01;
const DEFAULT_CYCLES = { kolam: 120, cacing_sutra: 14, kandang: 35, hidroponik: 30 };

// --- UTILITAS ---
const toNum = (v) => v === undefined || v === null || v === "-" || v === "" || Number.isNaN(Number(v)) ? NaN : Number(v);
const safe = (x, d = NaN) => (Number.isFinite(x) ? x : d);

// --- PENGAMBILAN DATA ---
export async function getHistory() {
  return new Promise((resolve) => {
    onValue(ref(db, "history"), (snap) => {
      const raw = snap.val() || {};
      const days = Object.keys(raw).sort().slice(-60);
      resolve(days.map((d) => ({ date: d, ...raw[d] })));
    }, { onlyOnce: true });
  });
}

/**
 * FINAL: Mengambil dan memproses data prakiraan cuaca dari AccuWeather.
 */
export async function getTomorrowWeather() {
  const fallback = { suhuAvg: NaN, suhuMin: NaN, suhuMax: NaN, kelembaban: NaN, cloud: NaN, wind: NaN, phrase: "Gagal memuat", hasPrecipitation: false };
  try {
    const res = await fetch(`https://dataservice.accuweather.com/forecasts/v1/daily/1day/${LOCATION_KEY}?apikey=${ACCUWEATHER_API_KEY}&language=id&details=true&metric=true`);
    if (!res.ok) {
      console.error("AccuWeather API GAGAL:", res.status, await res.text());
      return fallback;
    }
    const data = await res.json();
    console.log("✅ Data Cuaca Esok Diterima:", data);

    if (data?.DailyForecasts?.[0]) {
      const d = data.DailyForecasts[0];
      const temp = d.Temperature;
      const dayInfo = d.Day || {};
      return {
        suhuAvg: (temp?.Minimum?.Value + temp?.Maximum?.Value) / 2,
        suhuMin: temp?.Minimum?.Value,
        suhuMax: temp?.Maximum?.Value,
        kelembaban: dayInfo.RelativeHumidity?.Average,
        cloud: dayInfo.CloudCover,
        wind: dayInfo.Wind?.Speed?.Value,
        phrase: dayInfo.IconPhrase,
        hasPrecipitation: dayInfo.HasPrecipitation,
      };
    }
    return fallback;
  } catch (e) {
    console.error("Error di getTomorrowWeather:", e);
    return fallback;
  }
}

// =========================== MODEL TF.JS ==================================
function modelName(domain, metric) {
  return `idxdb://prediksi-${domain}-${metric}`.replace(/\./g, "_");
}

function buildModel(inputSize) {
  const model = tf.sequential();
  model.add(tf.layers.reshape({ targetShape: [WINDOW, inputSize], inputShape: [WINDOW * inputSize] }));
  model.add(tf.layers.lstm({ units: 16, returnSequences: false }));
  model.add(tf.layers.dense({ units: 8, activation: "relu" }));
  model.add(tf.layers.dense({ units: 1 }));
  model.compile({ optimizer: tf.train.adam(LR), loss: "meanSquaredError" });
  return model;
}

function makeXY(series, exoSeries, window = WINDOW) {
  const X = [], y = [];
  const inSize = 1 + (exoSeries?.[0]?.length || 0);
  for (let i = 0; i + window < series.length; i++) {
    const base = series.slice(i, i + window).map((v) => [safe(v, 0)]);
    const exoSlice = (exoSeries || []).slice(i, i + window);
    const merged = base.map((row, idx) => row.concat(exoSlice[idx] || []));
    X.push(merged.flat());
    y.push(series[i + window]);
  }
  return { X: tf.tensor2d(X), y: tf.tensor2d(y, [y.length, 1]), inputSize: inSize };
}

function defaultNormalize(arr) {
  const valid = arr.filter((v) => Number.isFinite(v));
  if (valid.length === 0) { // Menangani kasus jika tidak ada data valid
      const emptyNorm = arr.map(() => NaN);
      emptyNorm.min = 0; emptyNorm.max = 1;
      return emptyNorm;
  }
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const scale = max - min || 1;
  const norm = arr.map((v) => (Number.isFinite(v) ? (v - min) / scale : NaN));
  norm.min = min; norm.max = max;
  return norm;
}

function denorm(x, cfg) { return cfg.min + x * (cfg.max - cfg.min || 1); }

async function trainOrLoad(domain, metric, series, exoSeries) {
  const name = modelName(domain, metric);
  let model;
  try { model = await tf.loadLayersModel(name); } catch (_) {}
  if (!model) {
    const norm = defaultNormalize(series);
    const exoNorm = (exoSeries || []).map((row) => row.map((v, j) => {
      const ranges = [40, 100, 100, 20];
      return Number.isFinite(v) ? Math.max(0, Math.min(1, v / (ranges[j] || 1))) : 0;
    }));

    const { X, y, inputSize } = makeXY(norm, exoNorm);
    if (X.shape[0] < 4) return null;

    model = buildModel(inputSize);
    try {
      await model.fit(X, y, { epochs: Math.min(MAX_EPOCHS, 20 + X.shape[0] * 2), batchSize: BATCH, verbose: 0 });
      await model.save(name);
    } finally {
      X.dispose(); y.dispose();
    }
    model.__normCfg = norm;
  }
  return model;
}

export async function predictNext(domain, metric, series, exoSeries, tomorrowExo) {
  const last = series[series.length - 1];
  if (series.length < MIN_TRAIN) return { value: last, source: "naive" };

  const model = await trainOrLoad(domain, metric, series, exoSeries);
  if (!model) return { value: last, source: "naive" };

  const norm = model.__normCfg || defaultNormalize(series);
  const sNorm = defaultNormalize(series).map((x) => (x - norm.min) / ((norm.max - norm.min) || 1));
  const exoNorm = (exoSeries || []).map((row) => [
    Number.isFinite(row?.[0]) ? Math.max(0, Math.min(1, row[0] / 40)) : 0,
    Number.isFinite(row?.[1]) ? Math.max(0, Math.min(1, row[1] / 100)) : 0,
    Number.isFinite(row?.[2]) ? Math.max(0, Math.min(1, row[2] / 100)) : 0,
    Number.isFinite(row?.[3]) ? Math.max(0, Math.min(1, row[3] / 20)) : 0,
  ]);

  const window = sNorm.slice(-WINDOW);
  const exoWin = exoNorm.slice(-WINDOW);
  const exoTomorrow = [
    Number.isFinite(tomorrowExo?.suhu) ? Math.max(0, Math.min(1, tomorrowExo.suhu / 40)) : 0,
    Number.isFinite(tomorrowExo?.kelembaban) ? Math.max(0, Math.min(1, tomorrowExo.kelembaban / 100)) : 0,
    Number.isFinite(tomorrowExo?.cloud) ? Math.max(0, Math.min(1, tomorrowExo.cloud / 100)) : 0,
    Number.isFinite(tomorrowExo?.wind) ? Math.max(0, Math.min(1, tomorrowExo.wind / 20)) : 0,
  ];
  const exoInput = exoWin.slice(0, WINDOW - 1).concat([exoTomorrow]);

  const input = tf.tensor2d([window.map((v) => [v]).map((row, i) => row.concat(exoInput[i])).flat()]);
  const pred = model.predict(input);
  const val = (await pred.data())[0];
  pred.dispose(); input.dispose();

  const y = denorm(val, norm);
  if (!Number.isFinite(y)) return { value: last, source: "naive" };
  return { value: y, source: "tfjs" };
}

// =========================== ESTIMASI PANEN ===============================
function progressIndex(domain, lastNDays) {
  const defs = thresholds[domain];
  if (!defs) return 0.5;
  const items = Object.keys(defs);
  let score = 0, count = 0;
  lastNDays.forEach((day) => {
    items.forEach((metric) => {
      const v = toNum(day?.[domain]?.[metric === "ec" ? "aliran_nutrisi" : metric]);
      if (!Number.isFinite(v)) return;
      const cls = classify(domain, metric, v, {
        ph: toNum(day?.kolam?.ph),
        suhu: toNum(day?.kolam?.suhu),
        kelembaban: toNum(day?.kandang?.kelembaban),
      });
      score += cls.level === "ok" ? 1 : cls.level === "warning" ? 0.6 : 0.2;
      count++;
    });
  });
  return count ? score / count : 0.5;
}

export function estimateHarvestDays(domain, lastNDays) {
  const base = DEFAULT_CYCLES[domain] || 30;
  const p = progressIndex(domain, lastNDays);
  const adj = base / p * 0.8;
  const clamp = Math.max(0.6 * base, Math.min(1.6 * base, adj));
  return Math.round(clamp);
}