"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session";

export interface FbrOption {
  value: string;
  label: string;
}

export function useFbrProvinces() {
  const token = useSessionStore((s) => s.accessToken);
  const orgId = useSessionStore((s) => s.currentOrgId);
  return useQuery({
    queryKey: ["fbr", "provinces"],
    queryFn: async () => (await api.get<FbrOption[]>("/fbr/provinces")).data,
    enabled: !!token && !!orgId,
    staleTime: Infinity,
  });
}
