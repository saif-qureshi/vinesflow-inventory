"use client";

import { DocumentForm } from "@/components/documents/DocumentForm";
import { PURCHASE_ORDER_CONFIG } from "@/lib/documentKinds";

export default function NewPurchaseOrderPage() {
  return <DocumentForm config={PURCHASE_ORDER_CONFIG} />;
}
