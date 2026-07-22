"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session";
import type {
  OutstandingDocument,
  PaymentDirection,
  PaymentInput,
  PaymentRecord,
  PaymentStatus,
  PaymentSummary,
} from "@/types";

interface PaymentPage {
  items: PaymentSummary[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface PaymentFilters {
  search?: string;
  status?: PaymentStatus | null;
  party_id?: number | null;
}

export function usePaymentList(apiPath: string, filters: PaymentFilters = {}, limit = 25) {
  const token = useSessionStore((s) => s.accessToken);
  const orgId = useSessionStore((s) => s.currentOrgId);
  return useInfiniteQuery({
    queryKey: [apiPath, orgId, filters],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (pageParam) params.set("cursor", pageParam as string);
      if (filters.search) params.set("search", filters.search);
      if (filters.status) params.set("status", filters.status);
      if (filters.party_id != null) params.set("party_id", String(filters.party_id));
      return (await api.get<PaymentPage>(`/${apiPath}?${params.toString()}`)).data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.has_more ? last.next_cursor : undefined),
    enabled: !!token && !!orgId,
  });
}

export function usePayment(apiPath: string, id: number | null) {
  const token = useSessionStore((s) => s.accessToken);
  const orgId = useSessionStore((s) => s.currentOrgId);
  return useQuery({
    queryKey: [apiPath, "one", orgId, id],
    queryFn: async () => (await api.get<PaymentRecord>(`/${apiPath}/${id}`)).data,
    enabled: !!token && !!orgId && !!id,
  });
}

function useInvalidate(apiPath: string) {
  const qc = useQueryClient();
  const orgId = useSessionStore((s) => s.currentOrgId);
  return (id?: number) => {
    qc.invalidateQueries({ queryKey: [apiPath, orgId] });
    if (id) qc.invalidateQueries({ queryKey: [apiPath, "one", orgId, id] });
    qc.invalidateQueries({ queryKey: ["invoices"] });
    qc.invalidateQueries({ queryKey: ["bills"] });
    qc.invalidateQueries({ queryKey: ["outstanding"] });
  };
}

export function useCreatePayment(apiPath: string) {
  const invalidate = useInvalidate(apiPath);
  return useMutation({
    mutationFn: async (payload: PaymentInput) =>
      (await api.post<PaymentRecord>(`/${apiPath}`, payload)).data,
    onSuccess: () => invalidate(),
  });
}

export function useSubmitPayment(apiPath: string) {
  const invalidate = useInvalidate(apiPath);
  return useMutation({
    mutationFn: async (id: number) =>
      (await api.post<PaymentRecord>(`/${apiPath}/${id}/submit`)).data,
    onSuccess: (_res, id) => invalidate(id),
  });
}

export function useCancelPayment(apiPath: string) {
  const invalidate = useInvalidate(apiPath);
  return useMutation({
    mutationFn: async (id: number) => (await api.post<PaymentRecord>(`/${apiPath}/${id}/cancel`)).data,
    onSuccess: (_res, id) => invalidate(id),
  });
}

export function useDeletePayment(apiPath: string) {
  const invalidate = useInvalidate(apiPath);
  return useMutation({
    mutationFn: (id: number) => api.delete(`/${apiPath}/${id}`),
    onSuccess: () => invalidate(),
  });
}

export function useOutstandingDocuments(direction: PaymentDirection, partyId: number | null) {
  const token = useSessionStore((s) => s.accessToken);
  const orgId = useSessionStore((s) => s.currentOrgId);
  return useQuery({
    queryKey: ["outstanding", orgId, direction, partyId],
    queryFn: async () =>
      (
        await api.get<OutstandingDocument[]>(
          `/outstanding-documents?direction=${direction}&party_id=${partyId}`,
        )
      ).data,
    enabled: !!token && !!orgId && !!partyId,
  });
}
