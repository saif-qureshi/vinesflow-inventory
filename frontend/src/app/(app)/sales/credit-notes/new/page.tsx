"use client";

import { DocumentForm } from "@/components/documents/DocumentForm";
import { CREDIT_NOTE_CONFIG } from "@/lib/documentKinds";

export default function NewCreditNotePage() {
  return <DocumentForm config={CREDIT_NOTE_CONFIG} />;
}
