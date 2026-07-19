"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { InputNumber, Radio, Segmented, Switch } from "antd";
import { X } from "lucide-react";

import { App, Button, Card, Form, Input, Select, TextArea, Typography } from "@/components/ui";
import { Uploader } from "@/components/ui/Uploader";
import { useCategories } from "@/hooks/useCategories";
import { useUoms } from "@/hooks/useUoms";
import { useCreateProduct, useUpdateProduct } from "@/hooks/useProducts";
import { useCurrency } from "@/hooks/useCurrency";
import { apiErrorMessage } from "@/lib/api";
import type { Product, ProductInput, VariantAttribute } from "@/types";
import { VariantsBuilder } from "./VariantsBuilder";
import { cartesian, variantSig, type VariantOverride } from "./variants";

interface FormValues {
  name: string;
  nature: "good" | "service";
  type: "single" | "variable";
  category_id?: number | null;
  uom_id?: number | null;
  sku?: string;
  barcode?: string;
  description?: string;
  sale_price?: number | null;
  purchase_price?: number | null;
  track_inventory: boolean;
  reorder_point?: number | null;
}

export function ItemForm({ product }: { product?: Product }) {
  const router = useRouter();
  const { message } = App.useApp();
  const { currency } = useCurrency();
  const categories = useCategories();
  const uoms = useUoms();
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const [form] = Form.useForm<FormValues>();

  const [media, setMedia] = useState<string[]>(() => product?.media.map((m) => m.url) ?? []);
  const [attributes, setAttributes] = useState<VariantAttribute[]>(
    () => product?.variant_attributes ?? [],
  );
  const [overrides, setOverrides] = useState<Record<string, VariantOverride>>(() => {
    const ov: Record<string, VariantOverride> = {};
    for (const v of product?.variants ?? []) {
      const options = Object.fromEntries(v.values.map((val) => [val.attribute_name, val.value]));
      ov[variantSig(options)] = {
        sku: v.sku ?? undefined,
        sale_price: v.sale_price,
        purchase_price: v.purchase_price,
      };
    }
    return ov;
  });

  const isEdit = !!product;
  const isVariable = Form.useWatch("type", form) === "variable";
  const saving = create.isPending || update.isPending;
  const backHref = isEdit ? `/items/${product.id}` : "/items";

  useEffect(() => {
    if (!product) return;
    form.setFieldsValue({
      name: product.name,
      nature: product.nature,
      type: product.type,
      category_id: product.category?.id,
      uom_id: product.uom?.id,
      sku: product.sku ?? undefined,
      barcode: product.barcode ?? undefined,
      description: product.description ?? undefined,
      sale_price: product.sale_price ?? undefined,
      purchase_price: product.purchase_price ?? undefined,
      track_inventory: product.track_inventory,
      reorder_point: product.reorder_point ?? undefined,
    });
  }, [product, form]);

  const submit = async (values: FormValues) => {
    const variable = values.type === "variable";
    const cleanAttrs = attributes.filter((a) => a.name.trim() && a.options.length);
    const payload: ProductInput = {
      ...values,
      media: media.map((url, i) => ({ url, sort_order: i })),
      variant_attributes: variable ? cleanAttrs : [],
      variants: variable
        ? cartesian(cleanAttrs).map((options) => {
            const o = overrides[variantSig(options)] ?? {};
            return {
              options,
              sku: o.sku || undefined,
              sale_price: o.sale_price ?? undefined,
              purchase_price: o.purchase_price ?? undefined,
            };
          })
        : [],
    };
    try {
      if (isEdit) await update.mutateAsync({ id: product.id, payload });
      else await create.mutateAsync(payload);
      message.success(isEdit ? "Item updated" : "Item created");
      router.push(backHref);
    } catch (err) {
      message.error(apiErrorMessage(err));
    }
  };

  const categoryOptions = (categories.data ?? []).map((c) => ({ value: c.id, label: c.name }));
  const uomOptions = (uoms.data ?? []).map((u) => ({ value: u.id, label: `${u.name} (${u.symbol})` }));

  return (
    <Form<FormValues>
      form={form}
      layout="vertical"
      onFinish={submit}
      initialValues={{ nature: "good", type: "single", track_inventory: false }}
      className="space-y-8 pb-24"
    >
      <div className="flex items-center justify-between">
        <Typography.Title level={3} className="!mb-0">
          {isEdit ? "Edit Item" : "New Item"}
        </Typography.Title>
        <Button type="text" icon={<X size={18} />} onClick={() => router.push(backHref)} />
      </div>

      <Card className="border-gray-100">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-1 lg:col-span-2">
            <Form.Item name="name" label="Name" rules={[{ required: true, message: "Name is required" }]}>
              <Input placeholder="e.g. iPhone 16" />
            </Form.Item>
            <Form.Item name="nature" label="Type">
              <Radio.Group
                options={[
                  { label: "Goods", value: "good" },
                  { label: "Service", value: "service" },
                ]}
              />
            </Form.Item>
            <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
              <Form.Item name="category_id" label="Category">
                <Select options={categoryOptions} placeholder="Select category" allowClear showSearch optionFilterProp="label" loading={categories.isLoading} />
              </Form.Item>
              <Form.Item name="uom_id" label="Unit">
                <Select options={uomOptions} placeholder="Select unit" allowClear showSearch optionFilterProp="label" loading={uoms.isLoading} />
              </Form.Item>
              <Form.Item name="sku" label="SKU">
                <Input placeholder="Stock keeping unit" />
              </Form.Item>
              <Form.Item name="barcode" label="Barcode">
                <Input placeholder="UPC / EAN" />
              </Form.Item>
            </div>
          </div>
          <div>
            <div className="mb-2 text-sm font-medium">Images</div>
            <Uploader value={media} onChange={setMedia} accept="image/*" maxCount={15} maxSizeMB={5} />
          </div>
        </div>
      </Card>

      <Card title="Item Details" className="border-gray-100">
        <Form.Item name="type" label="Item Type">
          <Segmented
            options={[
              { label: "Single Item", value: "single" },
              { label: "Contains Variants", value: "variable" },
            ]}
          />
        </Form.Item>

        {isVariable ? (
          <VariantsBuilder
            attributes={attributes}
            setAttributes={setAttributes}
            overrides={overrides}
            setOverrides={setOverrides}
            currency={currency}
          />
        ) : (
          <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
            <Form.Item name="sale_price" label="Sale Price">
              <InputNumber className="!w-full" min={0} addonBefore={currency} placeholder="0.00" />
            </Form.Item>
            <Form.Item name="purchase_price" label="Purchase Price">
              <InputNumber className="!w-full" min={0} addonBefore={currency} placeholder="0.00" />
            </Form.Item>
          </div>
        )}
      </Card>

      <Card title="Inventory" className="border-gray-100">
        <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
          <Form.Item name="track_inventory" label="Track inventory" valuePropName="checked" extra="Cannot be changed once transactions exist.">
            <Switch />
          </Form.Item>
          <Form.Item name="reorder_point" label="Reorder point">
            <InputNumber className="!w-full" min={0} placeholder="e.g. 10" />
          </Form.Item>
        </div>
      </Card>

      <Card title="Description" className="border-gray-100">
        <Form.Item name="description" noStyle>
          <TextArea rows={3} placeholder="Describe this item" />
        </Form.Item>
      </Card>

      <div className="sticky bottom-0 -mx-6 flex gap-3 border-t border-gray-100 bg-slate-50 px-6 py-3">
        <Button type="primary" htmlType="submit" loading={saving}>
          {isEdit ? "Save" : "Create Item"}
        </Button>
        <Button onClick={() => router.push(backHref)}>Cancel</Button>
      </div>
    </Form>
  );
}
