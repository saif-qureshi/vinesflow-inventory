"use client";

import { useEffect } from "react";
import { InputNumber, Select } from "antd";

import { App, Form, Modal, TextArea } from "@/components/ui";
import { useAdjustStock, useOnHand } from "@/hooks/useInventory";
import { useProduct } from "@/hooks/useProducts";
import { useReasons } from "@/hooks/useReasons";
import { apiErrorMessage } from "@/lib/api";
import type { InventoryItem, Warehouse } from "@/types";

interface FormValues {
  location_id: number;
  variant_id?: number;
  qty_delta: number;
  reason?: string;
  note?: string;
}

const num = (v: string | number | null | undefined) => {
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
};

export function AdjustStockModal({
  item,
  warehouses,
  onClose,
}: {
  item: InventoryItem | null;
  warehouses: Warehouse[];
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const adjust = useAdjustStock();
  const reasons = useReasons();
  const open = !!item;
  const isVariable = item?.type === "variable";
  const { data: product } = useProduct(open && isVariable ? item.id : null);

  const locationId = Form.useWatch("location_id", form);
  const variantId = Form.useWatch("variant_id", form);
  const qtyDelta = Form.useWatch("qty_delta", form);
  const { data: available } = useOnHand(open ? item?.id ?? null : null, variantId, locationId);
  const availableQty = num(available);
  const newOnHand = availableQty + num(qtyDelta);
  const uom = item?.uom_symbol ?? "";

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldValue("location_id", warehouses.find((w) => w.is_default)?.id ?? warehouses[0]?.id);
  }, [open, form, warehouses]);

  const submit = async (values: FormValues) => {
    if (!item) return;
    try {
      await adjust.mutateAsync({
        product_id: item.id,
        variant_id: values.variant_id ?? null,
        location_id: values.location_id,
        qty_delta: values.qty_delta,
        reason: values.reason || null,
        note: values.note || null,
      });
      message.success("Stock adjusted");
      onClose();
    } catch (err) {
      message.error(apiErrorMessage(err));
    }
  };

  return (
    <Modal
      title={`Adjust stock — ${item?.name ?? ""}`}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Adjust"
      confirmLoading={adjust.isPending}
      destroyOnHidden
      width={560}
    >
      <Form<FormValues> form={form} layout="vertical" onFinish={submit} className="pt-2">
        <Form.Item name="location_id" label="Warehouse" rules={[{ required: true, message: "Select a warehouse" }]}>
          <Select options={warehouses.map((w) => ({ value: w.id, label: w.name }))} />
        </Form.Item>

        {isVariable && (
          <Form.Item name="variant_id" label="Variant" rules={[{ required: true, message: "Select a variant" }]}>
            <Select
              placeholder="Select variant"
              options={(product?.variants ?? []).map((v) => ({ value: v.id, label: v.name }))}
            />
          </Form.Item>
        )}

        <div className="mb-4 grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-3">
          <div>
            <div className="text-xs text-gray-400">Quantity available</div>
            <div className="text-lg font-semibold tabular-nums">
              {availableQty} {uom}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400">New quantity on hand</div>
            <div className="text-lg font-semibold tabular-nums">
              {newOnHand} {uom}
            </div>
          </div>
        </div>

        <Form.Item
          name="qty_delta"
          label="Quantity adjusted"
          rules={[{ required: true, message: "Enter a quantity" }]}
          extra="Use a negative number to remove stock (e.g. +10 or -5)."
        >
          <InputNumber className="!w-full" placeholder="e.g. +10 or -5" />
        </Form.Item>

        <Form.Item name="reason" label="Reason">
          <Select
            allowClear
            placeholder="Select a reason"
            loading={reasons.isLoading}
            options={(reasons.data ?? []).map((r) => ({ value: r.name, label: r.name }))}
          />
        </Form.Item>

        <Form.Item name="note" label="Description">
          <TextArea rows={3} maxLength={500} placeholder="Notes (optional)" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
