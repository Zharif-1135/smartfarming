// src/db.js
import { openDB } from "idb";

export const initDB = async () => {
  return openDB("myAppDB", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("history")) {
        db.createObjectStore("history", { keyPath: "date" });
      }
      if (!db.objectStoreNames.contains("weather")) {
        db.createObjectStore("weather", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("prediksi")) {
        db.createObjectStore("prediksi", { keyPath: "key" });
      }
    },
  });
};

export const setData = async (store, data) => {
  const db = await initDB();
  return db.put(store, data);
};

export const getData = async (store, key) => {
  const db = await initDB();
  return db.get(store, key);
};

export const getAllData = async (store) => {
  const db = await initDB();
  return db.getAll(store);
};
