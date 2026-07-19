"use client";

import type { ColumnsType } from "antd/es/table";

import { Table, Tag } from "@/components/ui";
import { useItemMovements } from "@/hooks/useInventory";
import { formatDate } from "@/lib/format";
import type { Product, StockMovement, Warehouse } from "@/types";

export function ItemTransactions({
  product,
  warehouses,
}: {
  product: Product;
  warehouses: Warehouse[];
}) {
  const { data, isLoading } = useItemMovements(product.id);
  const whName = (id: number) => warehouses.find((w) => w.id === id)?.name ?? `#${id}`;
  const variantName = (id: number | null) =>
    id == null ? "—" : product.variants.find((v) => v.id === id)?.name ?? `#${id}`;
  const isVariable = product.type === "variable";
  const dash = <span className="text-gray-400">—</span>;

  const columns: ColumnsType<StockMovement> = [
    { title: "Date", key: "date", render: (_, m) => formatDate(m.created_at) },
    { title: "Type", key: "type", render: (_, m) => <Tag className="capitalize">{m.type}</Tag> },
    { title: "Warehouse", key: "wh", render: (_, m) => whName(m.location_id) },
    ...(isVariable
      ? [{ title: "Variant", key: "variant", render: (_: unknown, m: StockMovement) => variantName(m.variant_id) }]
      : []),
    {
      title: "Change",
      key: "change",
      align: "right",
      render: (_, m) => {
        const n = Number(m.qty_delta);
        return (
          <span className={`tabular-nums font-medium ${n < 0 ? "text-red-500" : "text-green-600"}`}>
            {n > 0 ? `+${n}` : n}
          </span>
        );
      },
    },
    { title: "Reason", key: "reason", render: (_, m) => m.reason || dash },
    { title: "Note", key: "note", render: (_, m) => m.note || dash },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
      <Table<StockMovement>
        rowKey="id"
        loading={isLoading}
        columns={columns}
        dataSource={data ?? []}
        pagination={false}
      />
    </div>
  );
}
