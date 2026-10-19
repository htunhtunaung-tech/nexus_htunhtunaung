"use client";

import { useSyncExternalStore } from "react";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { Billboard, Line, OrbitControls, Text } from "@react-three/drei";
import { STATUS_COLORS, nearestLinks } from "@/lib/constellation";

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

export default function ConstellationScene({ projects, hoveredId, selectedId, onHover, onSelect }: SceneProps) {
  const reducedMotion = usePrefersReducedMotion();
  const links = nearestLinks(projects);

  return (
    <Canvas camera={{ position: [0, 2, 14], fov: 50 }} dpr={[1, 2]}>
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

      {projects.map((project) => (
        <ProjectNode
          key={project.id}
          project={project}
          hovered={hoveredId === project.id}
          selected={selectedId === project.id}
          onHover={onHover}
          onSelect={onSelect}
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

type NodeProps = {
  project: ConstellationProject;
  hovered: boolean;
  selected: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
};

function ProjectNode({ project, hovered, selected, onHover, onSelect }: NodeProps) {
  const statusColor = STATUS_COLORS[project.status] ?? "#94a3b8";
  const highlighted = hovered || selected;

  function handlePointerOver(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    onHover(project.id);
    document.body.style.cursor = "pointer";
  }

  function handlePointerOut() {
    onHover(null);
    document.body.style.cursor = "auto";
  }

  function handleClick(e: ThreeEvent<MouseEvent>) {
    // Ignore the click at the end of a rotate-drag
        if (e.delta > 4) return;
    e.stopPropagation();
    onSelect(project.id);
  }

  return (
    <group position={[project.position_x, project.position_y, project.position_z]}>
      <mesh
        scale={highlighted ? 1.25 : 1}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <sphereGeometry args={[0.45, 32, 32]} />
        <meshStandardMaterial
          color={project.color}
          emissive={project.color}
          emissiveIntensity={highlighted ? 1 : 0.6}
          roughness={0.35}
        />
      </mesh>

      {/* Status ring around the sphere */}
      <mesh rotation={[Math.PI / 2, 0, 0]} scale={selected ? 1.2 : 1}>
        <torusGeometry args={[0.7, selected ? 0.04 : 0.025, 8, 64]} />
        <meshBasicMaterial color={statusColor} transparent opacity={selected ? 1 : 0.85} />
      </mesh>

      {/* Billboard keeps the label facing the camera as you rotate */}
      <Billboard position={[0, 0.95, 0]}>
        <Text
          fontSize={0.32}
          color="#ffffff"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.02}
          outlineColor="#05070a"
        >
          {project.name}
        </Text>
      </Billboard>
    </group>
  );
}