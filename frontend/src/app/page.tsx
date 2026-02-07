"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, MeshTransmissionMaterial } from "@react-three/drei";
import * as THREE from "three";
import Link from "next/link";

/* ─────────────────────────────────────────
   3D WIREFRAME CITY — individual building
   ───────────────────────────────────────── */
function Building({
  position,
  width,
  height,
  depth,
  delay,
}: {
  position: [number, number, number];
  width: number;
  height: number;
  depth: number;
  delay: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const edgesRef = useRef<THREE.LineSegments>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useFrame((state) => {
    if (!edgesRef.current) return;
    const t = state.clock.elapsedTime;
    // Subtle breathing glow
    const mat = edgesRef.current.material as THREE.LineBasicMaterial;
    mat.opacity = 0.5 + Math.sin(t * 0.5 + delay * 0.01) * 0.15;
  });

  const geometry = useMemo(() => new THREE.BoxGeometry(width, height, depth), [width, height, depth]);
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry), [geometry]);

  if (!visible) return null;

  return (
    <group position={position}>
      {/* Solid face — very faint fill for depth */}
      <mesh geometry={geometry}>
        <meshBasicMaterial color="#ffffff" transparent opacity={0.015} />
      </mesh>
      {/* Wireframe edges */}
      <lineSegments ref={edgesRef} geometry={edges}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.6} linewidth={2} />
      </lineSegments>
    </group>
  );
}

/* ─────────────────────────────────────────
   Dome / sphere building
   ───────────────────────────────────────── */
function DomeBuilding({
  position,
  radius,
  delay,
}: {
  position: [number, number, number];
  radius: number;
  delay: number;
}) {
  const ref = useRef<THREE.LineSegments>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useFrame((state) => {
    if (!ref.current) return;
    const mat = ref.current.material as THREE.LineBasicMaterial;
    mat.opacity = 0.45 + Math.sin(state.clock.elapsedTime * 0.4 + delay * 0.01) * 0.12;
  });

  const geometry = useMemo(() => new THREE.SphereGeometry(radius, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), [radius]);
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry, 15), [geometry]);

  if (!visible) return null;

  return (
    <group position={position}>
      <mesh geometry={geometry}>
        <meshBasicMaterial color="#ffffff" transparent opacity={0.01} />
      </mesh>
      <lineSegments ref={ref} geometry={edges}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.55} linewidth={2} />
      </lineSegments>
    </group>
  );
}

/* ─────────────────────────────────────────
   Cylinder / tower building
   ───────────────────────────────────────── */
function CylinderBuilding({
  position,
  radius,
  height,
  delay,
}: {
  position: [number, number, number];
  radius: number;
  height: number;
  delay: number;
}) {
  const ref = useRef<THREE.LineSegments>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useFrame((state) => {
    if (!ref.current) return;
    const mat = ref.current.material as THREE.LineBasicMaterial;
    mat.opacity = 0.47 + Math.sin(state.clock.elapsedTime * 0.6 + delay * 0.01) * 0.12;
  });

  const geometry = useMemo(() => new THREE.CylinderGeometry(radius, radius, height, 10, 4), [radius, height]);
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry, 15), [geometry]);

  if (!visible) return null;

  return (
    <group position={position}>
      <mesh geometry={geometry}>
        <meshBasicMaterial color="#ffffff" transparent opacity={0.01} />
      </mesh>
      <lineSegments ref={ref} geometry={edges}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.57} linewidth={5} />
      </lineSegments>
    </group>
  );
}

/* ─────────────────────────────────────────
   Ground grid
   ───────────────────────────────────────── */
function GroundGrid() {
  const ref = useRef<THREE.GridHelper>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const mat = ref.current.material as THREE.Material;
    mat.opacity = 0.15 + Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
  });

  return (
    <gridHelper
      ref={ref}
      args={[40, 40, "#ffffff", "#ffffff"]}
      position={[0, -0.01, 0]}
      material-transparent={true}
      material-opacity={0.45}
    />
  );
}

/* ─────────────────────────────────────────
   Floating particles
   ───────────────────────────────────────── */
function Particles({ count = 80 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = Math.random() * 15;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    return pos;
  }, [count]);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.01;
    const posArr = ref.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      posArr[i * 3 + 1] += Math.sin(state.clock.elapsedTime * 0.3 + i) * 0.002;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.04} transparent opacity={0.3} sizeAttenuation />
    </points>
  );
}

/* ─────────────────────────────────────────
   Camera auto-rotation rig
   ───────────────────────────────────────── */
function CameraRig() {
  const { camera } = useThree();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // Slow orbit
    camera.position.x = Math.sin(t * 0.06) * 14;
    camera.position.z = Math.cos(t * 0.06) * 14;
    camera.position.y = 6 + Math.sin(t * 0.08) * 1.5;
    camera.lookAt(0, 2.5, 0);
  });

  return null;
}

/* ─────────────────────────────────────────
   FULL CITY SCENE
   ───────────────────────────────────────── */
function CityScene() {
  return (
    <>
      <CameraRig />
      <ambientLight intensity={0.1} />
      <GroundGrid />
      <Particles count={100} />

      {/* Floating wrapper for gentle bob */}
      <Float speed={0.4} rotationIntensity={0.05} floatIntensity={0.3}>
        <group>
          {/* ── Center cluster (tallest) ── */}
          <Building position={[0, 3.5, 0]} width={1.5} height={7} depth={1.5} delay={0} />
          <Building position={[1.8, 2.5, 0.5]} width={1.2} height={5} depth={1.2} delay={100} />
          <Building position={[-1.5, 3, -0.5]} width={1.3} height={6} depth={1} delay={200} />
          <Building position={[0.5, 2, 1.8]} width={1} height={4} depth={1.4} delay={150} />
          <CylinderBuilding position={[-0.3, 2.2, 1.5]} radius={0.5} height={4.4} delay={250} />

          {/* ── Left cluster ── */}
          <Building position={[-4, 2, 1]} width={1.4} height={4} depth={1} delay={300} />
          <Building position={[-3, 1.5, -1]} width={1} height={3} depth={1.2} delay={350} />
          <Building position={[-5, 1, 0]} width={1.6} height={2} depth={1.6} delay={400} />
          <Building position={[-4.5, 1.8, 2.2]} width={0.8} height={3.6} depth={0.8} delay={450} />
          <DomeBuilding position={[-3.5, 2.5, 0]} radius={0.7} delay={500} />
          <CylinderBuilding position={[-5.5, 1.2, -1.5]} radius={0.4} height={2.4} delay={380} />

          {/* ── Right cluster ── */}
          <Building position={[3.5, 2.2, -1]} width={1.2} height={4.4} depth={1.2} delay={200} />
          <Building position={[4.5, 1.5, 0.5]} width={1} height={3} depth={1.5} delay={300} />
          <Building position={[5, 2, -0.5]} width={0.8} height={4} depth={0.8} delay={350} />
          <Building position={[3, 1.2, 1.5]} width={1.5} height={2.4} depth={1} delay={400} />
          <CylinderBuilding position={[5.5, 1, 1.5]} radius={0.5} height={2} delay={450} />

          {/* ── Back row ── */}
          <Building position={[-2, 1.5, -3.5]} width={1.2} height={3} depth={0.8} delay={500} />
          <Building position={[0, 2, -3]} width={0.8} height={4} depth={1} delay={550} />
          <Building position={[2.5, 1.8, -3.2]} width={1.4} height={3.6} depth={1} delay={450} />
          <Building position={[-4, 0.8, -3]} width={1} height={1.6} depth={1} delay={600} />
          <Building position={[4.5, 1.2, -3]} width={0.9} height={2.4} depth={0.9} delay={520} />
          <DomeBuilding position={[1, 1.8, -4]} radius={0.6} delay={650} />

          {/* ── Front row ── */}
          <Building position={[-1.5, 1, 3.5]} width={1} height={2} depth={1} delay={500} />
          <Building position={[1.5, 1.5, 3]} width={0.9} height={3} depth={0.9} delay={550} />
          <Building position={[3.5, 0.8, 3.2]} width={1.2} height={1.6} depth={1.2} delay={600} />
          <Building position={[-3.5, 1.2, 3]} width={0.8} height={2.4} depth={1.4} delay={580} />

          {/* ── Scattered smaller buildings ── */}
          <Building position={[-6.5, 0.6, 2]} width={0.7} height={1.2} depth={0.7} delay={700} />
          <Building position={[6.5, 0.8, -2]} width={0.6} height={1.6} depth={0.6} delay={750} />
          <Building position={[-7, 0.5, -2.5]} width={0.8} height={1} depth={0.8} delay={800} />
          <Building position={[7, 0.5, 1.5]} width={0.5} height={1} depth={0.5} delay={820} />
        </group>
      </Float>
    </>
  );
}

/* ─────────────────────────────────────────
   STAT CARD
   ───────────────────────────────────────── */
function StatCard({ value, label, delay }: { value: string; label: string; delay: string }) {
  return (
    <div className="wireframe-card p-5 opacity-0 animate-fade-in-up" style={{ animationDelay: delay }}>
      <div className="font-playfair text-3xl text-white mb-1 italic">{value}</div>
      <div className="font-mono text-xs text-white/40 uppercase tracking-widest">{label}</div>
    </div>
  );
}

/* ─────────────────────────────────────────
   FEATURE CARD
   ───────────────────────────────────────── */
function FeatureCard({ icon, title, description, delay }: { icon: string; title: string; description: string; delay: string }) {
  return (
    <div
      className="wireframe-card p-6 opacity-0 animate-fade-in-up group hover:bg-white/[0.06] transition-colors duration-300"
      style={{ animationDelay: delay }}
    >
      <div className="text-2xl mb-3 opacity-40">{icon}</div>
      <h3 className="font-playfair text-xl text-white mb-2">{title}</h3>
      <p className="font-mono text-xs text-white/40 leading-relaxed">{description}</p>
    </div>
  );
}

/* ─────────────────────────────────────────
   HOME PAGE
   ───────────────────────────────────────── */
export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#060d18] overflow-hidden relative">
      {/* ═══ Full-page 3D wireframe canvas — always behind content ═══ */}
      <div className="fixed inset-0 z-0">
        <Canvas
          camera={{ position: [14, 6, 14], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
          style={{ background: "transparent" }}
        >
          <CityScene />
        </Canvas>
        {/* Radial vignette over the 3D scene */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 70% 60% at 50% 45%, transparent 0%, #060d18 100%)"
        }} />
      </div>

      {/* ═══ All page content ═══ */}
      <div className="relative z-10">

        {/* Nav */}
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[rgba(6,13,24,0.7)] backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Vireon" className="w-8 h-8" />
              <span className="font-mono text-lg text-white tracking-widest uppercase">Vireon</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              {["Features", "About", "Contact"].map((item) => (
                <a key={item} href={`#${item.toLowerCase()}`} className="font-mono text-xs text-white/40 hover:text-white transition-colors uppercase tracking-wider">
                  {item}
                </a>
              ))}
              <Link href="/renderer" className="wireframe-card !px-4 !py-2 font-mono text-xs text-white hover:bg-white/[0.08] transition-colors uppercase tracking-wider">
                Launch Vireon
              </Link>
            </div>
          </div>
        </nav>

        {/* ═══════════════════════════════════════════
            HERO — big serif text wrapping around the 3D
            ═══════════════════════════════════════════ */}
        <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center">
          <div className="max-w-4xl mx-auto w-full flex flex-col items-center">
            {/* Top label */}
            <div className={`mb-8 transition-all duration-700 ${mounted ? "opacity-100" : "opacity-0"}`}>
              <span className="font-mono text-[11px] text-white/25 uppercase tracking-[0.4em]">Urban Transparency Simulator</span>
            </div>

            {/* Main title — centered */}
            <div className={`transition-all duration-1000 delay-200 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
              <h1 className="font-playfair text-[clamp(4rem,14vw,12rem)] text-white leading-[0.85] tracking-tight italic">
                Vireon
              </h1>
            </div>

            {/* Tagline */}
            <div className={`mt-6 transition-all duration-700 delay-400 ${mounted ? "opacity-100" : "opacity-0"}`}>
              <p className="font-mono text-sm text-white/30 max-w-md mx-auto leading-relaxed tracking-wide">
                Simulate, analyze, and visualize urban impact — one building at a time.
              </p>
            </div>

            {/* CTA */}
            <div className={`mt-12 transition-all duration-700 delay-500 ${mounted ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}>
              <Link href="/renderer" className="wireframe-card !px-10 !py-4 font-mono text-sm text-white/80 hover:text-white hover:bg-white/[0.06] transition-all uppercase tracking-[0.3em]">
                Launch Vireon
              </Link>
            </div>

            {/* Scroll indicator */}
            <div className={`mt-24 transition-all duration-700 delay-700 ${mounted ? "opacity-100" : "opacity-0"}`}>
              <div className="flex flex-col items-center gap-2">
                <span className="font-mono text-[10px] text-white/20 uppercase tracking-[0.4em]">Scroll</span>
                <div className="w-px h-8 bg-gradient-to-b from-white/20 to-transparent animate-pulse" />
              </div>
            </div>
          </div>
        </section>

        {/* ═══ Vireon Mission Section ═══ */}
        <section className="py-28 px-6">
          <div className="max-w-7xl mx-auto text-center">
            <div className="font-mono text-xs text-white/20 uppercase tracking-[0.4em] mb-6">
              Sustainable Urban Planning
            </div>
            <h2 className="font-playfair text-5xl sm:text-7xl text-white leading-[0.85] tracking-tight italic">
              Blueprint your city
            </h2>
            <p className="font-mono text-sm text-white/30 max-w-lg mx-auto mt-6 leading-relaxed">
              Vireon combines architectural precision with environmental science,
              letting planners and citizens see exactly how design choices impact
              livability, energy, and carbon footprint.
            </p>
          </div>
        </section>

        {/* ═══ Stats ═══ */}
        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard value="50k+" label="Buildings Simulated" delay="0.1s" />
            <StatCard value="340" label="Cities Mapped" delay="0.2s" />
            <StatCard value="98%" label="Accuracy Rating" delay="0.3s" />
            <StatCard value="2.1M" label="CO₂ Tons Saved" delay="0.4s" />
          </div>
        </section>

        {/* ═══ Features ═══ */}
        <section id="features" className="py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-playfair text-5xl sm:text-6xl text-white mb-4 tracking-tight">
                How it works
              </h2>
              <p className="font-mono text-xs text-white/30 uppercase tracking-[0.2em]">
                Core simulation modules
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <FeatureCard icon="◇" title="Urban Energy Mapping" description="Real-time energy flow visualization across building networks. Map consumption patterns and identify optimization zones." delay="0.1s" />
              <FeatureCard icon="△" title="Transparency Index" description="Score buildings on sustainability metrics with our open-data transparency framework. Every metric is verifiable." delay="0.2s" />
              <FeatureCard icon="○" title="Carbon Lifecycle" description="Track embodied carbon from construction materials through building operation to eventual decommission." delay="0.3s" />
              <FeatureCard icon="□" title="Wind & Solar Analysis" description="Simulate natural ventilation corridors and solar exposure across the urban canopy at any time of year." delay="0.4s" />
              <FeatureCard icon="⬡" title="Green Infrastructure" description="Model green roofs, urban forests, and water management systems. See their impact on microclimate in real time." delay="0.5s" />
              <FeatureCard icon="⊞" title="Policy Sandbox" description="Test zoning regulations and building codes before implementation. Predict outcomes with high-fidelity simulation." delay="0.6s" />
            </div>
          </div>
        </section>

        {/* ═══ About ═══ */}
        <section id="about" className="py-24 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="wireframe-card !p-8 sm:!p-12 relative">
              <div className="absolute -top-1 -left-1 w-5 h-5 border-l-2 border-t-2 border-white/30" />
              <div className="absolute -top-1 -right-1 w-5 h-5 border-r-2 border-t-2 border-white/30" />
              <div className="absolute -bottom-1 -left-1 w-5 h-5 border-l-2 border-b-2 border-white/30" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 border-r-2 border-b-2 border-white/30" />

              <div className="font-mono text-[10px] text-white/25 mb-6 uppercase tracking-widest">
                Project Brief — Rev. 04
              </div>
              <h2 className="font-playfair text-4xl sm:text-5xl text-white mb-6 tracking-tight">
                Designed for the cities of tomorrow
              </h2>
              <div className="space-y-4 text-sm text-white/40 leading-relaxed">
                <p>
                  Vireon was born from the idea that sustainable urban planning shouldn&apos;t happen behind closed doors.
                  Every simulation, every data point, every decision should be transparent and accessible.
                </p>
                <p>
                  Our building simulator combines architectural precision with environmental science,
                  letting planners, architects, and citizens see exactly how design choices impact
                  energy consumption, carbon footprint, and livability.
                </p>
                <p>
                  Think of it as a blueprint for accountability — where every line drawn
                  carries the weight of its environmental impact.
                </p>
              </div>
              <div className="mt-8 pt-6 border-t border-white/[0.08] flex flex-wrap gap-6">
                <div>
                  <div className="font-mono text-[10px] text-white/20 uppercase tracking-widest mb-1">Version</div>
                  <div className="font-playfair text-xl text-white/70 italic">4.2.0</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] text-white/20 uppercase tracking-widest mb-1">License</div>
                  <div className="font-playfair text-xl text-white/70 italic">Open Source</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] text-white/20 uppercase tracking-widest mb-1">Status</div>
                  <div className="font-playfair text-xl text-white/70 italic">Active</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ CTA ═══ */}
        <section id="contact" className="py-24 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-playfair text-6xl sm:text-7xl text-white mb-4 tracking-tight">
              Ready to build?
            </h2>
            <p className="font-playfair text-xl text-white/40 mb-8 italic">
              Start simulating your sustainable city today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/renderer" className="wireframe-card !px-10 !py-4 bg-white/[0.05] font-mono text-sm text-white hover:bg-white/[0.12] transition-colors uppercase tracking-wider">
                Launch Vireon →
              </Link>
              <button className="px-10 py-4 font-mono text-sm text-white/35 hover:text-white transition-colors uppercase tracking-wider">
                GitHub ↗
              </button>
            </div>
          </div>
        </section>

        {/* ═══ Footer ═══ */}
        <footer className="border-t border-white/[0.06] py-10 px-6">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-white/40 uppercase tracking-widest">Vireon</span>
              <span className="font-mono text-[10px] text-white/20 uppercase tracking-widest">v1.0</span>
            </div>
            <div className="font-mono text-[10px] text-white/20 uppercase tracking-widest">
              Sustainability through transparency
            </div>
            <div className="flex items-center gap-4">
              <a href="#" className="font-mono text-[10px] text-white/25 hover:text-white transition-colors uppercase tracking-widest">Privacy</a>
              <a href="#" className="font-mono text-[10px] text-white/25 hover:text-white transition-colors uppercase tracking-widest">Terms</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
