"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function useUpdateOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      name?: string;
      currency?: string;
      industry?: string;
      fiscal_year_start_month?: number;
      logo_url?: string;
      theme?: "light" | "dark";
      accent_color?: string;
      keep_branding?: boolean;
    }) => api.patch("/orgs/current", vars),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { full_name?: string; password?: string; avatar_url?: string }) =>
      api.patch("/users/me", vars),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });
}
