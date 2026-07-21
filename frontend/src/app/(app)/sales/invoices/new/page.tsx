"use client";

import { DocumentForm } from "@/components/documents/DocumentForm";
import { INVOICE_CONFIG } from "@/lib/documentKinds";

export default function NewInvoicePage() {
  return <DocumentForm config={INVOICE_CONFIG} />;
}
