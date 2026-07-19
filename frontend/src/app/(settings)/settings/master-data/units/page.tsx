"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { ColumnsType } from "antd/es/table";

import { App, Button, DataTable, Form, FormModal, Input, PageHeader, Popconfirm } from "@/components/ui";
import { useCreateUom, useDeleteUom, useUoms, useUpdateUom } from "@/hooks/useUoms";
import { apiErrorMessage } from "@/lib/api";
import type { Uom } from "@/types";

export default function UnitsSettingsPage() {
  const { message } = App.useApp();
  const uoms = useUoms();
  const create = useCreateUom();
  const update = useUpdateUom();
  const del = useDeleteUom();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Uom | null>(null);
  const [form] = Form.useForm();

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };
  const openEdit = (u: Uom) => {
    setEditing(u);
    form.setFieldsValue({ name: u.name, symbol: u.symbol });
    setOpen(true);
  };

  const submit = async (values: { name: string; symbol: string }) => {
    try {
      if (editing) await update.mutateAsync({ id: editing.id, payload: values });
      else await create.mutateAsync(values);
      message.success(editing ? "Unit updated" : "Unit created");
      setOpen(false);
    } catch (err) {
      message.error(apiErrorMessage(err));
    }
  };

  const remove = async (id: number) => {
    try {
      await del.mutateAsync(id);
      message.success("Unit deleted");
    } catch (err) {
      message.error(apiErrorMessage(err));
    }
  };

  const columns: ColumnsType<Uom> = [
    { title: "Name", dataIndex: "name", key: "name", render: (v) => <span className="font-medium">{v}</span> },
    { title: "Symbol", dataIndex: "symbol", key: "symbol" },
    {
      title: "Actions",
      key: "actions",
      align: "right",
      render: (_, u) => (
        <div className="flex justify-end gap-1">
          <Button size="small" type="text" onClick={() => openEdit(u)}>
            Edit
          </Button>
          <Popconfirm title="Delete this unit?" onConfirm={() => remove(u.id)}>
            <Button size="small" type="text" danger>
              Delete
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Units of Measure"
        description="Units your items are sold or stocked in"
        actions={
          <Button type="primary" icon={<Plus size={16} />} onClick={openCreate}>
            New unit
          </Button>
        }
      />
      <DataTable<Uom> columns={columns} dataSource={uoms.data ?? []} loading={uoms.isLoading} />
      <FormModal
        title={editing ? "Edit unit" : "New unit"}
        open={open}
        form={form}
        onCancel={() => setOpen(false)}
        onSubmit={submit}
        confirmLoading={create.isPending || update.isPending}
      >
        <Form.Item name="name" label="Name" rules={[{ required: true }]}>
          <Input placeholder="e.g. Kilogram" />
        </Form.Item>
        <Form.Item name="symbol" label="Symbol" rules={[{ required: true }]}>
          <Input placeholder="e.g. kg" />
        </Form.Item>
      </FormModal>
    </div>
  );
}
