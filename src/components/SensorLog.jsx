import { useEffect, useState } from "react";
import { db, ref, onValue } from "../firebase";

export default function SensorLog() {
  const [sensorLog, setSensorLog] = useState({});

  useEffect(() => {
    const sensorRef = ref(db, "sensor");
    const unsubscribe = onValue(sensorRef, (snapshot) => {
      const data = snapshot.val();
      setSensorLog(data || {});
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="mt-6 mx-6 bg-white p-4 shadow rounded">
      <h2 className="text-lg font-semibold mb-4">Log Sensor Realtime</h2>
      <table className="w-full text-sm text-left border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1">Kategori</th>
            <th className="border px-2 py-1">Suhu (°C)</th>
            <th className="border px-2 py-1">pH</th>
            <th className="border px-2 py-1">Oksigen (mg/L)</th>
            <th className="border px-2 py-1">Amonia (ppm)</th>
            <th className="border px-2 py-1">Kelembaban (%)</th>
            <th className="border px-2 py-1">Intensitas Cahaya</th>
          </tr>
        </thead>
        <tbody>
          {["hidroponik", "kandang", "kolam", "ulat"].map((kategori) => {
            const data = sensorLog[kategori] || {};
            return (
              <tr key={kategori}>
                <td className="border px-2 py-1 capitalize">{kategori}</td>
                <td className="border px-2 py-1">{data.suhu ?? "-"}</td>
                <td className="border px-2 py-1">{data.ph ?? "-"}</td>
                <td className="border px-2 py-1">{data.oksigen ?? "-"}</td>
                <td className="border px-2 py-1">{data.amonia ?? "-"}</td>
                <td className="border px-2 py-1">{data.kelembaban ?? "-"}</td>
                <td className="border px-2 py-1">{data.intensitas_cahaya ?? "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
