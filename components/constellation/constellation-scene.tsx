"use client";

import { useState, useSyncExternalStore } from "react";
import { Canvas } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import { nearestLinks } from "@/lib/constellation";
import { ProjectNode, type Vec3 } from "./project-node";

export type ConstellationProject = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  status: string;
  position_x: number;
  position_y: number;
  position_z: number;
  taskCount: number;
  doneCount: number;
  progress: number;
};

type SceneProps = {
  projects: ConstellationProject[];
  hoveredId: string | null;
  selectedId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onMove: (id: string, position: Vec3) => void;
};

// True when the computer is set to "reduce motion"
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia("(prefers-reduced-motion: reduce)");
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );
}

export default function ConstellationScene({
  projects,
  hoveredId,
  selectedId,
  onHover,
  onSelect,
  onMove,
}: SceneProps) {
  const reducedMotion = usePrefersReducedMotion();

  // Live positions, so planets and lines move while dragging
  const [positions, setPositions] = useState<Record<string, Vec3>>(() =>
    Object.fromEntries(projects.map((p) => [p.id, [p.position_x, p.position_y, p.position_z] as Vec3]))
  );

  const placed = projects.map((p) => {
    const [x, y, z] = positions[p.id] ?? [p.position_x, p.position_y, p.position_z];
    return { ...p, position_x: x, position_y: y, position_z: z };
  });
  const links = nearestLinks(placed);

  function handleDrag(id: string, position: Vec3) {
    setPositions((current) => ({ ...current, [id]: position }));
  }

  return (
    <Canvas camera={{ position: [0, 2, 14], fov: 50 }} dpr={[1, 1.5]} frameloop={reducedMotion ? "demand" : "always"}>
      <color attach="background" args={["#05070a"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={1.5} />

      {/* Faint floor grid for a sense of depth */}
      <gridHelper args={[24, 24, "#0e3a44", "#0b1a20"]} position={[0, -6, 0]} />

      {/* Thin lines between neighbouring projects */}
      {links.map(([a, b]) => (
        <Line
          key={`${a.id}-${b.id}`}
          points={[
            [a.position_x, a.position_y, a.position_z],
            [b.position_x, b.position_y, b.position_z],
          ]}
          color="#22d3ee"
          lineWidth={1}
          transparent
          opacity={0.25}
        />
      ))}

      {placed.map((p) => (
        <ProjectNode
          key={p.id}
          id={p.id}
          name={p.name}
          color={p.color}
          status={p.status}
          position={[p.position_x, p.position_y, p.position_z]}
          hovered={hoveredId === p.id}
          selected={selectedId === p.id}
          onHover={onHover}
          onSelect={onSelect}
          onDrag={handleDrag}
          onDragEnd={onMove}
        />
      ))}

      {/* Drift slowly, but hold still while the user is looking at a project */}
      <OrbitControls
        makeDefault
        enableDamping
        minDistance={4}
        maxDistance={30}
        autoRotate={!reducedMotion && !hoveredId && !selectedId}
        autoRotateSpeed={0.3}
      />
    </Canvas>
  );
}