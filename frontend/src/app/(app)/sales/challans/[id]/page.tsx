"use client";

import { useParams } from "next/navigation";

import { DocumentView } from "@/components/documents/DocumentView";
import { DELIVERY_CHALLAN_CONFIG } from "@/lib/documentKinds";

export default function ViewDeliveryChallanPage() {
  const { id } = useParams<{ id: string }>();
  return <DocumentView config={DELIVERY_CHALLAN_CONFIG} id={Number(id)} />;
}
