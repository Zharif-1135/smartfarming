// src/workers/prediksi.worker.js
// Worker untuk training model TensorFlow.js di background
/* eslint-env worker */
/* global globalThis */

import * as tf from "@tensorflow/tfjs";

// Gunakan globalThis agar lint tidak error, di Worker globalThis === self
globalThis.onmessage = async (e) => {
  const { type, payload } = e.data || {};
  try {
    if (type === "train") {
      const { jobs, epochs = 12, batchSize = 8 } = payload;

      const results = {};
      for (let i = 0; i < jobs.length; i++) {
        const { key, x, y, inputShape } = jobs[i];

        // Bangun model kecil (GRU -> Dense)
        const model = tf.sequential();
        model.add(
          tf.layers.gru({
            units: 16,
            inputShape,
            returnSequences: false,
            recurrentActivation: "sigmoid",
          })
        );
        model.add(tf.layers.dense({ units: 1 }));

        model.compile({
          optimizer: tf.train.adam(0.01),
          loss: "meanAbsoluteError",
        });

        const tx = tf.tensor3d(x);   // shape [N, win, 1]
        const ty = tf.tensor2d(y);   // shape [N, 1]

        // kirim progress tiap epoch
        await model.fit(tx, ty, {
          epochs,
          batchSize,
          shuffle: true,
          callbacks: {
            onEpochEnd: (epoch, logs) => {
              globalThis.postMessage({
                type: "progress",
                payload: { key, epoch, epochs, loss: logs?.loss },
              });
            },
          },
        });

        // simpan model jadi artifacts
        const saveRes = await model.save(
          tf.io.withSaveHandler(async (artifacts) => artifacts)
        );

        tx.dispose();
        ty.dispose();
        model.dispose();
        results[key] = saveRes; // { modelArtifactsInfo, modelArtifacts }
      }

      globalThis.postMessage({ type: "done", payload: { results } });
    }
  } catch (err) {
    globalThis.postMessage({ type: "error", payload: { message: err?.message || String(err) } });
  }
};