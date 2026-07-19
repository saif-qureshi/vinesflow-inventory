"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { ColumnsType } from "antd/es/table";

import {
  App,
  Button,
  Checkbox,
  DataTable,
  Form,
  Input,
  Modal,
  PageHeader,
  Popconfirm,
  Tag,
  Typography,
} from "@/components/ui";
import { useCan } from "@/hooks/useSession";
import {
  useCreateRole,
  useDeleteRole,
  usePermissionCatalog,
  useRoles,
  useUpdateRole,
} from "@/hooks/useRoles";
import { apiErrorMessage } from "@/lib/api";
import type { Permission, Role } from "@/types";

const MODULE_LABELS: Record<string, string> = {
  orgs: "Organization",
  users: "Users",
  roles: "Roles & Permissions",
  invoices: "Invoices",
  customers: "Customers",
  products: "Products",
  payments: "Payments",
  reports: "Reports",
};

function groupByModule(perms: Permission[]): Record<string, Permission[]> {
  return perms.reduce<Record<string, Permission[]>>((acc, p) => {
    (acc[p.module] ??= []).push(p);
    return acc;
  }, {});
}

export default function RolesPage() {
  const can = useCan();
  const { message } = App.useApp();
  const roles = useRoles();
  const catalog = usePermissionCatalog();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [form] = Form.useForm();

  const canCreate = can("roles:create");
  const canUpdate = can("roles:update");
  const canDelete = can("roles:delete");

  const grouped = useMemo(() => groupByModule(catalog.data ?? []), [catalog.data]);
  const readOnly = editing?.is_system ?? false;
  const saving = createRole.isPending || updateRole.isPending;

  const openCreate = () => {
    setEditing(null);
    setSelected(new Set());
    form.resetFields();
    setModalOpen(true);
  };

  const openRole = (role: Role) => {
    setEditing(role);
    setSelected(new Set(role.permissions.map((p) => p.code)));
    form.setFieldsValue({ name: role.name, description: role.description });
    setModalOpen(true);
  };

  const toggle = (code: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(code);
      else next.delete(code);
      return next;
    });

  const toggleModule = (module: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const p of grouped[module]) {
        if (on) next.add(p.code);
        else next.delete(p.code);
      }
      return next;
    });

  const submit = async (values: { name: string; description?: string }) => {
    const payload = { ...values, permissions: Array.from(selected) };
    try {
      if (editing) await updateRole.mutateAsync({ id: editing.id, payload });
      else await createRole.mutateAsync(payload);
      message.success(editing ? "Role updated" : "Role created");
      setModalOpen(false);
    } catch (err) {
      message.error(apiErrorMessage(err));
    }
  };

  const remove = async (role: Role) => {
    try {
      await deleteRole.mutateAsync(role.id);
      message.success("Role deleted");
    } catch (err) {
      message.error(apiErrorMessage(err));
    }
  };

  const columns: ColumnsType<Role> = [
    {
      title: "Role",
      key: "name",
      render: (_, r) => (
        <div>
          <div className="font-medium">{r.name}</div>
          <Typography.Text type="secondary" className="text-xs">
            {r.description}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: "Type",
      key: "type",
      render: (_, r) =>
        r.is_system ? <Tag color="geekblue">System</Tag> : <Tag color="green">Custom</Tag>,
    },
    { title: "Permissions", key: "perms", render: (_, r) => `${r.permissions.length}` },
    {
      title: "Actions",
      key: "actions",
      align: "right",
      render: (_, r) => (
        <div className="flex justify-end gap-1">
          <Button size="small" type="text" onClick={() => openRole(r)}>
            {r.is_system || !canUpdate ? "View" : "Edit"}
          </Button>
          {!r.is_system && canDelete && (
            <Popconfirm title="Delete this role?" onConfirm={() => remove(r)}>
              <Button size="small" type="text" danger>
                Delete
              </Button>
            </Popconfirm>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Roles"
        description="Define what each role can do across modules"
        actions={
          canCreate && (
            <Button type="primary" icon={<Plus size={16} />} onClick={openCreate}>
              New role
            </Button>
          )
        }
      />

      <DataTable<Role> loading={roles.isLoading} columns={columns} dataSource={roles.data ?? []} />

      <Modal
        title={editing ? (readOnly ? editing.name : `Edit ${editing.name}`) : "New role"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={readOnly ? () => setModalOpen(false) : () => form.submit()}
        okText={readOnly ? "Close" : "Save"}
        confirmLoading={saving}
        cancelButtonProps={{ style: readOnly ? { display: "none" } : undefined }}
        width={640}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={submit} disabled={readOnly} className="!mt-4">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Billing Manager" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input placeholder="What can this role do?" />
          </Form.Item>
        </Form>

        <div className="mb-3 mt-4 border-t border-gray-100 pt-3 text-sm font-semibold text-gray-700">
          Permissions
        </div>
        <div className="max-h-80 space-y-4 overflow-y-auto pr-2">
          {Object.entries(grouped).map(([module, perms]) => {
            const allOn = perms.every((p) => selected.has(p.code));
            const someOn = perms.some((p) => selected.has(p.code));
            return (
              <div key={module}>
                <Checkbox
                  checked={allOn}
                  indeterminate={someOn && !allOn}
                  disabled={readOnly}
                  onChange={(e) => toggleModule(module, e.target.checked)}
                  className="!font-medium"
                >
                  {MODULE_LABELS[module] ?? module}
                </Checkbox>
                <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1 pl-6">
                  {perms.map((p) => (
                    <Checkbox
                      key={p.code}
                      checked={selected.has(p.code)}
                      disabled={readOnly}
                      onChange={(e) => toggle(p.code, e.target.checked)}
                    >
                      <span className="capitalize">{p.action}</span>
                    </Checkbox>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}
