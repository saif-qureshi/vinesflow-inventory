"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session";
import type { Permission, Role } from "@/types";

interface RolePayload {
  name: string;
  description?: string;
  permissions: string[];
}

export function useRoles() {
  const token = useSessionStore((s) => s.accessToken);
  const orgId = useSessionStore((s) => s.currentOrgId);
  return useQuery({
    queryKey: ["roles", orgId],
    queryFn: async () => (await api.get<Role[]>("/roles")).data,
    enabled: !!token && !!orgId,
  });
}

export function usePermissionCatalog() {
  const token = useSessionStore((s) => s.accessToken);
  const orgId = useSessionStore((s) => s.currentOrgId);
  return useQuery({
    queryKey: ["permission-catalog"],
    queryFn: async () => (await api.get<Permission[]>("/permissions")).data,
    enabled: !!token && !!orgId,
    staleTime: 5 * 60_000,
  });
}

function useRolesInvalidator() {
  const qc = useQueryClient();
  const orgId = useSessionStore((s) => s.currentOrgId);
  return () => qc.invalidateQueries({ queryKey: ["roles", orgId] });
}

export function useCreateRole() {
  const invalidate = useRolesInvalidator();
  return useMutation({
    mutationFn: (payload: RolePayload) => api.post("/roles", payload),
    onSuccess: invalidate,
  });
}

export function useUpdateRole() {
  const invalidate = useRolesInvalidator();
  return useMutation({
    mutationFn: (vars: { id: number; payload: RolePayload }) =>
      api.patch(`/roles/${vars.id}`, vars.payload),
    onSuccess: invalidate,
  });
}

export function useDeleteRole() {
  const invalidate = useRolesInvalidator();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/roles/${id}`),
    onSuccess: invalidate,
  });
}
