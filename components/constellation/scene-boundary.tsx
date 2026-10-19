"use client";

import { Component, type ReactNode } from "react";

type Props = { fallback: ReactNode; children: ReactNode };

// If the 3D scene crashes, show the fallback instead of breaking the page
export class SceneBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("3D view failed to start", error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}