"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session";
import type { Warehouse, WarehouseInput } from "@/types";

export function useWarehouses() {
  const token = useSessionStore((s) => s.accessToken);
  const orgId = useSessionStore((s) => s.currentOrgId);
  return useQuery({
    queryKey: ["warehouses", orgId],
    queryFn: async () => (await api.get<Warehouse[]>("/locations")).data,
    enabled: !!token && !!orgId,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  const orgId = useSessionStore((s) => s.currentOrgId);
  return () => qc.invalidateQueries({ queryKey: ["warehouses", orgId] });
}

export function useCreateWarehouse() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (payload: WarehouseInput) => api.post<Warehouse>("/locations", payload),
    onSuccess: invalidate,
  });
}

export function useUpdateWarehouse() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (vars: { id: number; payload: Partial<WarehouseInput> }) =>
      api.patch<Warehouse>(`/locations/${vars.id}`, vars.payload),
    onSuccess: invalidate,
  });
}

export function useDeleteWarehouse() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/locations/${id}`),
    onSuccess: invalidate,
  });
}
