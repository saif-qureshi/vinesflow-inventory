"use client";

import { DocumentForm } from "@/components/documents/DocumentForm";
import { DELIVERY_CHALLAN_CONFIG } from "@/lib/documentKinds";

export default function NewDeliveryChallanPage() {
  return <DocumentForm config={DELIVERY_CHALLAN_CONFIG} />;
}
