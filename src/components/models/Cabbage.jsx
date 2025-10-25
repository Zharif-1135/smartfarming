// src/components/models/Cabbage.jsx

import React, { useRef, memo, useState, useMemo } from 'react' // Tambahkan useMemo
import { useGLTF, Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber' 
import { Sprout } from 'lucide-react'
import { klass } from '../../utils/Threshold' 
import * as THREE from 'three'; // <--- BARU: Impor THREE

/**
 * Komponen Utama Kubis Hidroponik
 */
export default function Cabbage(props) {
  // nodes = geometry, materials = material objek (sudah memiliki tekstur)
  const { nodes, materials } = useGLTF('/models/cabbage.glb')
  const modelRef = useRef()
  
  const [isHovered, setIsHovered] = useState(false);

  const { data = {}, control = {} } = props; 

  // --- 1. Identifikasi Material Asli ---
  // Asumsi: Kita menggunakan satu-satunya material yang dimuat GLTF.
  // Jika ini gagal, ganti 'Material_001' dengan nama yang benar.
  // Anda dapat melihat nama material yang benar di konsol log.
  const cabbageMaterial = materials.Material_001 || Object.values(materials)[0];
  const targetColor = useMemo(() => new THREE.Color(), []);

  // --- Logika Status (Disesuaikan untuk Tinting) ---
  const phStatus = klass('hidroponik', 'ph', data.ph);
  const ecStatus = klass('hidroponik', 'aliran_nutrisi', data.aliran_nutrisi);
  const suhuStatus = klass('hidroponik', 'suhu', data.suhu);
  const cahayaStatus = klass('hidroponik', 'intensitas_cahaya', data.intensitas_cahaya);

  let indicatorColor = "#FFFFFF"; // Normal: Putih (tidak ada tinting)
  let severity = 0.0; // Kekuatan tint (0.0 = tanpa tint, 1.0 = warna solid)
  
  if ([phStatus, ecStatus, suhuStatus, cahayaStatus].includes('danger')) {
    indicatorColor = "#ef4444"; // Bahaya: Merah
    severity = 0.5; // Tint 50%
  } else if ([phStatus, ecStatus, suhuStatus, cahayaStatus].includes('warning')) {
    indicatorColor = "#eab308"; // Peringatan: Kuning
    severity = 0.3; // Tint 30%
  } else {
    // Status OK: Tinting hijau lembut untuk kesehatan
    indicatorColor = "#22c55e"; 
    severity = 0.1; 
  }


  // Animasi (Rotasi dan Tinting Status)
  useFrame((state, delta) => {
    if (modelRef.current) {
      modelRef.current.rotation.y += delta * 0.3;

      // HANYA jika material sudah berhasil dimuat
      if (cabbageMaterial && cabbageMaterial.color) {
        // Warna dasar untuk tinting (putih = pertahankan tekstur)
        const baseColor = new THREE.Color(0xFFFFFF); 
        const statusColor = new THREE.Color(indicatorColor);
        
        // Campurkan (lerp) warna dasar (tekstur) dengan warna status
        targetColor.copy(baseColor).lerp(statusColor, severity);

        // Terapkan transisi warna (tint) secara halus ke material asli
        cabbageMaterial.color.lerp(targetColor, 0.05);
      }
    }
  });

  // --- RENDER MODEL 3D ---
  return (
    <group 
      ref={modelRef} 
      {...props} 
      dispose={null}
      onPointerOver={(e) => {
        e.stopPropagation(); 
        setIsHovered(true);
      }}
      onPointerOut={() => setIsHovered(false)}
    >
      
      {/* Model Kubis Utama */}
      <mesh 
        geometry={nodes.tgrmacdpa_LOD0_TIER1_000_MatID_1_0.geometry} 
        material={cabbageMaterial} // <--- PERUBAHAN UTAMA: Gunakan material asli dari GLB
        castShadow
        receiveShadow
        scale={0.3} 
      />

      {/* Panel HTML on-Hover */}
      {isHovered && (
        <Html 
          position={[0.75 * 0.3, 1.2 * 0.3, 0]} 
          center 
          depthTest={false}       
          renderOrder={999}
        >
          <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg shadow-lg w-56 text-gray-800 border">
            <div className="flex items-center gap-2 mb-2 border-b pb-1">
              <Sprout className="w-5 h-5 text-green-600" />
              <h3 className="font-bold text-lg">Hidroponik</h3>
            </div>
            <div className="space-y-1 text-sm">
              <p className="flex justify-between">
                <span className="font-semibold">pH Air:</span>
                <strong>{data.ph ?? 'Memuat...'}</strong>
              </p>
              <p className="flex justify-between">
                <span className="font-semibold">Nutrisi (EC):</span>
                <strong>{data.aliran_nutrisi ?? 'Memuat...'}</strong>
              </p>
              <p className="flex justify-between">
                <span className="font-semibold">Suhu Air:</span>
                <strong>{data.suhu ?? 'Memuat...'} °C</strong>
              </p>
              <p className="flex justify-between items-center mt-2 pt-1 border-t">
                <span className="font-semibold">Pompa Nutrisi:</span>
                <span className={`font-bold px-2 py-0.5 rounded ${
                  control.pompa_nutrisi === 'ON' ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'
                }`}>
                  {control.pompa_nutrisi ?? 'OFF'}
                </span>
              </p> 
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}

useGLTF.preload('/models/cabbage.glb')