"use client";

import { Dispatch, SetStateAction } from "react";
import { Input, InputNumber, Select, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui";
import type { VariantAttribute } from "@/types";
import { cartesian, variantSig, type VariantOverride } from "./variants";

interface Row {
  options: Record<string, string>;
}

export function VariantsBuilder({
  attributes,
  setAttributes,
  overrides,
  setOverrides,
  currency,
}: {
  attributes: VariantAttribute[];
  setAttributes: Dispatch<SetStateAction<VariantAttribute[]>>;
  overrides: Record<string, VariantOverride>;
  setOverrides: Dispatch<SetStateAction<Record<string, VariantOverride>>>;
  currency: string;
}) {
  const rows: Row[] = cartesian(attributes).map((options) => ({ options }));

  const updateAttr = (i: number, patch: Partial<VariantAttribute>) =>
    setAttributes((prev) => prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));

  const setField = (sig: string, patch: VariantOverride) =>
    setOverrides((prev) => ({ ...prev, [sig]: { ...prev[sig], ...patch } }));

  const copyToAll = (field: "sale_price" | "purchase_price") => {
    if (!rows.length) return;
    const value = overrides[variantSig(rows[0].options)]?.[field];
    setOverrides((prev) => {
      const next = { ...prev };
      for (const row of rows) {
        const sig = variantSig(row.options);
        next[sig] = { ...next[sig], [field]: value };
      }
      return next;
    });
  };

  const priceTitle = (label: string, field: "sale_price" | "purchase_price") => (
    <div className="flex items-center justify-between gap-2">
      <span>{label}</span>
      {rows.length > 1 && (
        <Button type="link" size="small" className="!px-0" onClick={() => copyToAll(field)}>
          Copy to all
        </Button>
      )}
    </div>
  );

  const columns: ColumnsType<Row> = [
    {
      title: "Variant",
      key: "variant",
      render: (_, row) => (
        <div className="flex flex-wrap gap-1">
          {Object.values(row.options).map((v, i) => (
            <Tag key={i}>{v}</Tag>
          ))}
        </div>
      ),
    },
    {
      title: "SKU",
      key: "sku",
      render: (_, row) => {
        const sig = variantSig(row.options);
        return (
          <Input
            value={overrides[sig]?.sku ?? ""}
            onChange={(e) => setField(sig, { sku: e.target.value })}
            placeholder="SKU"
          />
        );
      },
    },
    {
      title: priceTitle("Sale price", "sale_price"),
      key: "sale",
      render: (_, row) => {
        const sig = variantSig(row.options);
        return (
          <InputNumber
            className="!w-full"
            min={0}
            addonBefore={currency}
            value={overrides[sig]?.sale_price ?? undefined}
            onChange={(v) => setField(sig, { sale_price: v })}
          />
        );
      },
    },
    {
      title: priceTitle("Purchase price", "purchase_price"),
      key: "purchase",
      render: (_, row) => {
        const sig = variantSig(row.options);
        return (
          <InputNumber
            className="!w-full"
            min={0}
            addonBefore={currency}
            value={overrides[sig]?.purchase_price ?? undefined}
            onChange={(v) => setField(sig, { purchase_price: v })}
          />
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {attributes.map((attr, i) => (
          <div key={i} className="flex items-center gap-3">
            <Input
              value={attr.name}
              onChange={(e) => updateAttr(i, { name: e.target.value })}
              placeholder="Attribute (e.g. Color)"
              className="max-w-[200px]"
            />
            <Select
              mode="tags"
              value={attr.options}
              onChange={(options) => updateAttr(i, { options })}
              placeholder="Type an option and press enter"
              className="flex-1"
              open={false}
              suffixIcon={null}
            />
            <Button
              type="text"
              danger
              icon={<Trash2 size={16} />}
              onClick={() => setAttributes((prev) => prev.filter((_, idx) => idx !== i))}
            />
          </div>
        ))}
        {attributes.length < 3 && (
          <Button
            icon={<Plus size={16} />}
            onClick={() => setAttributes((prev) => [...prev, { name: "", options: [] }])}
          >
            Add attribute
          </Button>
        )}
      </div>

      {rows.length > 0 && (
        <div>
          <Typography.Text type="secondary" className="text-xs">
            {rows.length} variant{rows.length > 1 ? "s" : ""} generated
          </Typography.Text>
          <Table<Row>
            size="small"
            rowKey={(r) => variantSig(r.options)}
            columns={columns}
            dataSource={rows}
            pagination={false}
            className="mt-2"
          />
        </div>
      )}
    </div>
  );
}
