"use client";

import { useParams } from "next/navigation";

import { DocumentView } from "@/components/documents/DocumentView";
import { PURCHASE_ORDER_CONFIG } from "@/lib/documentKinds";

export default function ViewPurchaseOrderPage() {
  const { id } = useParams<{ id: string }>();
  return <DocumentView config={PURCHASE_ORDER_CONFIG} id={Number(id)} />;
}
