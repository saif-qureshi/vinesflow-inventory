"use client";

import type { ColumnsType } from "antd/es/table";

import { Table } from "@/components/ui";
import type { ItemStock, Product, StockLevelRow, Warehouse } from "@/types";

const num = (s: string) => {
  const n = Number(s);
  return Number.isNaN(n) ? s : String(n);
};

export function ItemWarehouses({
  product,
  stock,
  warehouses,
}: {
  product: Product;
  stock?: ItemStock;
  warehouses: Warehouse[];
}) {
  const whName = (id: number) => warehouses.find((w) => w.id === id)?.name ?? `#${id}`;
  const variantName = (id: number | null) =>
    id == null ? "—" : product.variants.find((v) => v.id === id)?.name ?? `#${id}`;
  const isVariable = product.type === "variable";

  const columns: ColumnsType<StockLevelRow> = [
    { title: "Warehouse", key: "wh", render: (_, r) => whName(r.location_id) },
    ...(isVariable
      ? [{ title: "Variant", key: "variant", render: (_: unknown, r: StockLevelRow) => variantName(r.variant_id) }]
      : []),
    {
      title: "Stock on hand",
      key: "qty",
      align: "right",
      render: (_, r) => <span className="font-medium tabular-nums">{num(r.quantity)}</span>,
    },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
      <Table<StockLevelRow>
        rowKey={(r) => `${r.location_id}-${r.variant_id ?? "x"}`}
        columns={columns}
        dataSource={stock?.levels ?? []}
        pagination={false}
      />
    </div>
  );
}
