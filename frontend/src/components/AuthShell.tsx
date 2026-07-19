"use client";

import Image from "next/image";
import { Typography } from "antd";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Image
            src="/logo.svg"
            alt="Vineflow"
            width={48}
            height={48}
            priority
            className="mx-auto mb-3"
          />
          <Typography.Title level={3} className="!mb-1">
            {title}
          </Typography.Title>
          <Typography.Text type="secondary">{subtitle}</Typography.Text>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-xl shadow-slate-200/60">
          {children}
        </div>
      </div>
    </div>
  );
}
