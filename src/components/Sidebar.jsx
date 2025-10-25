// src/components/Sidebar.jsx
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
// Tambahkan FiCpu di sini
import { FiMenu, FiX, FiHome, FiActivity, FiSliders, FiClock, FiBarChart, FiCpu } from "react-icons/fi";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const menuItems = [
    { to: "/", label: "Dashboard", icon: FiHome },
    { to: "/monitoring", label: "Monitoring", icon: FiActivity },
    { to: "/kontrol", label: "Kontrol", icon: FiSliders },
    { to: "/riwayat", label: "Riwayat", icon: FiClock },
    { to: "/prediksi", label: "Prediksi", icon: FiBarChart },
    // === TAMBAHKAN BARIS INI ===
    { to: "/digital-twin", label: "Digital Twin", icon: FiCpu },
    // ===========================
  ];

  return (
    <>
      {/* Tombol Hamburger */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 bg-green-600 text-white p-2 rounded-md shadow-lg hover:bg-green-700 transition-colors duration-200"
      >
        <FiMenu size={22} />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* --- KONTEN SIDEBAR --- */}
      {/* (Tidak ada perubahan di bawah ini, saya persingkat agar fokus) */}
      <aside
        className={`fixed top-0 left-0 w-64 h-full bg-green-600 text-white flex flex-col z-50 shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header Sidebar */}
        <div className="flex items-center justify-between p-4 border-b border-green-500">
          <h2 className="text-xl font-bold text-green-100">SmartFarm</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-green-200 hover:text-green-300 transition-colors duration-200"
          >
            <FiX />
          </button>
        </div>

        {/* Menu Navigasi */}
        <nav className="flex-1 flex flex-col space-y-1 p-4 text-base">
          {menuItems.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-md relative group transition-all duration-200 ${
                  active
                    ? "bg-green-700 text-green-100 font-semibold"
                    : "hover:bg-green-700 hover:text-green-200"
                }`}
              >
                {/* Highlight bar di kiri */}
                {active && (
                  <span className="absolute left-0 top-0 h-full w-1 bg-green-300 rounded-r-lg" />
                )}
                <Icon className="text-xl" />
                <span className="group-hover:translate-x-1 transition-transform duration-200">
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-green-500 p-4">
          <p className="text-xs text-green-200 text-center">
            © 2024 Smart Farming UNIMAL
          </p>
        </div>
      </aside>
    </>
  );
}