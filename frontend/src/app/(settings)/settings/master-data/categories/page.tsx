"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { ColumnsType } from "antd/es/table";

import { App, Button, DataTable, Form, FormModal, Input, PageHeader, Popconfirm, Select } from "@/components/ui";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from "@/hooks/useCategories";
import { apiErrorMessage } from "@/lib/api";
import type { Category } from "@/types";

export default function CategoriesSettingsPage() {
  const { message } = App.useApp();
  const categories = useCategories();
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const del = useDeleteCategory();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form] = Form.useForm();

  const nameFor = (id: number) => categories.data?.find((c) => c.id === id)?.name ?? "—";

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };
  const openEdit = (c: Category) => {
    setEditing(c);
    form.setFieldsValue({ name: c.name, parent_id: c.parent_id });
    setOpen(true);
  };

  const submit = async (values: { name: string; parent_id?: number | null }) => {
    try {
      if (editing) await update.mutateAsync({ id: editing.id, payload: values });
      else await create.mutateAsync(values);
      message.success(editing ? "Category updated" : "Category created");
      setOpen(false);
    } catch (err) {
      message.error(apiErrorMessage(err));
    }
  };

  const remove = async (id: number) => {
    try {
      await del.mutateAsync(id);
      message.success("Category deleted");
    } catch (err) {
      message.error(apiErrorMessage(err));
    }
  };

  const columns: ColumnsType<Category> = [
    { title: "Name", dataIndex: "name", key: "name", render: (v) => <span className="font-medium">{v}</span> },
    {
      title: "Parent",
      key: "parent",
      render: (_, c) =>
        c.parent_id ? nameFor(c.parent_id) : <span className="text-gray-400">—</span>,
    },
    {
      title: "Actions",
      key: "actions",
      align: "right",
      render: (_, c) => (
        <div className="flex justify-end gap-1">
          <Button size="small" type="text" onClick={() => openEdit(c)}>
            Edit
          </Button>
          <Popconfirm title="Delete this category?" onConfirm={() => remove(c.id)}>
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
        title="Categories"
        description="Organise your items into categories"
        actions={
          <Button type="primary" icon={<Plus size={16} />} onClick={openCreate}>
            New category
          </Button>
        }
      />
      <DataTable<Category>
        columns={columns}
        dataSource={categories.data ?? []}
        loading={categories.isLoading}
      />
      <FormModal
        title={editing ? "Edit category" : "New category"}
        open={open}
        form={form}
        onCancel={() => setOpen(false)}
        onSubmit={submit}
        confirmLoading={create.isPending || update.isPending}
      >
        <Form.Item name="name" label="Name" rules={[{ required: true }]}>
          <Input placeholder="e.g. Electronics" />
        </Form.Item>
        <Form.Item name="parent_id" label="Parent category">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="None"
            options={(categories.data ?? [])
              .filter((c) => c.id !== editing?.id)
              .map((c) => ({ value: c.id, label: c.name }))}
          />
        </Form.Item>
      </FormModal>
    </div>
  );
}
