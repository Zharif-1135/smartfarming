// src/components/models/Effects.jsx
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles, Cloud } from '@react-three/drei';
import * as THREE from 'three';

// --- (Efek Awan, Matahari, Lampu, Nutrisi, Hujan, Angin... ) ---
// --- (Tidak ada perubahan pada 6 efek di atas) ---

// --- Efek Awan (LEVEL 2) ---
export function CloudEffect({ visible, density = 0.5 }) {
  const cloudGroupRef = useRef();
  useFrame((state, delta) => {
    if (cloudGroupRef.current) {
      cloudGroupRef.current.position.x -= delta * 0.05; 
      if (cloudGroupRef.current.position.x < -15) {
        cloudGroupRef.current.position.x = 15; 
      }
    }
  });
  const cloudCount = Math.floor(density * 10);
  if (!visible || cloudCount === 0) return null;
  return (
    <group ref={cloudGroupRef} position={[0, 8, -5]} dispose={null}>
      {Array.from({ length: cloudCount }).map((_, i) => (
        <Cloud
          key={i}
          position={[(i - cloudCount / 2) * 2.5 + (Math.random() - 0.5) * 2, Math.random() - 0.5, Math.random() * 2 - 1]}
          scale={0.4 + Math.random() * 0.5}
          speed={0.1 + Math.random() * 0.1}
          segments={40}
          opacity={0.3 + density * 0.5}
          color="#ffffff"
        />
      ))}
    </group>
  );
}

// --- Efek Matahari (LEVEL 2) ---
export function SunEffect({ visible }) {
  const lightRef = useRef();
  return (
    <directionalLight
      ref={lightRef}
      visible={visible}
      position={[10, 15, 10]}
      intensity={1.5}
      castShadow
      color="#FFF7E0"
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
      shadow-camera-far={50}
      shadow-camera-left={-10}
      shadow-camera-right={10}
      shadow-camera-top={10}
      shadow-camera-bottom={-10}
    />
  );
}

// Efek Grow Light (LEVEL 1)
export function GrowLight({ visible }) {
  const lightRef = useRef();
  useFrame((state) => {
    if (lightRef.current) {
      lightRef.current.intensity = visible 
        ? 2 + Math.sin(state.clock.elapsedTime * 2) * 0.5 
        : 0;
    }
  });
  return (
    <spotLight
      ref={lightRef}
      visible={visible}
      position={[0, 4, 0.5]}
      angle={0.4}
      penumbra={0.5}
      intensity={0}
      castShadow
      color="#FF00FF"
      distance={10}
    />
  );
}

// Efek Tetesan Nutrisi (LEVEL 1)
export function NutrientDrip({ visible }) {
  return (
    <Sparkles
      visible={visible}
      count={40}
      scale={1.5}
      size={10}
      position={[0, 2.5, 0]}
      speed={0.3}
      noise={0.1}
      color="#00FFFF"
      opacity={0.8}
    />
  );
}

// Efek Hujan (LEVEL 2)
export function RainEffect({ visible }) {
  const rainRef = useRef();
  const particles = useMemo(() => {
    const count = 500;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20; // x
      positions[i * 3 + 1] = Math.random() * 10;      // y
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20; // z
    }
    return positions;
  }, []);
  useFrame((state, delta) => {
    if (rainRef.current) {
      const positions = rainRef.current.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] -= 0.1;
        if (positions[i + 1] < -2) {
          positions[i + 1] = 10;
        }
      }
      rainRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });
  if (!visible) return null;
  return (
    <points ref={rainRef}>
      <bufferGeometry attach="geometry">
        <bufferAttribute attach="attributes-position" array={particles} count={particles.length / 3} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial attach="material" color="#87CEEB" size={0.05} transparent opacity={0.6} />
    </points>
  );
}

// Efek Angin (LEVEL 2)
export function WindEffect({ visible, speed = 1 }) {
  return (
    <Sparkles
      visible={visible}
      count={200}
      scale={[20, 5, 20]}
      size={10}
      position={[0, 2.5, 0]}
      noise={[0.5, 0.1, 10]}
      speed={speed * 0.2}
      color="#FFFFFF"
      opacity={0.3}
    />
  );
}


// --- BARU: Komponen Rumput 3D Instan ---
export function InstancedGrass({ windSpeed = 0, isRaining = false, isDayTime = true }) {
  const materialRef = useRef();
  const meshRef = useRef();
  
  // Konfigurasi rumput
  const COUNT = 15000; // Jumlah helai rumput
  const AREA = 15;     // Area 15x15 (sesuai lantai abu-abu)
  const BLADE_HEIGHT = 1; // Tinggi rata-rata rumput
  const BLADE_WIDTH = 0.1; // Lebar rumput

  // 1. Geometri untuk satu helai rumput
  // Kita pakai 5 segmen vertikal agar bisa melengkung
  const bladeGeometry = useMemo(() => 
    new THREE.PlaneGeometry(BLADE_WIDTH, BLADE_HEIGHT, 1, 5), 
  []);

  // 2. Setup InstancedMesh
  // Ini adalah bagian penting untuk performa
  const instancedMesh = useMemo(() => {
    // Buat mesh instan
    const mesh = new THREE.InstancedMesh(bladeGeometry, null, COUNT);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    
    const dummy = new THREE.Object3D();
    for (let i = 0; i < COUNT; i++) {
      // Atur posisi dasar rumput di lantai (y = 0)
      dummy.position.set(
        (Math.random() - 0.5) * AREA,
        BLADE_HEIGHT / 2, // Setengah tinggi agar dasarnya di y=0
        (Math.random() - 0.5) * AREA
      );
      
      // Skala acak (tinggi berbeda)
      dummy.scale.set(1, 0.5 + Math.random() * 0.7, 1);
      
      // Rotasi Y acak (agar tidak menghadap arah yang sama)
      dummy.rotation.y = Math.random() * Math.PI;

      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    
    // Posisikan seluruh grup rumput
    mesh.position.y = -0.5; 
    
    return mesh;
  }, [bladeGeometry]);

  // 3. Animasikan shader
  useFrame((state) => {
    if (materialRef.current) {
      // Update waktu
      materialRef.current.uniforms.u_time.value = state.clock.getElapsedTime();
      
      // Update kekuatan angin secara perlahan (lerp)
      materialRef.current.uniforms.u_windStrength.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.u_windStrength.value,
        windSpeed / 5, // Sesuaikan pembagi ini jika goyangan terlalu/kurang kuat
        0.05
      );

      // Update warna
      let targetColor = new THREE.Color(0x336633); // Siang
      if (isRaining) targetColor.set(0x224422); // Hujan/Basah
      else if (!isDayTime) targetColor.set(0x112211); // Malam
      
      materialRef.current.uniforms.u_color.value.lerp(targetColor, 0.05);
    }
  });

  // 4. Render
  return (
    <primitive object={instancedMesh} ref={meshRef} dispose={null}>
      <shaderMaterial
        ref={materialRef}
        uniforms={{
          u_time: { value: 0 },
          u_windStrength: { value: 0 },
          u_color: { value: new THREE.Color(0x336633) }
        }}
        // Vertex Shader: Bagian yang menggerakkan rumput
        vertexShader={`
          uniform float u_time;
          uniform float u_windStrength;
          varying vec2 vUv;

          void main() {
            vUv = uv;
            vec3 pos = position;

            // Dapatkan posisi unik setiap helai
            // instanceMatrix[3].x adalah posisi x dari helai rumput
            float instanceId = instanceMatrix[3].x; 

            // Goyangan hanya terjadi jika uv.y > 0 (bukan di dasar rumput)
            // (uv.y * uv.y) membuat goyangan lebih kuat di ujung (efek melengkung)
            float sway = sin(instanceId * 0.5 + u_time * 0.8) * u_windStrength * uv.y * uv.y;
            
            // Terapkan goyangan ke sumbu x (lokal) dari rumput
            pos.x += sway; 
            
            // Hitung posisi akhir
            gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(pos, 1.0);
          }
        `}
        // Fragment Shader: Bagian yang mewarnai rumput
        fragmentShader={`
          uniform vec3 u_color;
          varying vec2 vUv;

          void main() {
            // Beri sedikit variasi gelap/terang (lebih terang di ujung)
            float noise = (vUv.y - 0.5) * 0.2; 
            gl_FragColor = vec4(u_color + noise, 1.0);
          }
        `}
        // Rumput adalah objek dua sisi
        side={THREE.DoubleSide}
      />
    </primitive>
  );
}

// --- Komponen DynamicGround Dihapus ---
// export function DynamicGround(...) { ... }