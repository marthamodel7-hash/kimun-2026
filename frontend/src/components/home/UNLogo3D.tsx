/**
 * UNLogo3D — UN emblem on a flat disc with subtle 3D depth.
 * Simple: flat disc, slight tilt, soft shadow, clean lighting.
 */
import { useRef, useState, useEffect, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

/* ── Load SVG → Canvas → Texture ── */

function useUNTexture(): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 1024;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;

      // Transparent background
      ctx.clearRect(0, 0, size, size);

      // Draw SVG preserving aspect ratio, centered
      const svgAspect = img.width / img.height;
      let drawW: number, drawH: number;
      if (svgAspect > 1) {
        drawW = size * 0.92;
        drawH = drawW / svgAspect;
      } else {
        drawH = size * 0.92;
        drawW = drawH * svgAspect;
      }
      const drawX = (size - drawW) / 2;
      const drawY = (size - drawH) / 2;
      ctx.drawImage(img, drawX, drawY, drawW, drawH);

      // Gold-brown tint
      const imageData = ctx.getImageData(0, 0, size, size);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
        if (a < 10) continue;
        if (b > r && b > g && b > 80) {
          const brightness = (r + g + b) / (3 * 255);
          data[i]   = Math.round(196 * brightness);
          data[i+1] = Math.round(165 * brightness);
          data[i+2] = Math.round(90 * brightness);
        }
      }
      ctx.putImageData(imageData, 0, 0);

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      setTex(texture);
    };
    img.src = "/un-emblem.svg";
  }, []);

  return tex;
}

/* ── Emblem disc with slight tilt for 3D feel ── */

function EmblemDisc() {
  const tex = useUNTexture();
  const ref = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    // Gentle tilt oscillation for 3D depth
    ref.current.rotation.x = Math.sin(t * 0.12) * 0.06 - 0.15;
    ref.current.rotation.y = Math.sin(t * 0.08) * 0.08;
    // Subtle float
    ref.current.position.y = Math.sin(t * 0.2) * 0.03;
  });

  if (!tex) return null;

  return (
    <mesh ref={ref} rotation={[-0.15, 0, 0]}>
      <planeGeometry args={[2.8, 2.8]} />
      <meshStandardMaterial
        map={tex}
        transparent
        side={THREE.DoubleSide}
        roughness={0.3}
        metalness={0.05}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ── Soft shadow beneath disc ── */

function Shadow() {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (ref.current) {
      (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.15 + Math.sin(clock.getElapsedTime() * 0.2) * 0.02;
    }
  });
  return (
    <mesh ref={ref} position={[0, -0.08, -0.3]} rotation={[-0.15, 0, 0]}>
      <planeGeometry args={[2.6, 2.6]} />
      <meshBasicMaterial
        color="#000000"
        transparent
        opacity={0.15}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ── Scene ── */

function Scene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 4, 5]} intensity={1.0} color="#f0e8d8" />
      <directionalLight position={[-2, 3, 4]} intensity={0.4} color="#d4bc7a" />
      <pointLight position={[0, 0, 4]} intensity={0.5} color="#ffffff" distance={10} />

      <Float speed={0.3} rotationIntensity={0.002} floatIntensity={0.03}>
        <group>
          <Shadow />
          <EmblemDisc />
        </group>
      </Float>
    </>
  );
}

/* ── Export ── */

export default function UNLogo3D() {
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <Canvas
        camera={{ position: [0, 0.3, 4.5], fov: 34 }}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
        style={{ background: "transparent" }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}
