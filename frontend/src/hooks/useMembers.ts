"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session";
import type { Member } from "@/types";

export function useMembers() {
  const token = useSessionStore((s) => s.accessToken);
  const orgId = useSessionStore((s) => s.currentOrgId);
  return useQuery({
    queryKey: ["members", orgId],
    queryFn: async () => (await api.get<Member[]>("/orgs/current/members")).data,
    enabled: !!token && !!orgId,
  });
}

function useMembersInvalidator() {
  const qc = useQueryClient();
  const orgId = useSessionStore((s) => s.currentOrgId);
  return () => qc.invalidateQueries({ queryKey: ["members", orgId] });
}

export function useAddMember() {
  const invalidate = useMembersInvalidator();
  return useMutation({
    mutationFn: (vars: { email: string; role_id: number }) =>
      api.post("/orgs/current/members", vars),
    onSuccess: invalidate,
  });
}

export function useUpdateMemberRole() {
  const invalidate = useMembersInvalidator();
  return useMutation({
    mutationFn: (vars: { membershipId: number; role_id: number }) =>
      api.patch(`/orgs/current/members/${vars.membershipId}`, { role_id: vars.role_id }),
    onSuccess: invalidate,
  });
}

export function useRemoveMember() {
  const invalidate = useMembersInvalidator();
  return useMutation({
    mutationFn: (membershipId: number) => api.delete(`/orgs/current/members/${membershipId}`),
    onSuccess: invalidate,
  });
}
