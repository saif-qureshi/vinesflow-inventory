"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session";
import type { Uom } from "@/types";

interface UomInput {
  name: string;
  symbol: string;
}

export function useUoms() {
  const token = useSessionStore((s) => s.accessToken);
  const orgId = useSessionStore((s) => s.currentOrgId);
  return useQuery({
    queryKey: ["uoms", orgId],
    queryFn: async () => (await api.get<Uom[]>("/uoms")).data,
    enabled: !!token && !!orgId,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  const orgId = useSessionStore((s) => s.currentOrgId);
  return () => qc.invalidateQueries({ queryKey: ["uoms", orgId] });
}

export function useCreateUom() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (payload: UomInput) => api.post<Uom>("/uoms", payload),
    onSuccess: invalidate,
  });
}

export function useUpdateUom() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (vars: { id: number; payload: UomInput }) =>
      api.patch<Uom>(`/uoms/${vars.id}`, vars.payload),
    onSuccess: invalidate,
  });
}

export function useDeleteUom() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/uoms/${id}`),
    onSuccess: invalidate,
  });
}
