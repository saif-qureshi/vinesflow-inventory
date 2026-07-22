"use client";

import { DocumentList } from "@/components/documents/DocumentList";
import { CREDIT_NOTE_CONFIG } from "@/lib/documentKinds";

export default function CreditNoteListPage() {
  return <DocumentList config={CREDIT_NOTE_CONFIG} />;
}
