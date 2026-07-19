"use client";

import { useParams } from "next/navigation";
import { Spin } from "antd";

import { ItemForm } from "../../ItemForm";
import { useProduct } from "@/hooks/useProducts";

export default function EditItemPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useProduct(Number(id));

  if (isLoading || !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return <ItemForm key={data.id} product={data} />;
}
