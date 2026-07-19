"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Checkbox, Select } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { MenuProps } from "antd";
import { ArrowLeftRight, Eye, MoreHorizontal, SlidersHorizontal } from "lucide-react";

import { Button, DataTable, Dropdown, PageHeader, Tag, Typography } from "@/components/ui";
import { AdjustStockModal } from "@/components/inventory/AdjustStockModal";
import { TransferStockModal } from "@/components/inventory/TransferStockModal";
import { useCan } from "@/hooks/useSession";
import { useInventory, type InventoryFilters } from "@/hooks/useInventory";
import { useWarehouses } from "@/hooks/useWarehouses";
import type { InventoryItem } from "@/types";

const fmtQty = (s: string) => {
  const n = Number(s);
  return Number.isNaN(n) ? s : String(n);
};

export default function InventoryPage() {
  const router = useRouter();
  const can = useCan();
  const { data: warehouses } = useWarehouses();
  const [filters, setFilters] = useState<InventoryFilters>({});
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useInventory(filters);
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [transferItem, setTransferItem] = useState<InventoryItem | null>(null);

  const items = data?.pages.flatMap((p) => p.items) ?? [];
  const patch = (f: Partial<InventoryFilters>) => setFilters((prev) => ({ ...prev, ...f }));
  const canAdjust = can("inventory:update");
  const whList = warehouses ?? [];

  const rowMenu = (it: InventoryItem): MenuProps["items"] => [
    { key: "view", icon: <Eye size={14} />, label: "View item", onClick: () => router.push(`/items/${it.id}`) },
    ...(canAdjust
      ? [
          { key: "adjust", icon: <SlidersHorizontal size={14} />, label: "Adjust stock", onClick: () => setAdjustItem(it) },
          {
            key: "transfer",
            icon: <ArrowLeftRight size={14} />,
            label: "Transfer",
            disabled: whList.length < 2,
            onClick: () => setTransferItem(it),
          },
        ]
      : []),
  ];

  const columns: ColumnsType<InventoryItem> = [
    {
      title: "Item",
      key: "name",
      render: (_, it) => (
        <div>
          <div className="font-medium">{it.name}</div>
          {it.sku && (
            <Typography.Text type="secondary" className="text-xs">
              SKU: {it.sku}
            </Typography.Text>
          )}
        </div>
      ),
    },
    {
      title: "Type",
      key: "type",
      render: (_, it) => <Tag className="capitalize">{it.type === "variable" ? "Variants" : "Single"}</Tag>,
    },
    {
      title: "On hand",
      key: "on_hand",
      align: "right",
      render: (_, it) => (
        <span className="tabular-nums font-medium">
          {fmtQty(it.on_hand)} {it.uom_symbol ?? ""}
          {it.is_low && <Tag color="red" className="!ml-2">Low</Tag>}
        </span>
      ),
    },
    {
      title: "Reorder point",
      key: "reorder",
      align: "right",
      render: (_, it) =>
        it.reorder_point != null ? (
          <span className="tabular-nums">{it.reorder_point}</span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      title: "",
      key: "actions",
      width: 56,
      align: "right",
      render: (_, it) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Dropdown trigger={["click"]} menu={{ items: rowMenu(it) }} placement="bottomRight">
            <Button type="text" icon={<MoreHorizontal size={16} />} />
          </Dropdown>
        </div>
      ),
    },
  ];

  const toolbar = (
    <div className="flex items-center gap-3">
      <Select
        value={filters.location_id ?? null}
        onChange={(v) => patch({ location_id: v })}
        options={[
          { value: null, label: "All warehouses" },
          ...whList.map((w) => ({ value: w.id, label: w.name })),
        ]}
        className="!w-48"
      />
      <Checkbox
        checked={!!filters.low_stock}
        onChange={(e) => patch({ low_stock: e.target.checked || null })}
      >
        Low stock only
      </Checkbox>
    </div>
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Inventory" description="Stock on hand across your warehouses" />

      <DataTable<InventoryItem>
        loading={isLoading}
        columns={columns}
        dataSource={items}
        searchable
        searchPlaceholder="Search by name or SKU"
        onSearch={(search) => patch({ search })}
        toolbar={toolbar}
        onRowClick={(it) => router.push(`/items/${it.id}`)}
        hasMore={hasNextPage}
        onLoadMore={() => fetchNextPage()}
        loadingMore={isFetchingNextPage}
      />

      <AdjustStockModal item={adjustItem} warehouses={whList} onClose={() => setAdjustItem(null)} />
      <TransferStockModal item={transferItem} warehouses={whList} onClose={() => setTransferItem(null)} />
    </div>
  );
}
