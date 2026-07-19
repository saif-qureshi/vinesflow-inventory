"use client";

import type { ColumnsType } from "antd/es/table";

import { Table } from "@/components/ui";
import type { ItemStock, Warehouse } from "@/types";

const num = (s: string) => {
  const n = Number(s);
  return Number.isNaN(n) ? s : String(n);
};

interface Row {
  location_id: number;
  quantity: string;
}

export function ItemWarehouses({
  stock,
  warehouses,
}: {
  stock?: ItemStock;
  warehouses: Warehouse[];
}) {
  const whName = (id: number) => warehouses.find((w) => w.id === id)?.name ?? `#${id}`;

  const columns: ColumnsType<Row> = [
    { title: "Warehouse", key: "wh", render: (_, r) => whName(r.location_id) },
    {
      title: "Stock on hand",
      key: "qty",
      align: "right",
      render: (_, r) => <span className="font-medium tabular-nums">{num(r.quantity)}</span>,
    },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
      <Table<Row>
        rowKey="location_id"
        columns={columns}
        dataSource={stock?.by_location ?? []}
        pagination={false}
      />
    </div>
  );
}
