"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import type { ColumnsType } from "antd/es/table";
import type { MenuProps } from "antd";

import { App, Button, DataTable, Dropdown, PageHeader, Tag, Typography } from "@/components/ui";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { useCan } from "@/hooks/useSession";
import { useCurrency } from "@/hooks/useCurrency";
import { useCategories } from "@/hooks/useCategories";
import { useDeleteProduct, useProducts, type ProductFilters } from "@/hooks/useProducts";
import { apiErrorMessage } from "@/lib/api";
import type { Product } from "@/types";

export default function ItemsPage() {
  const router = useRouter();
  const { message, modal } = App.useApp();
  const can = useCan();
  const { money } = useCurrency();
  const categories = useCategories();
  const del = useDeleteProduct();
  const [filters, setFilters] = useState<ProductFilters>({});
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useProducts(filters);

  const confirmDelete = (p: Product) => {
    modal.confirm({
      title: "Delete this item?",
      content: `"${p.name}" will be permanently removed. This action cannot be undone.`,
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await del.mutateAsync(p.id);
          message.success("Item deleted");
        } catch (err) {
          message.error(apiErrorMessage(err));
          throw err;
        }
      },
    });
  };

  const rowMenu = (p: Product): MenuProps["items"] => [
    { key: "view", icon: <Eye size={14} />, label: "View", onClick: () => router.push(`/items/${p.id}`) },
    ...(can("products:update")
      ? [{ key: "edit", icon: <Pencil size={14} />, label: "Edit", onClick: () => router.push(`/items/${p.id}/edit`) }]
      : []),
    ...(can("products:delete")
      ? [
          { type: "divider" as const },
          { key: "delete", icon: <Trash2 size={14} />, label: "Delete", danger: true, onClick: () => confirmDelete(p) },
        ]
      : []),
  ];

  const products = data?.pages.flatMap((p) => p.items) ?? [];
  const patch = (f: Partial<ProductFilters>) => setFilters((prev) => ({ ...prev, ...f }));

  const columns: ColumnsType<Product> = [
    {
      title: "Name",
      key: "name",
      render: (_, p) => (
        <div>
          <div className="font-medium">{p.name}</div>
          {p.sku && (
            <Typography.Text type="secondary" className="text-xs">
              SKU: {p.sku}
            </Typography.Text>
          )}
        </div>
      ),
    },
    {
      title: "Category",
      key: "category",
      render: (_, p) => (p.category ? <Tag>{p.category.name}</Tag> : <span className="text-gray-400">—</span>),
    },
    { title: "Unit", key: "uom", render: (_, p) => (p.uom ? p.uom.symbol : <span className="text-gray-400">—</span>) },
    {
      title: "Type",
      key: "type",
      render: (_, p) => (
        <div className="flex gap-1">
          <Tag color={p.nature === "service" ? "purple" : "blue"} className="capitalize">
            {p.nature}
          </Tag>
          <Tag className="capitalize">{p.type}</Tag>
        </div>
      ),
    },
    {
      title: "Sale price",
      key: "sale_price",
      align: "right",
      render: (_, p) => (
        <span className="tabular-nums">{p.sale_price != null ? money(p.sale_price) : "—"}</span>
      ),
    },
    {
      title: "Status",
      key: "status",
      render: (_, p) =>
        p.is_active ? <Tag color="green">Active</Tag> : <Tag color="default">Inactive</Tag>,
    },
    {
      title: "",
      key: "actions",
      width: 56,
      align: "right",
      render: (_, p) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Dropdown trigger={["click"]} menu={{ items: rowMenu(p) }} placement="bottomRight">
            <Button type="text" icon={<MoreHorizontal size={16} />} />
          </Dropdown>
        </div>
      ),
    },
  ];

  const toolbar = (
    <FilterDropdown
      groups={[
        {
          key: "category",
          label: "Category",
          value: filters.category_id != null ? String(filters.category_id) : null,
          options: (categories.data ?? []).map((c) => ({ value: String(c.id), label: c.name })),
          onChange: (v) => patch({ category_id: v ? Number(v) : null }),
        },
        {
          key: "nature",
          label: "Nature",
          value: filters.nature ?? null,
          options: [
            { value: "good", label: "Good" },
            { value: "service", label: "Service" },
          ],
          onChange: (v) => patch({ nature: (v as "good" | "service" | null) ?? null }),
        },
        {
          key: "type",
          label: "Type",
          value: filters.type ?? null,
          options: [
            { value: "single", label: "Single" },
            { value: "variable", label: "Variable" },
          ],
          onChange: (v) => patch({ type: (v as "single" | "variable" | null) ?? null }),
        },
        {
          key: "status",
          label: "Status",
          value: filters.is_active == null ? null : filters.is_active ? "active" : "inactive",
          options: [
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ],
          onChange: (v) => patch({ is_active: v == null ? null : v === "active" }),
        },
      ]}
    />
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Items"
        description="Products and services you sell or purchase"
        actions={
          can("products:create") && (
            <Button type="primary" icon={<Plus size={16} />} onClick={() => router.push("/items/new")}>
              New Item
            </Button>
          )
        }
      />

      <DataTable<Product>
        loading={isLoading}
        columns={columns}
        dataSource={products}
        searchable
        searchPlaceholder="Search by name or SKU"
        onSearch={(search) => patch({ search })}
        toolbar={toolbar}
        onRowClick={(p) => router.push(`/items/${p.id}`)}
        hasMore={hasNextPage}
        onLoadMore={() => fetchNextPage()}
        loadingMore={isFetchingNextPage}
      />
    </div>
  );
}
