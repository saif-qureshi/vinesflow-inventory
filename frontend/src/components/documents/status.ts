import type { DocumentPaymentStatus, DocumentStatus } from "@/types";

export const LIFECYCLE_META: Record<DocumentStatus, { label: string; color?: string }> = {
  draft: { label: "Draft" },
  sent: { label: "Sent", color: "blue" },
  void: { label: "Void", color: "red" },
};

export const PAYMENT_META: Record<DocumentPaymentStatus, { label: string; color?: string }> = {
  unpaid: { label: "Unpaid", color: "gold" },
  partial: { label: "Partially Paid", color: "orange" },
  paid: { label: "Paid", color: "green" },
};

export const DOCUMENT_FILTER_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "unpaid", label: "Unpaid" },
  { value: "partial", label: "Partially Paid" },
  { value: "paid", label: "Paid" },
  { value: "void", label: "Void" },
];
