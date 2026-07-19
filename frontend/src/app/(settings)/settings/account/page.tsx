"use client";

import { useEffect } from "react";

import { App, Avatar, Button, Form, Input, Password, PageHeader, Typography } from "@/components/ui";
import { useSession } from "@/hooks/useSession";
import { useUpdateProfile } from "@/hooks/useOrg";
import { apiErrorMessage } from "@/lib/api";
import { brand } from "@/theme/tokens";

export default function AccountPage() {
  const { user } = useSession();
  const { message } = App.useApp();
  const updateProfile = useUpdateProfile();
  const [form] = Form.useForm();
  const avatarUrl = Form.useWatch("avatar_url", form);

  useEffect(() => {
    form.setFieldsValue({ full_name: user?.full_name, avatar_url: user?.avatar_url });
  }, [user, form]);

  const save = async (values: { full_name?: string; password?: string; avatar_url?: string }) => {
    try {
      await updateProfile.mutateAsync({
        full_name: values.full_name,
        avatar_url: values.avatar_url ?? "",
        ...(values.password ? { password: values.password } : {}),
      });
      message.success("Profile updated");
      form.setFieldValue("password", undefined);
    } catch (err) {
      message.error(apiErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" description="Your personal account details" />

      <Form form={form} layout="vertical" onFinish={save} className="max-w-lg">
        <Form.Item label="Avatar">
          <div className="flex items-center gap-4">
            <Avatar size={64} src={avatarUrl || undefined} style={{ backgroundColor: brand.primary }}>
              {(user?.full_name ?? user?.email ?? "?").charAt(0).toUpperCase()}
            </Avatar>
            <Form.Item name="avatar_url" noStyle>
              <Input placeholder="https://…/avatar.png" />
            </Form.Item>
          </div>
        </Form.Item>
        <Form.Item label="Email">
          <Input value={user?.email} disabled />
        </Form.Item>
        <Form.Item name="full_name" label="Full name">
          <Input />
        </Form.Item>
        <Form.Item
          name="password"
          label="New password"
          rules={[{ min: 8, message: "At least 8 characters" }]}
        >
          <Password placeholder="Leave blank to keep current" autoComplete="new-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={updateProfile.isPending}>
          Save
        </Button>
      </Form>
    </div>
  );
}
