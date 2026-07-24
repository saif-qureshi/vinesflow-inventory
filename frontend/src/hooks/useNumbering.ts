"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session";

export type NumberingRestart = "none" | "yearly";

export interface NumberingEntry {
  key: string;
  label: string;
  prefix: string;
  start: string;
  restart: NumberingRestart;
}

export function useNumbering() {
  const token = useSessionStore((s) => s.accessToken);
  const orgId = useSessionStore((s) => s.currentOrgId);
  return useQuery({
    queryKey: ["numbering", orgId],
    queryFn: async () => (await api.get<NumberingEntry[]>("/settings/numbering")).data,
    enabled: !!token && !!orgId,
  });
}

export function useUpdateNumbering() {
  const qc = useQueryClient();
  const orgId = useSessionStore((s) => s.currentOrgId);
  return useMutation({
    mutationFn: (entries: Pick<NumberingEntry, "key" | "prefix" | "start" | "restart">[]) =>
      api.put("/settings/numbering", { entries }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["numbering", orgId] }),
  });
}
