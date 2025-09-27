import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FiMenu, FiX, FiHome, FiActivity, FiSliders, FiClock, FiBarChart } from "react-icons/fi";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const menuItems = [
    { to: "/", label: "Dashboard", icon: FiHome },
    { to: "/monitoring", label: "Monitoring", icon: FiActivity },
    { to: "/kontrol", label: "Kontrol", icon: FiSliders },
    { to: "/riwayat", label: "Riwayat", icon: FiClock },
    { to: "/prediksi", label: "Prediksi", icon: FiBarChart },
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

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-green-600 via-green-800 to-black text-white transform ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out z-50 shadow-xl flex flex-col`}
      >
        {/* Header Sidebar */}
        <div className="flex justify-between items-center p-4 border-b border-green-500">
          <h1 className="text-xl font-bold tracking-wide flex items-center gap-2">
            🌱 SmartFarm
          </h1>
          <button
            onClick={() => setIsOpen(false)}
            className="text-2xl hover:text-green-300 transition-colors duration-200"
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
        <div className="border-t border-green-500 p-4 text-xs text-gray-300">
          <p className="font-mono">v1.0.0</p>
          <p>© 2025 Malikussaleh Smartfarm</p>
        </div>
      </div>
    </>
  );
}
