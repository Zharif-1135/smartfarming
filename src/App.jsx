// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Sidebar from './components/Sidebar'

// === TAMBAHKAN IMPORT INI ===
import { WeatherProvider } from './context/WeatherContext'
// =============================

// lazy load pages
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const Kontrol = lazy(() => import('./pages/Kontrol.jsx'))
const Monitoring = lazy(() => import('./pages/Monitoring.jsx'))
const Prediksi = lazy(() => import('./pages/Prediksi.jsx'))
const Riwayat = lazy(() => import('./pages/Riwayat.jsx'))
const RiwayatChart = lazy(() => import('./pages/RiwayatChart.jsx'))
// Kita asumsikan Anda sudah menambahkan DigitalTwin.jsx dari langkah sebelumnya
const DigitalTwin = lazy(() => import('./pages/DigitalTwin.jsx'))

function App() {
  return (
    // === BUNGKUS DENGAN WEATHERPROVIDER ===
    <WeatherProvider>
      <Router>
        <Sidebar />
        {/* Padding ini untuk memberi ruang agar tidak tertutup sidebar */}
        <main className="ml-0 md:ml-16 transition-all duration-300">
          <Suspense fallback={
            <div className="flex justify-center items-center h-screen">
              <p>Memuat Halaman...</p>
            </div>
          }>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/kontrol" element={<Kontrol />} />
              <Route path="/monitoring" element={<Monitoring />} />
              <Route path="/prediksi" element={<Prediksi />} />
              <Route path="/riwayat" element={<Riwayat />} />
              <Route path="/riwayat-chart" element={<RiwayatChart />} />
              <Route path="/digital-twin" element={<DigitalTwin />} />
            </Routes>
          </Suspense>
        </main>
      </Router>
    </WeatherProvider>
    // ======================================
  )
}

export default App