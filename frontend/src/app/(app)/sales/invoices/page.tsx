"use client";

import { DocumentList } from "@/components/documents/DocumentList";
import { INVOICE_CONFIG } from "@/lib/documentKinds";

export default function InvoicesPage() {
  return <DocumentList config={INVOICE_CONFIG} />;
}
