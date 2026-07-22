import type { DocumentPaymentStatus, DocumentStatus } from "@/types";

const PAYMENT_META: Record<DocumentPaymentStatus, { label: string; color?: string }> = {
  unpaid: { label: "Unpaid", color: "gold" },
  partial: { label: "Partially Paid", color: "orange" },
  paid: { label: "Paid", color: "green" },
};

export function documentBadge(status: DocumentStatus, paymentStatus: DocumentPaymentStatus) {
  if (status === "void") return { label: "Void", color: "red" };
  if (status === "draft") return { label: "Draft", color: undefined };
  return PAYMENT_META[paymentStatus] ?? { label: paymentStatus, color: undefined };
}

export const DOCUMENT_FILTER_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "unpaid", label: "Unpaid" },
  { value: "partial", label: "Partially Paid" },
  { value: "paid", label: "Paid" },
  { value: "void", label: "Void" },
];
