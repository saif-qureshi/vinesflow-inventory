"use client";

import { Card } from "antd";

import { brand } from "@/theme/tokens";

export function StatCard({
  title,
  value,
  icon,
  muted,
}: {
  title: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <Card styles={{ body: { padding: 20 } }} className="border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">{title}</div>
          <div
            className="mt-1 text-2xl font-semibold"
            style={muted ? { color: brand.muted } : undefined}
          >
            {value}
          </div>
        </div>
        {icon && (
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${brand.primary}14`, color: brand.primary }}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
