"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Descriptions, Spin, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ArrowLeft, Ban, CheckCircle2, Pencil, Trash2, Wallet } from "lucide-react";

import { App, Button, Card, Popconfirm, Tag, Typography } from "@/components/ui";
import { PaymentModal } from "@/components/payments/PaymentModal";
import { useCurrency } from "@/hooks/useCurrency";
import {
  useDeleteDocument,
  useDocument,
  useFinalizeDocument,
  useVoidDocument,
} from "@/hooks/useDocuments";
import { useCan } from "@/hooks/useSession";
import { apiErrorMessage } from "@/lib/api";
import type { DocumentKindConfig } from "@/lib/documentKinds";
import { PAYMENT_CONFIG } from "@/lib/paymentKinds";
import { formatDate } from "@/lib/format";
import type { DocumentLine } from "@/types";
import { documentBadge } from "./status";

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

export function DocumentView({ config, id }: { config: DocumentKindConfig; id: number }) {
  const router = useRouter();
  const { message } = App.useApp();
  const { money } = useCurrency();
  const can = useCan();
  const { data: doc, isLoading } = useDocument(config.apiPath, id);
  const finalize = useFinalizeDocument(config.apiPath);
  const voidDoc = useVoidDocument(config.apiPath);
  const del = useDeleteDocument(config.apiPath);
  const [payOpen, setPayOpen] = useState(false);

  if (isLoading || !doc) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  const dash = <span className="text-gray-400">—</span>;
  const meta = documentBadge(doc.status, doc.payment_status);
  const isDraft = doc.status === "draft";

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
        Number(l.discount) ? <span className="tabular-nums">{money(Number(l.discount))}</span> : dash,
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
            onClick={() => router.push(config.basePath)}
            className="!mt-0.5"
          />
          <div>
            <Typography.Title level={3} className="!mb-1">
              {doc.number}
            </Typography.Title>
            <div className="flex flex-wrap items-center gap-2">
              <Tag color={meta.color}>{meta.label}</Tag>
              <Typography.Text type="secondary">{doc.party?.name}</Typography.Text>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isDraft && can(`${config.permission}:update`) && (
            <>
              <Button
                icon={<Pencil size={16} />}
                onClick={() => router.push(`${config.basePath}/${doc.id}/edit`)}
              >
                Edit
              </Button>
              <Button
                type="primary"
                icon={<CheckCircle2 size={16} />}
                loading={finalize.isPending}
                onClick={() =>
                  run(() => finalize.mutateAsync(doc.id), `${config.labels.singular} finalized`)
                }
              >
                Finalize
              </Button>
            </>
          )}
          {doc.status === "sent" &&
            doc.payment_status !== "paid" &&
            Number(doc.balance_due) > 0 &&
            can("payments:create") && (
              <Button type="primary" icon={<Wallet size={16} />} onClick={() => setPayOpen(true)}>
                Record Payment
              </Button>
            )}
          {!isDraft && doc.status !== "void" && can(`${config.permission}:update`) && (
            <Popconfirm
              title={`Void this ${config.labels.singular.toLowerCase()}?`}
              description="Stock movements will be reversed."
              okText="Void"
              okButtonProps={{ danger: true, loading: voidDoc.isPending }}
              onConfirm={() =>
                run(() => voidDoc.mutateAsync(doc.id), `${config.labels.singular} voided`)
              }
            >
              <Button danger icon={<Ban size={16} />}>
                Void
              </Button>
            </Popconfirm>
          )}
          {isDraft && can(`${config.permission}:delete`) && (
            <Popconfirm
              title="Delete this draft?"
              okText="Delete"
              okButtonProps={{ danger: true, loading: del.isPending }}
              onConfirm={async () => {
                await run(() => del.mutateAsync(doc.id), `${config.labels.singular} deleted`);
                router.push(config.basePath);
              }}
            >
              <Button danger icon={<Trash2 size={16} />} />
            </Popconfirm>
          )}
        </div>
      </div>

      <Card className="border-gray-100">
        <Descriptions column={{ xs: 1, md: 4 }} colon={false} size="small">
          <Descriptions.Item label={config.labels.party}>
            {doc.party?.name ?? dash}
          </Descriptions.Item>
          <Descriptions.Item label={config.labels.dateLabel}>
            {formatDate(doc.issue_date)}
          </Descriptions.Item>
          <Descriptions.Item label="Due date">
            {doc.due_date ? formatDate(doc.due_date) : dash}
          </Descriptions.Item>
          <Descriptions.Item label={config.labels.referenceLabel}>
            {doc.reference || dash}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Items" className="border-gray-100">
        <Table<DocumentLine>
          size="small"
          rowKey="id"
          columns={columns}
          dataSource={doc.lines}
          pagination={false}
        />
        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-sm space-y-2">
            <Row label="Subtotal" value={money(Number(doc.subtotal))} />
            {Number(doc.discount_total) > 0 && (
              <Row label="Discount" value={`-${money(Number(doc.discount_total))}`} />
            )}
            <Row label="Tax" value={money(Number(doc.tax_total))} />
            {Number(doc.shipping) > 0 && <Row label="Shipping" value={money(Number(doc.shipping))} />}
            {Number(doc.adjustment) !== 0 && (
              <Row label="Adjustment" value={money(Number(doc.adjustment))} />
            )}
            <Row label="Total" value={money(Number(doc.total))} strong />
            <Row label="Amount paid" value={money(Number(doc.amount_paid))} />
            <Row label="Balance due" value={money(Number(doc.balance_due))} strong />
          </div>
        </div>
      </Card>

      {(doc.notes || doc.terms) && (
        <Card className="border-gray-100">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {doc.notes && (
              <div>
                <div className="text-xs text-gray-400">Notes</div>
                <div className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{doc.notes}</div>
              </div>
            )}
            {doc.terms && (
              <div>
                <div className="text-xs text-gray-400">Terms & conditions</div>
                <div className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{doc.terms}</div>
              </div>
            )}
          </div>
        </Card>
      )}

      <PaymentModal
        config={PAYMENT_CONFIG[config.paymentDirection]}
        document={doc}
        open={payOpen}
        onClose={() => setPayOpen(false)}
      />
    </div>
  );
}
