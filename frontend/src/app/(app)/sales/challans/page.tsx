"use client";

import { DocumentList } from "@/components/documents/DocumentList";
import { DELIVERY_CHALLAN_CONFIG } from "@/lib/documentKinds";

export default function DeliveryChallanListPage() {
  return <DocumentList config={DELIVERY_CHALLAN_CONFIG} />;
}
