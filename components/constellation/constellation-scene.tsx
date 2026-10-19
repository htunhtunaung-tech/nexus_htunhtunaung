"use client";

import { Canvas } from "@react-three/fiber";
import { Billboard, OrbitControls, Text } from "@react-three/drei";

export type ConstellationProject = {
  id: string;
  name: string;
  color: string;
  status: string;
  position_x: number;
  position_y: number;
  position_z: number;
};

export default function ConstellationScene({ projects }: { projects: ConstellationProject[] }) {
  return (
    <Canvas camera={{ position: [0, 2, 14], fov: 50 }} dpr={[1, 2]}>
      <color attach="background" args={["#05070a"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={1.5} />

      {/* Faint floor grid for a sense of depth */}
      <gridHelper args={[24, 24, "#0e3a44", "#0b1a20"]} position={[0, -6, 0]} />

      {projects.map((project) => (
        <ProjectNode key={project.id} project={project} />
      ))}

      <OrbitControls makeDefault enableDamping minDistance={4} maxDistance={30} />
    </Canvas>
  );
}

function ProjectNode({ project }: { project: ConstellationProject }) {
  return (
    <group position={[project.position_x, project.position_y, project.position_z]}>
      <mesh>
        <sphereGeometry args={[0.45, 32, 32]} />
        <meshStandardMaterial
          color={project.color}
          emissive={project.color}
          emissiveIntensity={0.6}
          roughness={0.35}
        />
      </mesh>
      {/* Billboard keeps the label facing the camera as you rotate */}
      <Billboard position={[0, 0.85, 0]}>
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