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
  Invoice,
  InvoiceInput,
  InvoiceListItem,
  InvoiceStatus,
  SellableItem,
  TaxRate,
} from "@/types";

interface InvoicePage {
  items: InvoiceListItem[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface InvoiceFilters {
  search?: string;
  status?: InvoiceStatus | null;
  party_id?: number | null;
}

export function useInvoices(filters: InvoiceFilters = {}, limit = 25) {
  const token = useSessionStore((s) => s.accessToken);
  const orgId = useSessionStore((s) => s.currentOrgId);
  return useInfiniteQuery({
    queryKey: ["invoices", orgId, filters],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (pageParam) params.set("cursor", pageParam as string);
      if (filters.search) params.set("search", filters.search);
      if (filters.status) params.set("status", filters.status);
      if (filters.party_id != null) params.set("party_id", String(filters.party_id));
      return (await api.get<InvoicePage>(`/invoices?${params.toString()}`)).data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.has_more ? last.next_cursor : undefined),
    enabled: !!token && !!orgId,
  });
}

export function useInvoice(id: number | null) {
  const token = useSessionStore((s) => s.accessToken);
  const orgId = useSessionStore((s) => s.currentOrgId);
  return useQuery({
    queryKey: ["invoice", orgId, id],
    queryFn: async () => (await api.get<Invoice>(`/invoices/${id}`)).data,
    enabled: !!token && !!orgId && !!id,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  const orgId = useSessionStore((s) => s.currentOrgId);
  return (id?: number) => {
    qc.invalidateQueries({ queryKey: ["invoices", orgId] });
    if (id) qc.invalidateQueries({ queryKey: ["invoice", orgId, id] });
    qc.invalidateQueries({ queryKey: ["inventory", orgId] });
  };
}

export function useCreateInvoice() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (payload: InvoiceInput) =>
      (await api.post<Invoice>("/invoices", payload)).data,
    onSuccess: () => invalidate(),
  });
}

export function useUpdateInvoice() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (vars: { id: number; payload: Partial<InvoiceInput> }) =>
      (await api.patch<Invoice>(`/invoices/${vars.id}`, vars.payload)).data,
    onSuccess: (_res, vars) => invalidate(vars.id),
  });
}

export function useFinalizeInvoice() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: number) =>
      (await api.post<Invoice>(`/invoices/${id}/finalize`)).data,
    onSuccess: (_res, id) => invalidate(id),
  });
}

export function useVoidInvoice() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: number) => (await api.post<Invoice>(`/invoices/${id}/void`)).data,
    onSuccess: (_res, id) => invalidate(id),
  });
}

export function useDeleteInvoice() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/invoices/${id}`),
    onSuccess: () => invalidate(),
  });
}

export function useTaxRates() {
  const token = useSessionStore((s) => s.accessToken);
  const orgId = useSessionStore((s) => s.currentOrgId);
  return useQuery({
    queryKey: ["tax-rates", orgId],
    queryFn: async () => (await api.get<TaxRate[]>("/tax-rates")).data,
    enabled: !!token && !!orgId,
  });
}

export function useSellableItems(search: string, limit = 50) {
  const token = useSessionStore((s) => s.accessToken);
  const orgId = useSessionStore((s) => s.currentOrgId);
  return useQuery({
    queryKey: ["sellable-items", orgId, search, limit],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (search) params.set("search", search);
      return (await api.get<SellableItem[]>(`/sellable-items?${params.toString()}`)).data;
    },
    enabled: !!token && !!orgId,
  });
}
