"use client";

import { useParams } from "next/navigation";
import { Spin } from "antd";

import { DocumentForm } from "@/components/documents/DocumentForm";
import { useDocument } from "@/hooks/useDocuments";
import { CREDIT_NOTE_CONFIG } from "@/lib/documentKinds";

export default function EditCreditNotePage() {
  const { id } = useParams<{ id: string }>();
  const { data: doc, isLoading } = useDocument(CREDIT_NOTE_CONFIG.apiPath, Number(id));

  if (isLoading || !doc) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }
  return <DocumentForm config={CREDIT_NOTE_CONFIG} document={doc} />;
}
