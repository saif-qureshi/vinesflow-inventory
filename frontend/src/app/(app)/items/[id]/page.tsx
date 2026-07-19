"use client";

import type { ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { Descriptions, Image, Spin } from "antd";
import { Pencil, Trash2, X } from "lucide-react";

import { App, Button, Card, Popconfirm, Table, Tag, Typography } from "@/components/ui";
import { ItemSalesChart } from "../ItemSalesChart";
import { useCan } from "@/hooks/useSession";
import { useCurrency } from "@/hooks/useCurrency";
import { useDeleteProduct, useProduct } from "@/hooks/useProducts";
import { apiErrorMessage } from "@/lib/api";
import type { ProductVariant } from "@/types";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-xs text-gray-400">{label}</div>
      <div className="mt-0.5 text-sm">{children}</div>
    </div>
  );
}

export default function ViewItemPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { message } = App.useApp();
  const { money } = useCurrency();
  const can = useCan();
  const del = useDeleteProduct();
  const { data: p, isLoading } = useProduct(Number(id));

  if (isLoading || !p) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  const remove = async () => {
    try {
      await del.mutateAsync(p.id);
      message.success("Item deleted");
      router.push("/items");
    } catch (err) {
      message.error(apiErrorMessage(err));
    }
  };

  const dash = <span className="text-gray-400">—</span>;

  const variantColumns = [
    {
      title: "Variant",
      key: "variant",
      render: (_: unknown, v: ProductVariant) => (
        <div className="flex flex-wrap gap-1">
          {v.values.map((val) => (
            <Tag key={val.id}>{val.value}</Tag>
          ))}
        </div>
      ),
    },
    { title: "SKU", key: "sku", render: (_: unknown, v: ProductVariant) => v.sku || dash },
    {
      title: "Sale price",
      key: "sale",
      align: "right" as const,
      render: (_: unknown, v: ProductVariant) => (v.sale_price != null ? money(v.sale_price) : dash),
    },
    {
      title: "Purchase price",
      key: "purchase",
      align: "right" as const,
      render: (_: unknown, v: ProductVariant) =>
        v.purchase_price != null ? money(v.purchase_price) : dash,
    },
  ];

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-start justify-between">
        <div>
          <Typography.Title level={3} className="!mb-1">
            {p.name}
          </Typography.Title>
          <div className="flex flex-wrap gap-1">
            <Tag color={p.nature === "service" ? "purple" : "blue"} className="capitalize">
              {p.nature}
            </Tag>
            <Tag className="capitalize">{p.type === "variable" ? "Has variants" : "Single item"}</Tag>
            {p.is_active ? <Tag color="green">Active</Tag> : <Tag>Inactive</Tag>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {can("products:update") && (
            <Button icon={<Pencil size={16} />} onClick={() => router.push(`/items/${p.id}/edit`)}>
              Edit
            </Button>
          )}
          {can("products:delete") && (
            <Popconfirm
              title="Delete this item?"
              description="This action cannot be undone."
              okText="Delete"
              okButtonProps={{ danger: true, loading: del.isPending }}
              onConfirm={remove}
            >
              <Button danger icon={<Trash2 size={16} />}>
                Delete
              </Button>
            </Popconfirm>
          )}
          <Button type="text" icon={<X size={18} />} onClick={() => router.push("/items")} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Primary Details" className="border-gray-100">
            <Descriptions column={{ xs: 1, md: 2 }} colon={false} size="small">
              <Descriptions.Item label="Category">
                {p.category ? <Tag>{p.category.name}</Tag> : dash}
              </Descriptions.Item>
              <Descriptions.Item label="Unit">
                {p.uom ? `${p.uom.name} (${p.uom.symbol})` : dash}
              </Descriptions.Item>
              <Descriptions.Item label="SKU">{p.sku || dash}</Descriptions.Item>
              <Descriptions.Item label="Barcode">{p.barcode || dash}</Descriptions.Item>
            </Descriptions>
            {p.description && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <Field label="Description">
                  <span className="whitespace-pre-wrap text-gray-600">{p.description}</span>
                </Field>
              </div>
            )}
          </Card>

          {p.type === "variable" ? (
            <Card title="Variants" className="border-gray-100">
              <Table<ProductVariant>
                size="small"
                rowKey="id"
                columns={variantColumns}
                dataSource={p.variants}
                pagination={false}
              />
            </Card>
          ) : (
            <Card title="Pricing" className="border-gray-100">
              <div className="grid grid-cols-2 gap-6">
                <Field label="Sale price">
                  <span className="text-lg font-semibold tabular-nums">
                    {p.sale_price != null ? money(p.sale_price) : dash}
                  </span>
                </Field>
                <Field label="Purchase price">
                  <span className="text-lg font-semibold tabular-nums">
                    {p.purchase_price != null ? money(p.purchase_price) : dash}
                  </span>
                </Field>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card title="Images" className="border-gray-100">
            {p.media.length ? (
              <Image.PreviewGroup>
                <div className="grid grid-cols-3 gap-2">
                  {p.media.map((m) => (
                    <Image
                      key={m.id}
                      src={m.url}
                      alt={p.name}
                      className="!h-20 !w-full rounded-lg object-cover"
                    />
                  ))}
                </div>
              </Image.PreviewGroup>
            ) : (
              <div className="py-6 text-center text-sm text-gray-400">No images</div>
            )}
          </Card>

          <Card title="Inventory" className="border-gray-100">
            <Descriptions column={1} colon={false} size="small">
              <Descriptions.Item label="Track inventory">
                {p.track_inventory ? <Tag color="green">Enabled</Tag> : <Tag>Disabled</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="Reorder point">
                {p.reorder_point != null ? p.reorder_point : dash}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </div>
      </div>

      <Card title="Sales Summary" className="border-gray-100">
        <ItemSalesChart />
      </Card>
    </div>
  );
}
