"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session";
import type { Reason } from "@/types";

export function useReasons() {
  const token = useSessionStore((s) => s.accessToken);
  const orgId = useSessionStore((s) => s.currentOrgId);
  return useQuery({
    queryKey: ["reasons", orgId],
    queryFn: async () => (await api.get<Reason[]>("/inventory/reasons")).data,
    enabled: !!token && !!orgId,
  });
}

export function useCreateReason() {
  const qc = useQueryClient();
  const orgId = useSessionStore((s) => s.currentOrgId);
  return useMutation({
    mutationFn: (name: string) => api.post<Reason>("/inventory/reasons", { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reasons", orgId] }),
  });
}

export function useDeleteReason() {
  const qc = useQueryClient();
  const orgId = useSessionStore((s) => s.currentOrgId);
  return useMutation({
    mutationFn: (id: number) => api.delete(`/inventory/reasons/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reasons", orgId] }),
  });
}
