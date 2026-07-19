"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Lock, Mail, User } from "lucide-react";

import { App, Button, Form, Input, Password, Typography } from "@/components/ui";
import { useRegister, useSession } from "@/hooks/useSession";
import { apiErrorMessage } from "@/lib/api";
import { AuthShell } from "@/components/AuthShell";

export default function RegisterPage() {
  const { isAuthenticated } = useSession();
  const register = useRegister();
  const { message } = App.useApp();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) router.replace("/dashboard");
  }, [isAuthenticated, router]);

  const onFinish = async (values: {
    email: string;
    password: string;
    full_name?: string;
    org_name: string;
  }) => {
    try {
      await register.mutateAsync(values);
      router.replace("/dashboard");
    } catch (err) {
      message.error(apiErrorMessage(err, "Registration failed"));
    }
  };

  return (
    <AuthShell title="Create your workspace" subtitle="Start invoicing in minutes">
      <Form layout="vertical" onFinish={onFinish} requiredMark={false} size="large">
        <Form.Item name="full_name" label="Full name">
          <Input prefix={<User size={16} />} placeholder="Jane Doe" autoComplete="name" />
        </Form.Item>
        <Form.Item
          name="email"
          label="Email"
          rules={[{ required: true, type: "email", message: "Enter a valid email" }]}
        >
          <Input prefix={<Mail size={16} />} placeholder="you@company.com" autoComplete="email" />
        </Form.Item>
        <Form.Item
          name="org_name"
          label="Organization name"
          rules={[{ required: true, message: "Name your organization" }]}
        >
          <Input prefix={<Building2 size={16} />} placeholder="Acme Inc." />
        </Form.Item>
        <Form.Item
          name="password"
          label="Password"
          rules={[{ required: true, min: 8, message: "At least 8 characters" }]}
        >
          <Password prefix={<Lock size={16} />} placeholder="••••••••" autoComplete="new-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block loading={register.isPending}>
          Create workspace
        </Button>
      </Form>
      <Typography.Paragraph className="!mt-6 text-center !text-gray-500">
        Already have an account? <Link href="/login">Sign in</Link>
      </Typography.Paragraph>
    </AuthShell>
  );
}
