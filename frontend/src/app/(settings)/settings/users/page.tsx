"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { ColumnsType } from "antd/es/table";

import {
  App,
  Button,
  DataTable,
  Form,
  FormModal,
  Input,
  PageHeader,
  Popconfirm,
  Select,
  Tag,
  Typography,
} from "@/components/ui";
import { useCan } from "@/hooks/useSession";
import { useAddMember, useMembers, useRemoveMember, useUpdateMemberRole } from "@/hooks/useMembers";
import { useRoles } from "@/hooks/useRoles";
import { apiErrorMessage } from "@/lib/api";
import type { Member } from "@/types";

export default function UsersPage() {
  const can = useCan();
  const { message } = App.useApp();
  const members = useMembers();
  const roles = useRoles();
  const addMember = useAddMember();
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();

  const [addOpen, setAddOpen] = useState(false);
  const [form] = Form.useForm();

  const canCreate = can("users:create");
  const canUpdate = can("users:update");
  const canDelete = can("users:delete");
  const roleOptions = (roles.data ?? []).map((r) => ({ value: r.id, label: r.name }));

  const onAdd = async (values: { email: string; role_id: number }) => {
    try {
      await addMember.mutateAsync(values);
      message.success("Member added");
      setAddOpen(false);
      form.resetFields();
    } catch (err) {
      message.error(apiErrorMessage(err, "Could not add member"));
    }
  };

  const onChangeRole = async (membershipId: number, role_id: number) => {
    try {
      await updateRole.mutateAsync({ membershipId, role_id });
      message.success("Role updated");
    } catch (err) {
      message.error(apiErrorMessage(err));
    }
  };

  const onRemove = async (membershipId: number) => {
    try {
      await removeMember.mutateAsync(membershipId);
      message.success("Member removed");
    } catch (err) {
      message.error(apiErrorMessage(err));
    }
  };

  const columns: ColumnsType<Member> = [
    {
      title: "Name",
      key: "name",
      render: (_, m) => (
        <div>
          <div className="font-medium">{m.user.full_name ?? "—"}</div>
          <Typography.Text type="secondary" className="text-xs">
            {m.user.email}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: "Role",
      key: "role",
      render: (_, m) =>
        canUpdate && !m.is_owner ? (
          <Select
            value={m.role.id}
            className="min-w-40"
            onChange={(v) => onChangeRole(m.id, v)}
            options={roleOptions}
          />
        ) : (
          <Tag color={m.is_owner ? "gold" : "geekblue"}>{m.role.name}</Tag>
        ),
    },
    { title: "", key: "owner", render: (_, m) => (m.is_owner ? <Tag color="gold">Owner</Tag> : null) },
    {
      title: "Actions",
      key: "actions",
      align: "right",
      render: (_, m) =>
        canDelete && !m.is_owner ? (
          <Popconfirm title="Remove this member?" onConfirm={() => onRemove(m.id)}>
            <Button danger size="small" type="text">
              Remove
            </Button>
          </Popconfirm>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Users"
        description="People with access to this organization"
        actions={
          canCreate && (
            <Button type="primary" icon={<Plus size={16} />} onClick={() => setAddOpen(true)}>
              Add member
            </Button>
          )
        }
      />

      <DataTable<Member> loading={members.isLoading} columns={columns} dataSource={members.data ?? []} />

      <FormModal
        title="Add member"
        open={addOpen}
        form={form}
        onCancel={() => setAddOpen(false)}
        onSubmit={onAdd}
        okText="Add"
        confirmLoading={addMember.isPending}
      >
        <Form.Item
          name="email"
          label="User email"
          rules={[{ required: true, type: "email", message: "Enter a valid email" }]}
          extra="The person must already have a Vineflow account."
        >
          <Input placeholder="teammate@company.com" />
        </Form.Item>
        <Form.Item name="role_id" label="Role" rules={[{ required: true }]}>
          <Select placeholder="Select a role" options={roleOptions} />
        </Form.Item>
      </FormModal>
    </div>
  );
}
