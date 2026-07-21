"use client";

import { useParams, useRouter } from "next/navigation";
import { Descriptions, Spin, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ArrowLeft, Ban, CheckCircle2, Pencil, Trash2 } from "lucide-react";

import { App, Button, Card, Popconfirm, Tag, Typography } from "@/components/ui";
import { useCurrency } from "@/hooks/useCurrency";
import {
  useDeleteInvoice,
  useFinalizeInvoice,
  useInvoice,
  useVoidInvoice,
} from "@/hooks/useInvoices";
import { useCan } from "@/hooks/useSession";
import { apiErrorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { DocumentLine } from "@/types";
import { STATUS_META } from "../status";

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div
      className={`flex justify-between ${strong ? "border-t border-gray-100 pt-2 text-base font-semibold" : "text-sm"}`}
    >
      <span className={strong ? "" : "text-gray-500"}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

export default function ViewInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { message } = App.useApp();
  const { money } = useCurrency();
  const can = useCan();
  const { data: inv, isLoading } = useInvoice(Number(id));
  const finalize = useFinalizeInvoice();
  const voidInvoice = useVoidInvoice();
  const del = useDeleteInvoice();

  if (isLoading || !inv) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  const dash = <span className="text-gray-400">—</span>;
  const meta = STATUS_META[inv.status];
  const isDraft = inv.status === "draft";

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      message.success(ok);
    } catch (err) {
      message.error(apiErrorMessage(err));
    }
  };

  const columns: ColumnsType<DocumentLine> = [
    { title: "Description", key: "description", render: (_, l) => l.description },
    {
      title: "Qty",
      key: "qty",
      align: "right",
      render: (_, l) => <span className="tabular-nums">{Number(l.quantity)}</span>,
    },
    {
      title: "Rate",
      key: "rate",
      align: "right",
      render: (_, l) => <span className="tabular-nums">{money(Number(l.unit_price))}</span>,
    },
    {
      title: "Discount",
      key: "discount",
      align: "right",
      render: (_, l) =>
        Number(l.discount) ? (
          <span className="tabular-nums">{money(Number(l.discount))}</span>
        ) : (
          dash
        ),
    },
    {
      title: "Tax",
      key: "tax",
      align: "right",
      render: (_, l) => <span className="tabular-nums">{money(Number(l.tax_amount))}</span>,
    },
    {
      title: "Amount",
      key: "amount",
      align: "right",
      render: (_, l) => (
        <span className="tabular-nums font-medium">{money(Number(l.line_total))}</span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          <Button
            type="text"
            icon={<ArrowLeft size={18} />}
            onClick={() => router.push("/sales/invoices")}
            className="!mt-0.5"
          />
          <div>
            <Typography.Title level={3} className="!mb-1">
              {inv.number}
            </Typography.Title>
            <div className="flex flex-wrap items-center gap-2">
              <Tag color={meta?.color}>{meta?.label ?? inv.status}</Tag>
              <Typography.Text type="secondary">{inv.party?.name}</Typography.Text>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isDraft && can("invoices:update") && (
            <>
              <Button
                icon={<Pencil size={16} />}
                onClick={() => router.push(`/sales/invoices/${inv.id}/edit`)}
              >
                Edit
              </Button>
              <Button
                type="primary"
                icon={<CheckCircle2 size={16} />}
                loading={finalize.isPending}
                onClick={() => run(() => finalize.mutateAsync(inv.id), "Invoice finalized")}
              >
                Finalize
              </Button>
            </>
          )}
          {!isDraft && inv.status !== "void" && can("invoices:update") && (
            <Popconfirm
              title="Void this invoice?"
              description="Stock movements will be reversed."
              okText="Void"
              okButtonProps={{ danger: true, loading: voidInvoice.isPending }}
              onConfirm={() => run(() => voidInvoice.mutateAsync(inv.id), "Invoice voided")}
            >
              <Button danger icon={<Ban size={16} />}>
                Void
              </Button>
            </Popconfirm>
          )}
          {isDraft && can("invoices:delete") && (
            <Popconfirm
              title="Delete this draft?"
              okText="Delete"
              okButtonProps={{ danger: true, loading: del.isPending }}
              onConfirm={async () => {
                await run(() => del.mutateAsync(inv.id), "Invoice deleted");
                router.push("/sales/invoices");
              }}
            >
              <Button danger icon={<Trash2 size={16} />} />
            </Popconfirm>
          )}
        </div>
      </div>

      <Card className="border-gray-100">
        <Descriptions column={{ xs: 1, md: 4 }} colon={false} size="small">
          <Descriptions.Item label="Customer">{inv.party?.name ?? dash}</Descriptions.Item>
          <Descriptions.Item label="Invoice date">{formatDate(inv.issue_date)}</Descriptions.Item>
          <Descriptions.Item label="Due date">
            {inv.due_date ? formatDate(inv.due_date) : dash}
          </Descriptions.Item>
          <Descriptions.Item label="Reference">{inv.reference || dash}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Items" className="border-gray-100">
        <Table<DocumentLine>
          size="small"
          rowKey="id"
          columns={columns}
          dataSource={inv.lines}
          pagination={false}
        />
        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-sm space-y-2">
            <Row label="Subtotal" value={money(Number(inv.subtotal))} />
            {Number(inv.discount_total) > 0 && (
              <Row label="Discount" value={`-${money(Number(inv.discount_total))}`} />
            )}
            <Row label="Tax" value={money(Number(inv.tax_total))} />
            {Number(inv.shipping) > 0 && (
              <Row label="Shipping" value={money(Number(inv.shipping))} />
            )}
            {Number(inv.adjustment) !== 0 && (
              <Row label="Adjustment" value={money(Number(inv.adjustment))} />
            )}
            <Row label="Total" value={money(Number(inv.total))} strong />
            <Row label="Amount paid" value={money(Number(inv.amount_paid))} />
            <Row label="Balance due" value={money(Number(inv.balance_due))} strong />
          </div>
        </div>
      </Card>

      {(inv.notes || inv.terms) && (
        <Card className="border-gray-100">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {inv.notes && (
              <div>
                <div className="text-xs text-gray-400">Notes</div>
                <div className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{inv.notes}</div>
              </div>
            )}
            {inv.terms && (
              <div>
                <div className="text-xs text-gray-400">Terms & conditions</div>
                <div className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{inv.terms}</div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
