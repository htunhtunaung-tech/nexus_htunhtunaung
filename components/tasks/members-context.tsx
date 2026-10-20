"use client";

import { createContext, useContext, type ReactNode } from "react";

export type Member = { id: string; name: string };

const MembersContext = createContext<Member[]>([]);

// Makes the workspace members available to every task card
export function MembersProvider({ members, children }: { members: Member[]; children: ReactNode }) {
  return <MembersContext.Provider value={members}>{children}</MembersContext.Provider>;
}

export function useMembers() {
  return useContext(MembersContext);
}