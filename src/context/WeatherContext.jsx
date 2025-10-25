// src/context/WeatherContext.jsx
import { createContext, useState, useContext } from 'react';

// 1. Buat Context
const WeatherContext = createContext(null);

// 2. Buat Provider (Pembungkus)
export function WeatherProvider({ children }) {
  const [weatherData, setWeatherData] = useState({
    wxNow: null,      // Data cuaca saat ini
    wxDaily: null,    // Data ramalan harian (jika kita butuh)
    isLoading: true,
  });

  return (
    <WeatherContext.Provider value={{ weatherData, setWeatherData }}>
      {children}
    </WeatherContext.Provider>
  );
}

// 3. Buat hook kustom untuk kemudahan
export function useWeather() {
  return useContext(WeatherContext);
}