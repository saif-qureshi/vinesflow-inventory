"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session";
import type { Category } from "@/types";

interface CategoryInput {
  name: string;
  parent_id?: number | null;
}

export function useCategories() {
  const token = useSessionStore((s) => s.accessToken);
  const orgId = useSessionStore((s) => s.currentOrgId);
  return useQuery({
    queryKey: ["categories", orgId],
    queryFn: async () => (await api.get<Category[]>("/categories")).data,
    enabled: !!token && !!orgId,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  const orgId = useSessionStore((s) => s.currentOrgId);
  return () => qc.invalidateQueries({ queryKey: ["categories", orgId] });
}

export function useCreateCategory() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (payload: CategoryInput) => api.post<Category>("/categories", payload),
    onSuccess: invalidate,
  });
}

export function useUpdateCategory() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (vars: { id: number; payload: CategoryInput }) =>
      api.patch<Category>(`/categories/${vars.id}`, vars.payload),
    onSuccess: invalidate,
  });
}

export function useDeleteCategory() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/categories/${id}`),
    onSuccess: invalidate,
  });
}
