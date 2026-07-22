"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "antd";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Ban, Eye, MoreHorizontal, Plus, Trash2 } from "lucide-react";

import { App, Button, DataTable, Dropdown, PageHeader, Tag, Typography } from "@/components/ui";
import { useCurrency } from "@/hooks/useCurrency";
import {
  useCancelPayment,
  useDeletePayment,
  usePaymentList,
  type PaymentFilters,
} from "@/hooks/usePayments";
import { useCan } from "@/hooks/useSession";
import { apiErrorMessage } from "@/lib/api";
import type { PaymentKindConfig } from "@/lib/paymentKinds";
import { formatDate } from "@/lib/format";
import type { PaymentSummary } from "@/types";
import { PaymentModal } from "./PaymentModal";
import { METHOD_LABEL, PAYMENT_STATUS_META, PAYMENT_STATUS_OPTIONS } from "./status";

export function PaymentList({ config }: { config: PaymentKindConfig }) {
  const router = useRouter();
  const can = useCan();
  const { money } = useCurrency();
  const { message } = App.useApp();
  const [filters, setFilters] = useState<PaymentFilters>({});
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = usePaymentList(
    config.apiPath,
    filters,
  );
  const cancel = useCancelPayment(config.apiPath);
  const del = useDeletePayment(config.apiPath);
  const [modalOpen, setModalOpen] = useState(false);

  const items = data?.pages.flatMap((p) => p.items) ?? [];
  const patch = (f: Partial<PaymentFilters>) => setFilters((prev) => ({ ...prev, ...f }));

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      message.success(ok);
    } catch (err) {
      message.error(apiErrorMessage(err));
    }
  };

  const rowMenu = (p: PaymentSummary): MenuProps["items"] => [
    {
      key: "view",
      icon: <Eye size={14} />,
      label: "View",
      onClick: () => router.push(`${config.basePath}/${p.id}`),
    },
    ...(p.status === "submitted" && can("payments:update")
      ? [
          {
            key: "cancel",
            icon: <Ban size={14} />,
            label: "Cancel",
            danger: true,
            onClick: () => run(() => cancel.mutateAsync(p.id), "Payment cancelled"),
          },
        ]
      : []),
    ...(p.status === "draft" && can("payments:delete")
      ? [
          {
            key: "delete",
            icon: <Trash2 size={14} />,
            label: "Delete",
            danger: true,
            onClick: () => run(() => del.mutateAsync(p.id), "Payment deleted"),
          },
        ]
      : []),
  ];

  const columns: ColumnsType<PaymentSummary> = [
    {
      title: "Payment",
      key: "number",
      render: (_, p) => (
        <div>
          <div className="font-medium">{p.number}</div>
          <Typography.Text type="secondary" className="text-xs">
            {formatDate(p.document_date)}
          </Typography.Text>
        </div>
      ),
    },
    { title: config.labels.party, key: "party", render: (_, p) => p.party_name ?? "—" },
    { title: "Method", key: "method", render: (_, p) => METHOD_LABEL[p.method] ?? p.method },
    {
      title: "Status",
      key: "status",
      render: (_, p) => {
        const m = PAYMENT_STATUS_META[p.status];
        return <Tag color={m?.color}>{m?.label ?? p.status}</Tag>;
      },
    },
    {
      title: "Amount",
      key: "amount",
      align: "right",
      render: (_, p) => <span className="tabular-nums font-medium">{money(Number(p.amount))}</span>,
    },
    {
      title: "Unapplied",
      key: "unapplied",
      align: "right",
      render: (_, p) => <span className="tabular-nums">{money(Number(p.unapplied_amount))}</span>,
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
    <Select
      value={filters.status ?? undefined}
      onChange={(v) => patch({ status: v ?? null })}
      allowClear
      placeholder="All statuses"
      options={PAYMENT_STATUS_OPTIONS}
      className="!w-40"
    />
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title={config.labels.listTitle}
        description={config.labels.listDescription}
        actions={
          can("payments:create") && (
            <Button type="primary" icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
              Record Payment
            </Button>
          )
        }
      />

      <DataTable<PaymentSummary>
        loading={isLoading}
        columns={columns}
        dataSource={items}
        searchable
        searchPlaceholder="Search by number or reference"
        onSearch={(search) => patch({ search })}
        toolbar={toolbar}
        onRowClick={(p) => router.push(`${config.basePath}/${p.id}`)}
        hasMore={hasNextPage}
        onLoadMore={() => fetchNextPage()}
        loadingMore={isFetchingNextPage}
      />

      <PaymentModal config={config} open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
