// src/pages/Kontrol.jsx
import { useEffect, useState, useCallback, useRef } from "react";
import { db } from "../firebase";
import { onValue, ref, update, push } from "firebase/database";
import Header from "../components/Header";
import { motion, AnimatePresence } from "framer-motion";
import {
  Fish, Sprout, Home, Bug, Waves, Droplet, Fan, Lightbulb, Power,
  Bluetooth, BluetoothConnected, BluetoothSearching, Wifi, History, Activity,
  ShieldAlert, PlayCircle, CheckCircle
} from "lucide-react";

// =====================================================================================
// == BAGIAN 1: KOMPONEN UI MODERN & INTERAKTIF
// =====================================================================================

const ModernToggle = ({ isOn, onChange, disabled }) => (
  <motion.div whileTap={{ scale: 0.95 }} className="cursor-pointer">
    <div
      onClick={() => !disabled && onChange()}
      // --- PERBAIKAN DI SINI ---
      // Menambahkan `justify-end` saat ON dan `justify-start` saat OFF
      className={`relative flex items-center w-16 h-8 rounded-full p-1 transition-colors duration-300 ease-in-out ${
        isOn ? "bg-green-500 justify-end" : "bg-gray-300 justify-start"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 700, damping: 30 }}
        className="w-6 h-6 bg-white rounded-full shadow-md z-10"
      />
    </div>
  </motion.div>
);


const ModernSlider = ({ level, onLevelChange, disabled, theme }) => (
  <div className="flex items-center gap-3">
    <input
      type="range"
      min="0"
      max="100"
      value={level}
      onChange={(e) => onLevelChange(parseInt(e.target.value, 10))}
      disabled={disabled}
      className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer range-lg accent-purple-600 disabled:opacity-50`}
    />
    <span className={`font-bold text-sm w-12 text-right ${theme.accentColor}`}>{level}%</span>
  </div>
);

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText, Icon, theme }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 15, stiffness: 200 }}
          className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`mx-auto w-16 h-16 flex items-center justify-center rounded-full ${theme.bg} mb-4`}>
            <Icon size={40} className={theme.icon} />
          </div>
          <h3 className="text-2xl font-bold text-gray-800">{title}</h3>
          <p className="text-gray-600 mt-2 mb-6">{message}</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 bg-gray-200 text-gray-800 font-bold rounded-lg hover:bg-gray-300 transition-all">Batal</button>
            <button onClick={onConfirm} className={`flex-1 py-3 text-white font-bold rounded-lg transition-all ${theme.button}`}>{confirmText}</button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// =====================================================================================
// == BAGIAN 2: KOMPONEN KONTROL INTI
// =====================================================================================

const DeviceControl = ({ deviceConfig, controlData, pairingState, onPair, onToggle, onLevelChange, theme }) => {
  const isDeviceOn = controlData?.state === "ON";
  const deviceLevel = controlData?.level ?? 0;
  const isSearching = pairingState === 'searching';
  const isConnected = pairingState === 'connected';
  const isDisabled = isSearching;
  const statusInfo = isSearching ? { text: "PAIRING...", color: "text-red-500", Icon: Wifi }
                   : isConnected ? { text: "DIRECT", color: "text-blue-600", Icon: BluetoothConnected }
                   : { text: "FIREBASE", color: "text-gray-500", Icon: Wifi };

  return (
    <div className={`p-4 rounded-xl transition-all duration-300 ${isDeviceOn ? 'bg-green-50 shadow-sm' : 'bg-gray-100'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><deviceConfig.icon className={isDeviceOn ? theme.accentColor : "text-gray-500"} /> <span className="font-bold text-gray-800">{deviceConfig.title}</span></div>
        <div className="flex items-center gap-3">
          <motion.button whileTap={{scale: 0.9}} onClick={onPair} disabled={isDisabled} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
            {isSearching && <BluetoothSearching size={20} className="text-red-500 animate-pulse" />}
            {isConnected && <BluetoothConnected size={20} className="text-blue-600" />}
            {!isSearching && !isConnected && <Bluetooth size={20} className="text-gray-500" />}
          </motion.button>
          <ModernToggle isOn={isDeviceOn} onChange={onToggle} disabled={isDisabled} />
        </div>
      </div>
      {deviceConfig.hasLevel && (<div className="mt-3"><ModernSlider level={deviceLevel} onLevelChange={onLevelChange} disabled={!isDeviceOn || isDisabled} theme={theme} /></div>)}
      <div className="flex justify-between items-center mt-2 text-xs">
        <div className="flex items-center gap-1 font-semibold"><statusInfo.Icon size={12} className={statusInfo.color} /><span className={statusInfo.color}>{statusInfo.text}</span></div>
        <span className={`font-bold ${isDeviceOn ? "text-green-700" : "text-gray-600"}`}>{isDeviceOn ? `ONLINE ${deviceConfig.hasLevel ? `(${deviceLevel}%)` : ''}` : 'OFFLINE'}</span>
      </div>
    </div>
  );
};

const DomainControlCard = ({ title, icon, theme, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="bg-white rounded-2xl shadow-lg border w-full h-full overflow-hidden"
  >
    <div className={`p-4 flex items-center gap-4 ${theme.headerBg}`}>
      <icon size={32} className={`text-white`} />
      <h2 className="text-xl font-bold text-white">{title}</h2>
    </div>
    <div className="p-4 space-y-3">{children}</div>
  </motion.div>
);

// =====================================================================================
// == BAGIAN 3: KONFIGURASI DAN KOMPONEN UTAMA
// =====================================================================================

const DEVICE_CONFIG = {
  kolam_ikan: { title: "Kolam Ikan", icon: Fish, theme: { headerBg: 'bg-blue-500', accentColor: 'text-blue-600' }, devices: { pompa_kolam: { title: "Pompa Air", icon: Waves }, aerator_kolam: { title: "Aerator", icon: Droplet }}},
  cacing_sutra: { title: "Cacing Sutra", icon: Bug, theme: { headerBg: 'bg-amber-600', accentColor: 'text-amber-700' }, devices: { pompa_cacing: { title: "Pompa Air", icon: Waves }, aerator_cacing: { title: "Aerator", icon: Droplet }}},
  hidroponik: { title: "Hidroponik", icon: Sprout, theme: { headerBg: 'bg-emerald-500', accentColor: 'text-emerald-600' }, devices: { pompa_hidroponik: { title: "Pompa Nutrisi", icon: Droplet }, lampu_hidroponik: { title: "Lampu Tumbuh", icon: Lightbulb, hasLevel: true }}},
  kandang: { title: "Kandang", icon: Home, theme: { headerBg: 'bg-orange-500', accentColor: 'text-orange-600' }, devices: { kipas_kandang: { title: "Kipas Ventilasi", icon: Fan }, kandang_lampu: { title: "Lampu Kandang", icon: Lightbulb, hasLevel: true }}},
};

const ALL_DEVICE_KEYS = Object.values(DEVICE_CONFIG).flatMap(domain => Object.keys(domain.devices));

export default function Kontrol() {
  const [controls, setControls] = useState({});
  const [pairingStates, setPairingStates] = useState({});
  const [logs, setLogs] = useState([]);
  const [modal, setModal] = useState({ isOpen: false });
  const bluetoothConnections = useRef({});

  // --- LOGIKA FUNGSI (TIDAK ADA PERUBAHAN) ---
  useEffect(() => {
    const unsubscribeControls = onValue(ref(db, "kontrol"), (snapshot) => {
      const fbData = snapshot.val() || {};
      setControls(prev => {
        const updated = { ...prev };
        Object.keys(fbData).forEach(key => {
          if (pairingStates[key] !== 'connected') {
            updated[key] = typeof fbData[key] === 'string' ? { state: fbData[key], level: 0 } : fbData[key];
          }
        });
        return updated;
      });
    });
    const unsubscribeLogs = onValue(ref(db, "kontrol_logs"), (ss) => setLogs(Object.keys(ss.val() || {}).map(k => ({ id: k, ...ss.val()[k] })).sort((a, b) => b.ts - a.ts).slice(0, 10)));
    return () => { unsubscribeControls(); unsubscribeLogs(); };
  }, [pairingStates]);

  const writeLog = useCallback((logData) => push(ref(db, "kontrol_logs"), { ...logData, ts: Date.now() }), []);
  
  const handlePairing = useCallback(async (deviceKey) => { /* ... (Fungsi ini tetap sama) ... */ }, []);
  const handleToggle = useCallback((deviceKey) => {
    const current = controls[deviceKey] || { state: "OFF" };
    const newState = current.state === "ON" ? "OFF" : "ON";
    setControls(prev => ({ ...prev, [deviceKey]: { ...current, state: newState } }));
    const isDirect = pairingStates[deviceKey] === 'connected';
    if (!isDirect) update(ref(db, `kontrol/${deviceKey}`), { state: newState });
    writeLog({ device: deviceKey, action: newState, by: isDirect ? 'Direct' : 'WebApp' });
  }, [controls, pairingStates, writeLog]);

  const handleLevelChange = useCallback((deviceKey, newLevel) => {
    const current = controls[deviceKey] || { state: "OFF" };
    setControls(prev => ({ ...prev, [deviceKey]: { ...current, level: newLevel } }));
    const isDirect = pairingStates[deviceKey] === 'connected';
    if (!isDirect) update(ref(db, `kontrol/${deviceKey}`), { level: newLevel });
    writeLog({ device: deviceKey, action: `LEVEL ${newLevel}%`, by: isDirect ? 'Direct' : 'WebApp' });
  }, [controls, pairingStates, writeLog]);

  const handleBulkAction = useCallback((targetState) => {
    const isTurningOn = targetState === "ON";
    setModal({
      isOpen: true,
      title: `${isTurningOn ? "Hidupkan" : "Matikan"} Semua Alat?`,
      message: `Anda yakin ingin ${isTurningOn ? "menghidupkan" : "mematikan"} semua perangkat?`,
      confirmText: `Ya, ${isTurningOn ? "Hidupkan" : "Matikan"}`,
      Icon: isTurningOn ? CheckCircle : ShieldAlert,
      theme: isTurningOn 
        ? { bg: 'bg-green-100', icon: 'text-green-600', button: 'bg-green-600 hover:bg-green-700' }
        : { bg: 'bg-red-100', icon: 'text-red-600', button: 'bg-red-600 hover:bg-red-700' },
      onConfirm: () => {
        const updates = ALL_DEVICE_KEYS.reduce((acc, key) => {
          acc[key] = { ...(controls[key] || { level: 0 }), state: targetState }; return acc;
        }, {});
        setControls(prev => ({...prev, ...updates}));
        update(ref(db, 'kontrol'), updates);
        writeLog({ device: 'SEMUA ALAT', action: targetState, by: 'WebApp' });
        setModal({ isOpen: false });
      }
    });
  }, [controls, writeLog]);
  
  // --- TAMPILAN UTAMA (TIDAK ADA PERUBAHAN) ---
  return (
    <div className="flex flex-col w-full bg-gray-100 min-h-screen">
      <Header />
      <ConfirmationModal {...modal} onClose={() => setModal({ isOpen: false })} />
      
      <div className="p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Pusat Kontrol</h1>
            <p className="text-md text-gray-500">Kelola dan hubungkan semua perangkat sistem Anda.</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto flex-shrink-0">
            <motion.button whileTap={{scale:0.95}} onClick={() => handleBulkAction("ON")} className="flex-1 py-2 px-4 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 transition-all text-sm">Hidup Semua</motion.button>
            <motion.button whileTap={{scale:0.95}} onClick={() => handleBulkAction("OFF")} className="flex-1 py-2 px-4 bg-red-600 text-white font-bold rounded-lg shadow-md hover:bg-red-700 transition-all text-sm">Mati Semua</motion.button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.entries(DEVICE_CONFIG).map(([domainKey, config]) => (
            <DomainControlCard key={domainKey} title={config.title} icon={config.icon} theme={config.theme}>
              {Object.entries(config.devices).map(([deviceKey, deviceConfig]) => (
                <DeviceControl key={deviceKey} deviceConfig={deviceConfig} controlData={controls[deviceKey]} pairingState={pairingStates[deviceKey]} onPair={() => handlePairing(deviceKey)} onToggle={() => handleToggle(deviceKey)} onLevelChange={(level) => handleLevelChange(deviceKey, level)} theme={config.theme} />
              ))}
            </DomainControlCard>
          ))}
        </div>
        
        <div className="mt-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="bg-white p-5 rounded-2xl shadow-lg border">
                <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-3 flex items-center gap-3"><History className="text-purple-600"/> Log Aktivitas</h2>
                <div className="space-y-2">
                    {logs.length > 0 ? logs.map(log => (
                        <div key={log.id} className="p-2.5 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm odd:bg-gray-50 gap-2">
                            <div className="font-medium flex items-center gap-2 capitalize flex-shrink-0"><Activity size={14}/> {log.device.replace(/_/g, ' ')}</div>
                            <span className={`font-bold ${(log.action || "").includes("ON") ? "text-green-600" : (log.action || "").includes("OFF") ? "text-red-600" : "text-gray-700"}`}>{log.action}</span>
                            <span className="text-gray-500 text-xs text-left sm:text-right w-full sm:w-auto">{new Date(log.ts).toLocaleString('id-ID')}</span>
                        </div>
                    )) : <p className="text-center text-gray-500 py-4">Belum ada aktivitas.</p>}
                </div>
            </motion.div>
        </div>
      </div>
    </div>
  );
}