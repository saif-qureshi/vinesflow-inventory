"use client";

import { Typography } from "antd";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <Typography.Title level={3} className="!mb-0">
          {title}
        </Typography.Title>
        {description && (
          <Typography.Text type="secondary" className="mt-1 block">
            {description}
          </Typography.Text>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
