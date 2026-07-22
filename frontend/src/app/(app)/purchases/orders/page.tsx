"use client";

import { DocumentList } from "@/components/documents/DocumentList";
import { PURCHASE_ORDER_CONFIG } from "@/lib/documentKinds";

export default function PurchaseOrderListPage() {
  return <DocumentList config={PURCHASE_ORDER_CONFIG} />;
}
