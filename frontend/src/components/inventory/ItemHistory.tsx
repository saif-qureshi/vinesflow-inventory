"use client";

import { Avatar, Empty, Spin } from "antd";

import { useEntityActivities } from "@/hooks/useActivities";
import { formatDate, timeAgo } from "@/lib/format";
import type { Activity } from "@/types";

function actorName(a: Activity) {
  return a.actor?.full_name || a.actor?.email || "System";
}

export function ItemHistory({ productId }: { productId: number }) {
  const { data, isLoading } = useEntityActivities("product", productId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spin />
      </div>
    );
  }

  const items = data ?? [];
  if (!items.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No history yet" className="py-10" />;
  }

  return (
    <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white px-4">
      {items.map((a) => (
        <div key={a.id} className="flex gap-3 py-3">
          <Avatar size={30} src={a.actor?.avatar_url ?? undefined} className="shrink-0">
            {actorName(a).charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <div className="text-sm">
              <span className="font-medium">{actorName(a)}</span>{" "}
              <span className="text-gray-500">
                {a.action} {a.entity_type}
              </span>
            </div>
            <div className="text-xs text-gray-400">
              {formatDate(a.created_at)} · {timeAgo(a.created_at)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
