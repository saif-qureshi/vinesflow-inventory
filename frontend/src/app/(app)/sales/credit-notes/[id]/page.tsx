"use client";

import { useParams } from "next/navigation";

import { DocumentView } from "@/components/documents/DocumentView";
import { CREDIT_NOTE_CONFIG } from "@/lib/documentKinds";

export default function ViewCreditNotePage() {
  const { id } = useParams<{ id: string }>();
  return <DocumentView config={CREDIT_NOTE_CONFIG} id={Number(id)} />;
}
