"use client";

import { Table } from "antd";
import type { TableProps } from "antd";

export function DataTable<T extends object>(props: TableProps<T>) {
  return (
    <Table<T>
      rowKey="id"
      pagination={false}
      className="overflow-hidden rounded-xl bg-white"
      {...props}
    />
  );
}
