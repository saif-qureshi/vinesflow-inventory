"use client";

import { Segmented, Table } from "antd";
import { ArrowDownRight, ArrowUpRight, Banknote, TriangleAlert, Users, Wallet } from "lucide-react";

import { useAppTheme, useSession } from "@/hooks/useSession";
import { useCurrency } from "@/hooks/useCurrency";
import { Card, Col, PageHeader, Row, Tag, Typography } from "@/components/ui";
import { AgingChart, RevenueChart, StatusChart } from "@/components/dashboard/charts";
import { formatDate } from "@/lib/format";

interface Invoice {
  key: string;
  number: string;
  customer: string;
  date: string;
  amount: number;
  status: "paid" | "pending" | "overdue";
}

const INVOICES: Invoice[] = [
  { key: "1", number: "SI-0042", customer: "Lahore Textiles Ltd", date: "2026-06-24", amount: 184500, status: "paid" },
  { key: "2", number: "SI-0041", customer: "Karachi Steel Co", date: "2026-06-22", amount: 92750, status: "pending" },
  { key: "3", number: "SI-0040", customer: "Islamabad Traders", date: "2026-06-19", amount: 41200, status: "overdue" },
  { key: "4", number: "SI-0039", customer: "Multan Foods", date: "2026-06-18", amount: 268000, status: "paid" },
  { key: "5", number: "SI-0038", customer: "Sialkot Sports", date: "2026-06-15", amount: 57300, status: "pending" },
];

const STATUS_COLOR: Record<Invoice["status"], string> = { paid: "green", pending: "gold", overdue: "red" };
const CASH_ROWS = [
  { label: "Bank balance", amount: 1840000 },
  { label: "Cash in hand", amount: 142000 },
  { label: "Expected inflow", amount: 612000 },
];

function KpiTile({
  title,
  value,
  delta,
  up,
  good,
  icon,
}: {
  title: string;
  value: string;
  delta: string;
  up: boolean;
  good: boolean;
  icon: React.ReactNode;
}) {
  const { accent } = useAppTheme();
  return (
    <Card styles={{ body: { padding: 18 } }} className="border-gray-100">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-gray-500">{title}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
          <div className="mt-1 flex items-center gap-1 text-xs font-medium" style={{ color: good ? "#16a34a" : "#dc2626" }}>
            {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {delta} vs last month
          </div>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: `${accent}14`, color: accent }}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { user, currentMembership } = useSession();
  const { money, compact } = useCurrency();

  const metrics = [
    { title: "Revenue", value: compact(2845000), delta: "12.4%", up: true, good: true, icon: <Banknote size={20} /> },
    { title: "Receivables", value: compact(612400), delta: "3.1%", up: true, good: false, icon: <Wallet size={20} /> },
    { title: "Overdue", value: compact(88200), delta: "0.8%", up: false, good: true, icon: <TriangleAlert size={20} /> },
    { title: "Active customers", value: "128", delta: "6", up: true, good: true, icon: <Users size={20} /> },
  ];

  const columns = [
    { title: "Invoice", dataIndex: "number", key: "number", render: (v: string) => <span className="font-mono text-sm">{v}</span> },
    { title: "Customer", dataIndex: "customer", key: "customer", render: (v: string) => <span className="font-medium">{v}</span> },
    { title: "Issued", dataIndex: "date", key: "date", render: (v: string) => <span className="text-gray-500">{formatDate(v)}</span> },
    { title: "Amount", dataIndex: "amount", key: "amount", align: "right" as const, render: (v: number) => <span className="font-mono tabular-nums">{money(v)}</span> },
    { title: "Status", dataIndex: "status", key: "status", render: (s: Invoice["status"]) => <Tag color={STATUS_COLOR[s]} className="capitalize">{s}</Tag> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Overview"
        description={
          <>
            {currentMembership?.organization.name} · {currentMembership?.organization.currency} ·{" "}
            <Tag color="default" className="!m-0">Demo data</Tag>
          </>
        }
        actions={<Segmented options={["This month", "Quarter", "Year"]} />}
      />

      <Row gutter={[16, 16]}>
        {metrics.map((m) => (
          <Col key={m.title} xs={24} sm={12} lg={6}>
            <KpiTile {...m} />
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="Revenue & expenses" extra={<Typography.Text type="secondary" className="text-xs">Last 6 months</Typography.Text>} className="border-gray-100">
            <RevenueChart />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Invoice status" extra={<Typography.Text type="secondary" className="text-xs">This month</Typography.Text>} className="h-full border-gray-100">
            <StatusChart />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="Receivables aging" extra={<Typography.Text type="secondary" className="text-xs">Outstanding by age</Typography.Text>} className="border-gray-100">
            <AgingChart />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Cash position" className="h-full border-gray-100">
            <div className="flex flex-col gap-3 text-sm">
              {CASH_ROWS.map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-gray-500">{row.label}</span>
                  <span className="font-mono tabular-nums">{money(row.amount)}</span>
                </div>
              ))}
              <div className="my-1 h-px bg-gray-100" />
              <div className="flex items-center justify-between font-medium">
                <span>Net liquid</span>
                <span className="font-mono tabular-nums">{money(2594000)}</span>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card title="Recent invoices" extra={<Typography.Text type="secondary" className="text-xs">Latest 5</Typography.Text>} className="border-gray-100">
        <Table size="middle" columns={columns} dataSource={INVOICES} pagination={false} />
      </Card>

      <Typography.Paragraph type="secondary" className="!mb-0 text-xs">
        Signed in as {user?.email}. Figures are demo placeholders until Sales &amp; Purchases are built.
      </Typography.Paragraph>
    </div>
  );
}
