"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DatePicker, InputNumber, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import { Package, Plus, Trash2 } from "lucide-react";

import {
  App,
  Avatar,
  Button,
  Card,
  Form,
  Input,
  Select,
  TextArea,
  Typography,
} from "@/components/ui";
import { useCurrency } from "@/hooks/useCurrency";
import {
  useCreateDocument,
  useSellableItems,
  useTaxRates,
  useUpdateDocument,
} from "@/hooks/useDocuments";
import { useParties } from "@/hooks/useParties";
import { useWarehouses } from "@/hooks/useWarehouses";
import { apiErrorMessage } from "@/lib/api";
import type { DocumentKindConfig } from "@/lib/documentKinds";
import type { DocumentInput, DocumentRecord } from "@/types";

interface LineRow {
  key: string;
  product_id: number | null;
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_rate_id: number | null;
}

interface FormValues {
  party_id: number;
  issue_date: Dayjs;
  due_date?: Dayjs | null;
  reference?: string;
  warehouse_id?: number | null;
  notes?: string;
  terms?: string;
  shipping?: number;
  adjustment?: number;
}

let counter = 0;
const newKey = () => `line-${counter++}`;

const emptyLine = (): LineRow => ({
  key: newKey(),
  product_id: null,
  description: "",
  quantity: 1,
  unit_price: 0,
  discount: 0,
  tax_rate_id: null,
});

export function DocumentForm({
  config,
  document,
}: {
  config: DocumentKindConfig;
  document?: DocumentRecord;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const { currency, money } = useCurrency();
  const [form] = Form.useForm<FormValues>();
  const create = useCreateDocument(config.apiPath);
  const update = useUpdateDocument(config.apiPath);

  const { data: taxRates } = useTaxRates();
  const { data: warehouses } = useWarehouses();
  const [itemSearch, setItemSearch] = useState("");
  const { data: sellable } = useSellableItems(itemSearch);
  const parties = useParties(config.partyRole);

  const [lines, setLines] = useState<LineRow[]>(() =>
    document?.lines.length
      ? document.lines.map((l) => ({
          key: newKey(),
          product_id: l.product_id,
          description: l.description,
          quantity: Number(l.quantity),
          unit_price: Number(l.unit_price),
          discount: Number(l.discount),
          tax_rate_id: l.tax_rate_id,
        }))
      : [emptyLine()],
  );
  const [shipping, setShipping] = useState(Number(document?.shipping ?? 0));
  const [adjustment, setAdjustment] = useState(Number(document?.adjustment ?? 0));
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [focusKey, setFocusKey] = useState<string | null>(null);

  const isEdit = !!document;
  const saving = create.isPending || update.isPending;
  const backHref = isEdit ? `${config.basePath}/${document.id}` : config.basePath;

  const partyOptions = (parties.data?.pages.flatMap((p) => p.items) ?? []).map((c) => ({
    value: c.id,
    label: c.name,
  }));
  const taxOptions = (taxRates ?? []).map((t) => ({
    value: t.id,
    label: `${t.name} (${Number(t.rate)}%)`,
  }));
  const itemOptions = (sellable ?? []).map((i) => ({
    value: i.id,
    label: i.sku ? `${i.name} · ${i.sku}` : i.name,
  }));

  const rateOf = (id: number | null) =>
    id == null ? 0 : Number((taxRates ?? []).find((t) => t.id === id)?.rate ?? 0);

  const totals = useMemo(() => {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    for (const line of lines) {
      const base = line.quantity * line.unit_price;
      const taxable = base - line.discount;
      subtotal += base;
      discountTotal += line.discount;
      taxTotal += (taxable * rateOf(line.tax_rate_id)) / 100;
    }
    return {
      subtotal,
      discountTotal,
      taxTotal,
      total: subtotal - discountTotal + taxTotal + shipping + adjustment,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, shipping, adjustment, taxRates]);

  const patchLine = (key: string, patch: Partial<LineRow>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const addLine = (focus = false) => {
    const line = emptyLine();
    setLines((prev) => [...prev, line]);
    if (focus) setFocusKey(line.key);
  };

  const removeLines = (keys: React.Key[]) => {
    setLines((prev) => {
      const next = prev.filter((l) => !keys.includes(l.key));
      return next.length ? next : [emptyLine()];
    });
    setSelectedKeys((prev) => prev.filter((k) => !keys.includes(k)));
  };

  const tabToNewRow = (row: LineRow) => (e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || e.shiftKey) return;
    if (lines[lines.length - 1]?.key !== row.key) return;
    e.preventDefault();
    addLine(true);
  };

  const pickItem = (key: string, productId: number) => {
    const item = (sellable ?? []).find((i) => i.id === productId);
    const price = item ? item[config.priceField] : null;
    patchLine(key, {
      product_id: productId,
      description: item?.name ?? "",
      unit_price: price != null ? Number(price) : 0,
    });
    setItemSearch("");
  };

  const columns: ColumnsType<LineRow> = [
    {
      title: "Item",
      key: "item",
      width: 340,
      render: (_, row) => (
        <Select
          value={row.product_id ?? undefined}
          onChange={(v) =>
            v == null ? patchLine(row.key, { product_id: null }) : pickItem(row.key, v)
          }
          onSearch={setItemSearch}
          onOpenChange={(open) => open && setItemSearch("")}
          options={itemOptions}
          placeholder="Select an item"
          showSearch
          filterOption={false}
          allowClear
          labelRender={() => row.description}
          autoFocus={row.key === focusKey}
          popupMatchSelectWidth={420}
          optionRender={(option) => {
            const item = (sellable ?? []).find((i) => i.id === option.value);
            if (!item) return option.label;
            return (
              <div className="flex items-center gap-2">
                <Avatar
                  shape="square"
                  size={30}
                  src={item.image_url ?? undefined}
                  icon={<Package size={14} />}
                />
                <div className="min-w-0 leading-tight">
                  <div className="truncate text-sm">{item.name}</div>
                  {item.description && (
                    <div className="truncate text-xs text-gray-400">{item.description}</div>
                  )}
                </div>
              </div>
            );
          }}
          className="w-full"
        />
      ),
    },
    {
      title: "Qty",
      key: "quantity",
      width: 100,
      render: (_, row) => (
        <InputNumber
          className="!w-full"
          min={0.001}
          value={row.quantity}
          onChange={(v) => patchLine(row.key, { quantity: v ?? 0 })}
        />
      ),
    },
    {
      title: "Rate",
      key: "unit_price",
      width: 130,
      render: (_, row) => (
        <InputNumber
          className="!w-full"
          min={0}
          prefix={currency}
          value={row.unit_price}
          onChange={(v) => patchLine(row.key, { unit_price: v ?? 0 })}
        />
      ),
    },
    {
      title: "Discount",
      key: "discount",
      width: 120,
      render: (_, row) => (
        <InputNumber
          className="!w-full"
          min={0}
          value={row.discount}
          onChange={(v) => patchLine(row.key, { discount: v ?? 0 })}
        />
      ),
    },
    {
      title: "Tax",
      key: "tax",
      width: 150,
      render: (_, row) => (
        <Select
          value={row.tax_rate_id ?? undefined}
          onChange={(v) => patchLine(row.key, { tax_rate_id: v ?? null })}
          options={taxOptions}
          placeholder="No tax"
          allowClear
          onKeyDown={tabToNewRow(row)}
          className="w-full"
        />
      ),
    },
    {
      title: "Amount",
      key: "amount",
      align: "right",
      width: 120,
      render: (_, row) => {
        const taxable = row.quantity * row.unit_price - row.discount;
        return (
          <span className="tabular-nums">
            {money(taxable + (taxable * rateOf(row.tax_rate_id)) / 100)}
          </span>
        );
      },
    },
    {
      title: "",
      key: "remove",
      width: 48,
      align: "right",
      render: (_, row) => (
        <Button
          type="text"
          danger
          size="small"
          icon={<Trash2 size={14} />}
          disabled={lines.length === 1}
          onClick={() => removeLines([row.key])}
        />
      ),
    },
  ];

  const submit = async (values: FormValues) => {
    const clean = lines.filter((l) => l.description.trim() || l.product_id);
    if (!clean.length) {
      message.error("Add at least one line item");
      return;
    }
    const payload: DocumentInput = {
      party_id: values.party_id,
      issue_date: values.issue_date.format("YYYY-MM-DD"),
      due_date: values.due_date ? values.due_date.format("YYYY-MM-DD") : null,
      reference: values.reference || null,
      warehouse_id: values.warehouse_id ?? null,
      notes: values.notes || null,
      terms: values.terms || null,
      shipping,
      adjustment,
      lines: clean.map((l) => ({
        product_id: l.product_id,
        description: l.description.trim() || "Item",
        quantity: l.quantity,
        unit_price: l.unit_price,
        discount: l.discount,
        tax_rate_id: l.tax_rate_id,
      })),
    };
    try {
      const saved = isEdit
        ? await update.mutateAsync({ id: document.id, payload })
        : await create.mutateAsync(payload);
      message.success(`${config.labels.singular} ${isEdit ? "updated" : "created"}`);
      router.push(`${config.basePath}/${saved.id}`);
    } catch (err) {
      message.error(apiErrorMessage(err));
    }
  };

  return (
    <Form<FormValues>
      form={form}
      layout="vertical"
      onFinish={submit}
      initialValues={{
        party_id: document?.party_id ?? undefined,
        issue_date: document ? dayjs(document.issue_date) : dayjs(),
        due_date: document?.due_date ? dayjs(document.due_date) : null,
        reference: document?.reference ?? undefined,
        warehouse_id: document?.warehouse_id ?? undefined,
        notes: document?.notes ?? undefined,
        terms: document?.terms ?? undefined,
      }}
      className="flex flex-col gap-6 pb-24"
    >
      <Typography.Title level={3} className="!mb-0">
        {isEdit ? `Edit ${document.number}` : config.labels.newAction}
      </Typography.Title>

      <Card className="border-gray-100">
        <div className="grid grid-cols-1 gap-x-6 md:grid-cols-3">
          <Form.Item
            name="party_id"
            label={config.labels.party}
            rules={[{ required: true, message: `${config.labels.party} is required` }]}
          >
            <Select
              options={partyOptions}
              placeholder={`Select ${config.labels.party.toLowerCase()}`}
              showSearch
              optionFilterProp="label"
              loading={parties.isLoading}
            />
          </Form.Item>
          <Form.Item
            name="issue_date"
            label={config.labels.dateLabel}
            rules={[{ required: true, message: `${config.labels.dateLabel} is required` }]}
          >
            <DatePicker className="!w-full" format="DD MMM YYYY" />
          </Form.Item>
          <Form.Item name="due_date" label="Due date">
            <DatePicker className="!w-full" format="DD MMM YYYY" />
          </Form.Item>
          <Form.Item name="reference" label={config.labels.referenceLabel}>
            <Input placeholder={config.labels.referencePlaceholder} />
          </Form.Item>
          <Form.Item name="warehouse_id" label="Warehouse" extra={config.labels.warehouseHint}>
            <Select
              options={(warehouses ?? []).map((w) => ({ value: w.id, label: w.name }))}
              placeholder="Default warehouse"
              allowClear
            />
          </Form.Item>
        </div>
      </Card>

      <Card title="Items" className="border-gray-100">
        <Table<LineRow>
          size="small"
          rowKey="key"
          columns={columns}
          dataSource={lines}
          pagination={false}
          scroll={{ x: 1100 }}
          rowSelection={{
            selectedRowKeys: selectedKeys,
            onChange: setSelectedKeys,
          }}
        />
        <div className="mt-3 flex items-center gap-3">
          <Button icon={<Plus size={16} />} onClick={() => addLine()}>
            Add line
          </Button>
          {selectedKeys.length > 0 && (
            <Button danger icon={<Trash2 size={16} />} onClick={() => removeLines(selectedKeys)}>
              Delete {selectedKeys.length} selected
            </Button>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-sm space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="tabular-nums">{money(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Discount</span>
              <span className="tabular-nums">-{money(totals.discountTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Tax</span>
              <span className="tabular-nums">{money(totals.taxTotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Shipping</span>
              <InputNumber
                size="small"
                min={0}
                value={shipping}
                onChange={(v) => setShipping(v ?? 0)}
                className="!w-32"
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Adjustment</span>
              <InputNumber
                size="small"
                value={adjustment}
                onChange={(v) => setAdjustment(v ?? 0)}
                className="!w-32"
              />
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{money(totals.total)}</span>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Notes & Terms" className="border-gray-100">
        <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
          <Form.Item name="notes" label="Notes">
            <TextArea rows={3} placeholder="Notes" />
          </Form.Item>
          <Form.Item name="terms" label="Terms & conditions">
            <TextArea rows={3} placeholder="Payment terms" />
          </Form.Item>
        </div>
      </Card>

      <div className="sticky bottom-0 -mx-6 flex gap-3 border-t border-gray-100 bg-slate-50 px-6 py-3">
        <Button type="primary" htmlType="submit" loading={saving}>
          {isEdit ? "Save" : "Save as Draft"}
        </Button>
        <Button onClick={() => router.push(backHref)}>Cancel</Button>
      </div>
    </Form>
  );
}
