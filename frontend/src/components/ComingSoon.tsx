"use client";

import { Empty, Tag, Typography } from "antd";

import { PageHeader } from "@/components/ui";

export function ComingSoon({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <div className="flex min-h-[50vh] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white">
        <Empty
          description={
            <div className="space-y-2">
              <Tag color="purple">Coming soon</Tag>
              <Typography.Paragraph type="secondary" className="!mb-0 max-w-sm">
                This module is part of a later phase. The navigation and permission model are ready
                for it.
              </Typography.Paragraph>
            </div>
          }
        />
      </div>
    </div>
  );
}
