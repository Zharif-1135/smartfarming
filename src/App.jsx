// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Sidebar from './components/Sidebar'   // ⬅️ tambahkan import Sidebar

// lazy load pages
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const Kontrol = lazy(() => import('./pages/Kontrol.jsx'))
const Monitoring = lazy(() => import('./pages/Monitoring.jsx'))
const Prediksi = lazy(() => import('./pages/Prediksi.jsx'))
const Riwayat = lazy(() => import('./pages/Riwayat.jsx'))
const RiwayatChart = lazy(() => import('./pages/RiwayatChart.jsx'))

function App() {
  return (
    <Router>
      {/* Sidebar selalu muncul */}
      <Sidebar />

      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/kontrol" element={<Kontrol />} />
          <Route path="/monitoring" element={<Monitoring />} />
          <Route path="/prediksi" element={<Prediksi />} />
          <Route path="/riwayat" element={<Riwayat />} />
          <Route path="/riwayat-chart" element={<RiwayatChart />} />
        </Routes>
      </Suspense>
    </Router>
  )
}

export default App
