// src/components/WeatherCard.jsx
import { useEffect, useState } from "react";
import { getAllData, setData } from "../db"; // ✅ IndexedDB utils

export default function WeatherCard() {
  const [weather, setWeather] = useState(null);

  // API & Location Key
  const API_KEY = import.meta.env.VITE_ACCUWEATHER_KEY;
  const LOCATION_KEY = "205120"; // Lhokseumawe

  const fetchWeather = async () => {
    const key = "current-weather";
    if (navigator.onLine) {
      try {
        const res = await fetch(
          `https://dataservice.accuweather.com/currentconditions/v1/${LOCATION_KEY}?apikey=${API_KEY}&language=id&details=true`
        );
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setWeather(data[0]);
          // simpan ke IndexedDB
          await setData("weather", { key, data: data[0] });
        } else {
          console.error("Data cuaca kosong atau tidak valid:", data);
        }
      } catch (err) {
        console.error("Gagal ambil data cuaca:", err);
        // fallback ke cache
        const offline = await getAllData("weather");
        const cached = offline.find((d) => d.key === key);
        if (cached) setWeather(cached.data);
      }
    } else {
      // OFFLINE → ambil cache dari IndexedDB
      const offline = await getAllData("weather");
      const cached = offline.find((d) => d.key === key);
      if (cached) setWeather(cached.data);
    }
  };

  useEffect(() => {
    fetchWeather(); // Ambil pertama kali
    const interval = setInterval(fetchWeather, 60 * 60 * 1000); // refresh tiap 1 jam
    return () => clearInterval(interval);
  }, []);

  if (!weather) {
    return (
      <div className="bg-white border rounded-xl shadow p-4">
        <h3 className="font-bold mb-3">Kondisi Cuaca</h3>
        <p className="text-sm text-gray-500">Memuat data cuaca...</p>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-xl shadow p-4">
      <h3 className="font-bold mb-3">Kondisi Cuaca</h3>
      <p className="text-lg font-semibold">
        {weather.Temperature?.Metric?.Value}°C
      </p>
      <p className="capitalize text-sm">{weather.WeatherText}</p>
      <p className="text-sm mt-2">
        Kelembaban: {weather.RelativeHumidity}% | Angin:{" "}
        {weather.Wind?.Speed?.Metric?.Value} km/h
      </p>
    </div>
  );
}
