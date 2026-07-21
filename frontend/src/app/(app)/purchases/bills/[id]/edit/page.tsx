"use client";

import { useParams } from "next/navigation";
import { Spin } from "antd";

import { DocumentForm } from "@/components/documents/DocumentForm";
import { useDocument } from "@/hooks/useDocuments";
import { BILL_CONFIG } from "@/lib/documentKinds";

export default function EditBillPage() {
  const { id } = useParams<{ id: string }>();
  const { data: bill, isLoading } = useDocument(BILL_CONFIG.apiPath, Number(id));

  if (isLoading || !bill) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }
  return <DocumentForm config={BILL_CONFIG} document={bill} />;
}
