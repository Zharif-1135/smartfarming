import { useEffect, useState } from "react";
import { Sprout } from "lucide-react";
import unimalLogo from "../img/unimal.png"

export default function Header() {
  const [dateTime, setDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = dateTime.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const formattedDate = dateTime.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <header className="bg-white shadow-md px-6 py-3 flex items-center justify-between">

      {/* Logo Tengah */}
      <div className="flex items-center gap-3 absolute left-1/2 transform -translate-x-1/2">
        <img
          src={unimalLogo}
          alt="Universitas Malikussaleh"
          className="h-10 w-auto object-contain"
        />
        <Sprout className="h-9 w-9 text-green-600" />
        <h1 className="text-lg font-bold text-gray-800 hidden sm:block">
          Smart Farming Dashboard
        </h1>
      </div>

      {/* Waktu Kanan */}
      <div className="ml-auto text-right">
        <div className="font-mono text-base font-semibold text-gray-700">
          {formattedTime}
        </div>
        <div className="text-xs text-gray-500">{formattedDate}</div>
      </div>
    </header>
  );
}
