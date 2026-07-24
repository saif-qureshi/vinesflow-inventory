"use client";

import { useEffect, useState } from "react";

import { App, Input, PageHeader, Select, Table, Tag, Typography } from "@/components/ui";
import { SettingsFooter } from "@/components/settings/SettingRow";
import { useCan } from "@/hooks/useSession";
import {
  NumberingEntry,
  NumberingRestart,
  useNumbering,
  useUpdateNumbering,
} from "@/hooks/useNumbering";
import { apiErrorMessage } from "@/lib/api";

const RESTART_OPTIONS = [
  { value: "none", label: "None" },
  { value: "yearly", label: "Yearly" },
];

const preview = (row: NumberingEntry) => {
  const body = row.restart === "yearly" ? `${row.prefix}${new Date().getFullYear()}-` : row.prefix;
  return `${body}${row.start}`;
};

export default function TransactionNumbersPage() {
  const can = useCan();
  const { message } = App.useApp();
  const { data } = useNumbering();
  const update = useUpdateNumbering();

  const canEdit = can("orgs:update");
  const [rows, setRows] = useState<NumberingEntry[]>([]);

  useEffect(() => {
    if (data) setRows(data);
  }, [data]);

  const patch = (key: string, field: "prefix" | "start" | "restart", value: string) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));

  const save = async () => {
    if (rows.some((r) => !r.prefix.trim())) {
      message.error("Every module needs a prefix");
      return;
    }
    if (rows.some((r) => !/^\d{1,10}$/.test(r.start))) {
      message.error("Starting number must be digits only");
      return;
    }
    try {
      await update.mutateAsync(
        rows.map((r) => ({ key: r.key, prefix: r.prefix.trim(), start: r.start, restart: r.restart })),
      );
      message.success("Numbering saved");
    } catch (err) {
      message.error(apiErrorMessage(err));
    }
  };

  const columns = [
    { title: "Module", dataIndex: "label", width: 220 },
    {
      title: "Prefix",
      dataIndex: "prefix",
      render: (_: unknown, row: NumberingEntry) => (
        <Input
          value={row.prefix}
          onChange={(e) => patch(row.key, "prefix", e.target.value)}
          disabled={!canEdit}
          maxLength={12}
          className="!w-full"
        />
      ),
    },
    {
      title: "Starting Number",
      dataIndex: "start",
      width: 200,
      render: (_: unknown, row: NumberingEntry) => (
        <Input
          value={row.start}
          onChange={(e) => patch(row.key, "start", e.target.value.replace(/\D/g, "").slice(0, 10))}
          disabled={!canEdit}
          className="!w-full font-mono"
        />
      ),
    },
    {
      title: "Restart Numbering",
      dataIndex: "restart",
      width: 200,
      render: (_: unknown, row: NumberingEntry) => (
        <Select
          value={row.restart}
          onChange={(v: NumberingRestart) => patch(row.key, "restart", v)}
          options={RESTART_OPTIONS}
          disabled={!canEdit}
          className="!w-full"
        />
      ),
    },
    {
      title: "Preview",
      dataIndex: "preview",
      width: 220,
      render: (_: unknown, row: NumberingEntry) => (
        <Tag color="default" className="!m-0 font-mono">
          {preview(row)}
        </Tag>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Transaction Number Series"
        description="Set the prefix and starting number for each document type. The starting number's length sets the digit width. New numbers continue from the highest existing one."
      />

      <div className="mt-2 overflow-x-auto">
        <Table columns={columns} dataSource={rows} rowKey="key" pagination={false} size="middle" />
      </div>

      {canEdit ? (
        <SettingsFooter onSave={save} saving={update.isPending} />
      ) : (
        <Typography.Paragraph type="secondary" className="!mt-4 !mb-0">
          You don&apos;t have permission to edit numbering.
        </Typography.Paragraph>
      )}
    </div>
  );
}
