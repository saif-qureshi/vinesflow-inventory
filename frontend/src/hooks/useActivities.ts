"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session";
import type { Activity } from "@/types";

interface ActivityPage {
  items: Activity[];
  next_cursor: string | null;
  has_more: boolean;
}

export function useEntityActivities(entityType: string, entityId: number | null) {
  const token = useSessionStore((s) => s.accessToken);
  const orgId = useSessionStore((s) => s.currentOrgId);
  return useQuery({
    queryKey: ["entity-activities", orgId, entityType, entityId],
    queryFn: async () =>
      (
        await api.get<ActivityPage>(
          `/activities?entity_type=${entityType}&entity_id=${entityId}&limit=50`,
        )
      ).data.items,
    enabled: !!token && !!orgId && !!entityId,
  });
}

export function useActivities(limit = 15) {
  const token = useSessionStore((s) => s.accessToken);
  const orgId = useSessionStore((s) => s.currentOrgId);
  return useInfiniteQuery({
    queryKey: ["activities", orgId],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (pageParam) params.set("cursor", pageParam as string);
      return (await api.get<ActivityPage>(`/activities?${params.toString()}`)).data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.has_more ? last.next_cursor : undefined),
    enabled: !!token && !!orgId,
  });
}
