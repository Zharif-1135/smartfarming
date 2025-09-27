import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

// Konfigurasi Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAsTrJJ0HtwNpLUWC_j5US4tulrxX2w7UU",
  authDomain: "smart-farming-dashboard-35b8b.firebaseapp.com",
  databaseURL: "https://smart-farming-dashboard-35b8b-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smart-farming-dashboard-35b8b",
  storageBucket: "smart-farming-dashboard-35b8b.appspot.com",
  messagingSenderId: "957502421949",
  appId: "1:957502421949:web:82450004eac17bafc1b0d4",
  measurementId: "G-VSGBLP8JQ4"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Inisialisasi Realtime Database
const db = getDatabase(app);

/* ==========
   Fungsi Cache Offline (localStorage)
   ========== */
function setCachedValue(path, data) {
  try {
    localStorage.setItem("cache_" + path, JSON.stringify(data));
  } catch (err) {
    console.warn("Gagal simpan cache:", err);
  }
}

function getCachedValue(path) {
  try {
    const raw = localStorage.getItem("cache_" + path);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn("Gagal ambil cache:", err);
    return null;
  }
}

/* ==========
   Listener dengan Cache
   ========== */
function listenWithCache(path, callback) {
  const dbRef = ref(db, path);

  // Ambil cache dulu (kalau ada)
  const cached = getCachedValue(path);
  if (cached) {
    callback(cached, true); // true = dari cache
  }

  // Dengarkan update realtime dari Firebase
  onValue(dbRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      setCachedValue(path, data);
      callback(data, false); // false = data dari server
    }
  });
}

/* ==========
   Export
   ========== */
export { db, ref, set, onValue, listenWithCache, getCachedValue };