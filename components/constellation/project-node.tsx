"use client";

import { useRef, useState } from "react";
import * as THREE from "three";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import { STATUS_COLORS } from "@/lib/constellation";

export type Vec3 = [number, number, number];

const LIMIT = 10;
const clamp = (v: number) => Math.max(-LIMIT, Math.min(LIMIT, v));

type Props = {
  id: string;
  name: string;
  color: string;
  status: string;
  position: Vec3;
  hovered: boolean;
  selected: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onDrag: (id: string, position: Vec3) => void;
  onDragEnd: (id: string, position: Vec3) => void;
};

export function ProjectNode({
  id,
  name,
  color,
  status,
  position,
  hovered,
  selected,
  onHover,
  onSelect,
  onDrag,
  onDragEnd,
}: Props) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as { enabled: boolean } | null;
  const drag = useRef<{ plane: THREE.Plane; offset: THREE.Vector3; last: Vec3 | null } | null>(null);
  const [dragging, setDragging] = useState(false);

  const statusColor = STATUS_COLORS[status] ?? "#94a3b8";
  const highlighted = hovered || selected || dragging;

  function handlePointerDown(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    // Drag along an invisible plane that faces the camera
    const nodePosition = new THREE.Vector3(...position);
    const normal = camera.getWorldDirection(new THREE.Vector3()).negate();
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, nodePosition);
    const hit = new THREE.Vector3();
    if (!e.ray.intersectPlane(plane, hit)) return;

    drag.current = { plane, offset: hit.clone().sub(nodePosition), last: null };
    (e.target as unknown as Element).setPointerCapture(e.pointerId);
    if (controls) controls.enabled = false;
    setDragging(true);
    document.body.style.cursor = "grabbing";
  }

  function handlePointerMove(e: ThreeEvent<PointerEvent>) {
    const d = drag.current;
    if (!d) return;
    e.stopPropagation();
    const hit = new THREE.Vector3();
    if (!e.ray.intersectPlane(d.plane, hit)) return;
    hit.sub(d.offset);
    const next: Vec3 = [clamp(hit.x), clamp(hit.y), clamp(hit.z)];
    d.last = next;
    onDrag(id, next);
  }

  function handlePointerUp(e: ThreeEvent<PointerEvent>) {
    const d = drag.current;
    if (!d) return;
    e.stopPropagation();
    (e.target as unknown as Element).releasePointerCapture(e.pointerId);
    if (controls) controls.enabled = true;
    drag.current = null;
    setDragging(false);
    document.body.style.cursor = "grab";
    if (d.last) onDragEnd(id, d.last);
  }

  function handleClick(e: ThreeEvent<MouseEvent>) {
    // A drag is not a click
    if (e.delta > 4) return;
    e.stopPropagation();
    onSelect(id);
  }

  return (
    <group position={position}>
      <mesh
        scale={highlighted ? 1.25 : 1}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(id);
          if (!drag.current) document.body.style.cursor = "grab";
        }}
        onPointerOut={() => {
          onHover(null);
          if (!drag.current) document.body.style.cursor = "auto";
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleClick}
      >
        <sphereGeometry args={[0.45, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
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
          {name}
        </Text>
      </Billboard>
    </group>
  );
}