"use client";

import { useEffect } from "react";
import { toast } from "sonner";

type State = { error?: string; success?: boolean } | undefined;

// Shows a toast each time a form finishes: green on success, red on error
export function ActionToast({ state, success }: { state: State; success: string }) {
  useEffect(() => {
    if (state?.success) toast.success(success);
    else if (state?.error) toast.error(state.error);
  }, [state, success]);

  return null;
}