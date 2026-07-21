"use client";

import { DocumentList } from "@/components/documents/DocumentList";
import { BILL_CONFIG } from "@/lib/documentKinds";

export default function BillsPage() {
  return <DocumentList config={BILL_CONFIG} />;
}
