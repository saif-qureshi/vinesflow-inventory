"use client";

import { useParams } from "next/navigation";
import { Spin } from "antd";

import { useInvoice } from "@/hooks/useInvoices";
import { InvoiceForm } from "../../InvoiceForm";

export default function EditInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const { data: invoice, isLoading } = useInvoice(Number(id));

  if (isLoading || !invoice) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }
  return <InvoiceForm invoice={invoice} />;
}
