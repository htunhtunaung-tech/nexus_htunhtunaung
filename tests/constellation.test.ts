import { describe, expect, it } from "vitest";
import { nearestLinks } from "@/lib/constellation";

const node = (id: string, x: number) => ({ id, position_x: x, position_y: 0, position_z: 0 });

describe("nearestLinks", () => {
  it("connects each planet to its closest neighbour without duplicate lines", () => {
    const nodes = [node("a", 0), node("b", 1), node("c", 5)];
    const links = nearestLinks(nodes)
      .map(([p, q]) => [p.id, q.id].sort().join("-"))
      .sort();
    expect(links).toEqual(["a-b", "b-c"]);
  });

  it("returns no lines for a single planet", () => {
    expect(nearestLinks([node("a", 0)])).toEqual([]);
  });
});