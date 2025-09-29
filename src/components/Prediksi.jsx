// src/components/Prediksi.jsx
import * as tf from "@tensorflow/tfjs";
import { get, ref } from "firebase/database";
import { db } from "../firebase";

// --- KONFIGURASI ---
const MODEL_STORAGE_PATH = "indexeddb://sensor-prediction-model";
const METADATA_STORAGE_KEY = "sensor-prediction-metadata";
const SEQUENCE_LENGTH = 7; // Menggunakan data 7 hari terakhir untuk memprediksi hari ke-8
const EPOCHS = 50; // Jumlah iterasi training

// Daftar fitur yang akan diprediksi (harus urut dan konsisten)
const FEATURE_KEYS = [
  "kolam.suhu", "kolam.ph", "kolam.oksigen", "kolam.amonia",
  "ulat.suhu", "ulat.ph", "ulat.oksigen", "ulat.amonia",
  "kandang.suhu", "kandang.kelembaban", "kandang.kualitas_udara", "kandang.pencahayaan",
  "hidroponik.ph", "hidroponik.suhu", "hidroponik.kelembaban", "hidroponik.intensitas_cahaya", "hidroponik.aliran_nutrisi",
  "usage.energy", "usage.water", "usage.efficiency"
];

// --- FUNGSI HELPER ---

/**
 * Mengambil data mentah dari Firebase 'history'
 */
const fetchHistoryData = async () => {
  const historyRef = ref(db, "history");
  const snapshot = await get(historyRef);
  const val = snapshot.val() || {};

  // Ubah objek menjadi array dan urutkan berdasarkan tanggal
  return Object.keys(val)
    .sort()
    .map((date) => {
      const dayData = val[date];
      // Memipihkan struktur data dan memastikan semua keys ada
      return FEATURE_KEYS.map(key => {
        const [domain, metric] = key.split('.');
        if (domain === 'usage') {
          return dayData[domain]?.[metric]?.value ?? 0;
        }
        return dayData[domain]?.[metric] ?? 0;
      });
    });
};

/**
 * Normalisasi data ke rentang 0-1 dan membuat sekuens
 * @returns {object} data yang sudah diproses dan metadata (min, max) untuk denormalisasi
 */
const preprocessData = (dataArray) => {
  if (dataArray.length < SEQUENCE_LENGTH + 1) {
    throw new Error("Data historis tidak cukup untuk training.");
  }

  const tensorData = tf.tensor2d(dataArray);
  const dataMin = tensorData.min(0);
  const dataMax = tensorData.max(0);
  const normalizedData = tensorData.sub(dataMin).div(dataMax.sub(dataMin));

  const sequences = [];
  const labels = [];
  const data = normalizedData.arraySync();

  for (let i = 0; i < data.length - SEQUENCE_LENGTH; i++) {
    sequences.push(data.slice(i, i + SEQUENCE_LENGTH));
    labels.push(data[i + SEQUENCE_LENGTH]);
  }

  return {
    sequences: tf.tensor3d(sequences),
    labels: tf.tensor2d(labels),
    metadata: {
      min: dataMin.arraySync(),
      max: dataMax.arraySync()
    }
  };
};

/**
 * Membuat model neural network (LSTM)
 */
const createModel = (numFeatures) => {
  const model = tf.sequential();
  model.add(tf.layers.lstm({
    units: 50,
    returnSequences: true,
    inputShape: [SEQUENCE_LENGTH, numFeatures]
  }));
  model.add(tf.layers.lstm({ units: 50, returnSequences: false }));
  model.add(tf.layers.dense({ units: numFeatures }));

  model.compile({
    optimizer: tf.train.adam(),
    loss: "meanSquaredError"
  });

  return model;
};

/**
 * Fungsi utama untuk melatih model baru dan menyimpannya
 */
const trainAndCacheModel = async (onProgress) => {
  onProgress("Mengambil data historis dari server...");
  const rawData = await fetchHistoryData();

  onProgress("Memproses data untuk training...");
  const { sequences, labels, metadata } = preprocessData(rawData);
  localStorage.setItem(METADATA_STORAGE_KEY, JSON.stringify(metadata));

  onProgress("Membuat arsitektur model...");
  const model = createModel(FEATURE_KEYS.length);

  onProgress(`Memulai training model (${EPOCHS} epochs)...`);
  await model.fit(sequences, labels, {
    epochs: EPOCHS,
    callbacks: {
      onEpochEnd: (epoch) => {
        onProgress(`Training... Epoch ${epoch + 1} / ${EPOCHS}`);
      }
    }
  });

  onProgress("Menyimpan model ke cache browser...");
  await model.save(MODEL_STORAGE_PATH);
  onProgress("Model berhasil dilatih dan disimpan.");
  return { model, metadata };
};

/**
 * Fungsi prediksi utama
 * @param {tf.LayersModel} model
 * @param {object} metadata
 * @returns {object} Hasil prediksi yang sudah di-denormalisasi dan terstruktur
 */
const predictNextDay = async (model, metadata) => {
  const rawData = await fetchHistoryData();
  if (rawData.length < SEQUENCE_LENGTH) {
    throw new Error("Data tidak cukup untuk membuat prediksi.");
  }
  
  const lastSequenceRaw = rawData.slice(-SEQUENCE_LENGTH);

  // Normalisasi input sequence menggunakan metadata yang tersimpan
  const minTensor = tf.tensor1d(metadata.min);
  const maxTensor = tf.tensor1d(metadata.max);
  const inputTensor = tf.tensor2d(lastSequenceRaw);
  const normalizedInput = inputTensor.sub(minTensor).div(maxTensor.sub(minTensor));
  
  // Lakukan prediksi
  const prediction = model.predict(normalizedInput.expandDims(0));
  
  // Denormalisasi hasil prediksi
  const denormalizedPrediction = prediction.mul(maxTensor.sub(minTensor)).add(minTensor);
  const predictionArray = denormalizedPrediction.dataSync();

  // Ubah hasil array menjadi objek yang mudah dibaca
  const result = {};
  FEATURE_KEYS.forEach((key, index) => {
    const [domain, metric] = key.split('.');
    if (!result[domain]) result[domain] = {};
    result[domain][metric] = predictionArray[index];
  });
  return result;
};


// --- FUNGSI EKSPOR UTAMA ---

/**
 * Mengelola seluruh alur kerja: memuat model dari cache atau melatih model baru, lalu membuat prediksi.
 * @param {function} setStatus - Callback untuk melaporkan status proses (misal: "Loading model...", "Training...")
 * @returns {object|null} Objek berisi prediksi atau null jika gagal.
 */
export const getPredictions = async (setStatus) => {
  let model;
  let metadata;

  try {
    setStatus("Mencari model di cache browser...");
    model = await tf.loadLayersModel(MODEL_STORAGE_PATH);
    metadata = JSON.parse(localStorage.getItem(METADATA_STORAGE_KEY));
    setStatus("Model ditemukan dan berhasil dimuat.");
  } catch (error) {
    console.warn("Model tidak ditemukan di cache. Memulai proses training baru.");
    try {
      const trainingResult = await trainAndCacheModel(setStatus);
      model = trainingResult.model;
      metadata = trainingResult.metadata;
    } catch (trainError) {
      console.error("Gagal melatih model:", trainError);
      setStatus(`Error: ${trainError.message}`);
      return null;
    }
  }

  try {
    setStatus("Membuat prediksi untuk esok hari...");
    const predictions = await predictNextDay(model, metadata);
    setStatus("Prediksi berhasil dibuat.");
    return predictions;
  } catch (predictError) {
    console.error("Gagal membuat prediksi:", predictError);
    setStatus(`Error: ${predictError.message}`);
    return null;
  }
};