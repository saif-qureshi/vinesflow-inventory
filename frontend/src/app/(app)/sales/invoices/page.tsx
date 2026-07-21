"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "antd";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Eye, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";

import { App, Button, DataTable, Dropdown, PageHeader, Tag, Typography } from "@/components/ui";
import { useCurrency } from "@/hooks/useCurrency";
import { useDeleteInvoice, useInvoices, type InvoiceFilters } from "@/hooks/useInvoices";
import { useCan } from "@/hooks/useSession";
import { apiErrorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { InvoiceListItem } from "@/types";
import { STATUS_META, STATUS_OPTIONS } from "./status";

export default function InvoicesPage() {
  const router = useRouter();
  const can = useCan();
  const { money } = useCurrency();
  const { message } = App.useApp();
  const [filters, setFilters] = useState<InvoiceFilters>({});
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useInvoices(filters);
  const del = useDeleteInvoice();

  const items = data?.pages.flatMap((p) => p.items) ?? [];
  const patch = (f: Partial<InvoiceFilters>) => setFilters((prev) => ({ ...prev, ...f }));
  const dash = <span className="text-gray-400">—</span>;

  const remove = async (id: number) => {
    try {
      await del.mutateAsync(id);
      message.success("Invoice deleted");
    } catch (err) {
      message.error(apiErrorMessage(err));
    }
  };

  const rowMenu = (inv: InvoiceListItem): MenuProps["items"] => [
    {
      key: "view",
      icon: <Eye size={14} />,
      label: "View",
      onClick: () => router.push(`/sales/invoices/${inv.id}`),
    },
    ...(inv.status === "draft" && can("invoices:update")
      ? [
          {
            key: "edit",
            icon: <Pencil size={14} />,
            label: "Edit",
            onClick: () => router.push(`/sales/invoices/${inv.id}/edit`),
          },
        ]
      : []),
    ...(inv.status === "draft" && can("invoices:delete")
      ? [
          {
            key: "delete",
            icon: <Trash2 size={14} />,
            label: "Delete",
            danger: true,
            onClick: () => remove(inv.id),
          },
        ]
      : []),
  ];

  const columns: ColumnsType<InvoiceListItem> = [
    {
      title: "Invoice",
      key: "number",
      render: (_, inv) => (
        <div>
          <div className="font-medium">{inv.number}</div>
          <Typography.Text type="secondary" className="text-xs">
            {formatDate(inv.issue_date)}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: "Customer",
      key: "party",
      render: (_, inv) => inv.party?.name ?? dash,
    },
    {
      title: "Due date",
      key: "due",
      render: (_, inv) => (inv.due_date ? formatDate(inv.due_date) : dash),
    },
    {
      title: "Status",
      key: "status",
      render: (_, inv) => {
        const meta = STATUS_META[inv.status];
        return <Tag color={meta?.color}>{meta?.label ?? inv.status}</Tag>;
      },
    },
    {
      title: "Total",
      key: "total",
      align: "right",
      render: (_, inv) => <span className="tabular-nums">{money(Number(inv.total))}</span>,
    },
    {
      title: "Balance due",
      key: "balance",
      align: "right",
      render: (_, inv) => (
        <span className="tabular-nums font-medium">{money(Number(inv.balance_due))}</span>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 56,
      align: "right",
      render: (_, inv) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Dropdown trigger={["click"]} menu={{ items: rowMenu(inv) }} placement="bottomRight">
            <Button type="text" icon={<MoreHorizontal size={16} />} />
          </Dropdown>
        </div>
      ),
    },
  ];

  const toolbar = (
    <Select
      value={filters.status ?? undefined}
      onChange={(v) => patch({ status: v ?? null })}
      allowClear
      placeholder="All statuses"
      options={STATUS_OPTIONS}
      className="!w-44"
    />
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Invoices"
        description="Bill your customers and track what they owe"
        actions={
          can("invoices:create") && (
            <Button
              type="primary"
              icon={<Plus size={16} />}
              onClick={() => router.push("/sales/invoices/new")}
            >
              New Invoice
            </Button>
          )
        }
      />

      <DataTable<InvoiceListItem>
        loading={isLoading}
        columns={columns}
        dataSource={items}
        searchable
        searchPlaceholder="Search by invoice number or reference"
        onSearch={(search) => patch({ search })}
        toolbar={toolbar}
        onRowClick={(inv) => router.push(`/sales/invoices/${inv.id}`)}
        hasMore={hasNextPage}
        onLoadMore={() => fetchNextPage()}
        loadingMore={isFetchingNextPage}
      />
    </div>
  );
}
