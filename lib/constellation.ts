// Shared settings for the 3D constellation (used by the scene and the legend)

export const STATUS_COLORS: Record<string, string> = {
  planning: "#a78bfa", // violet
  active: "#22d3ee", // cyan
  paused: "#fbbf24", // amber
  completed: "#34d399", // green
};

export const STATUS_LABELS: Record<string, string> = {
  planning: "Planning",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
};

type Positioned = { id: string; position_x: number; position_y: number; position_z: number };

// Connect every project to its closest neighbour, without duplicate lines
export function nearestLinks<T extends Positioned>(nodes: T[]): [T, T][] {
  const seen = new Set<string>();
  const links: [T, T][] = [];

  for (const a of nodes) {
    let closest: T | null = null;
    let closestDistance = Infinity;

    for (const b of nodes) {
      if (a.id === b.id) continue;
      const dx = a.position_x - b.position_x;
      const dy = a.position_y - b.position_y;
      const dz = a.position_z - b.position_z;
      const distance = dx * dx + dy * dy + dz * dz;
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = b;
      }
    }

    if (!closest) continue;
    const key = [a.id, closest.id].sort().join(":");
    if (!seen.has(key)) {
      seen.add(key);
      links.push([a, closest]);
    }
  }

  return links;
}