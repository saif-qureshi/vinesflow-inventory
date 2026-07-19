"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useCurrency } from "@/hooks/useCurrency";
import { useAppTheme } from "@/hooks/useSession";

const EXPENSE = "#64748b";
const STATUS = { Paid: "#16a34a", Pending: "#f59e0b", Overdue: "#dc2626" };
const AXIS = { tickLine: false, axisLine: false, tickMargin: 8, fontSize: 12, stroke: "#94a3b8" } as const;

const REVENUE = [
  { month: "Jan", revenue: 2100000, expenses: 1450000 },
  { month: "Feb", revenue: 1980000, expenses: 1380000 },
  { month: "Mar", revenue: 2450000, expenses: 1620000 },
  { month: "Apr", revenue: 2310000, expenses: 1550000 },
  { month: "May", revenue: 2680000, expenses: 1710000 },
  { month: "Jun", revenue: 2845000, expenses: 1790000 },
];

const AGING = [
  { bucket: "Current", amount: 412000 },
  { bucket: "1–30", amount: 112200 },
  { bucket: "31–60", amount: 61400 },
  { bucket: "60+", amount: 26800 },
];

const STATUS_DATA = [
  { status: "Paid", invoices: 2 },
  { status: "Pending", invoices: 2 },
  { status: "Overdue", invoices: 1 },
];

export function RevenueChart() {
  const { money, compact } = useCurrency();
  const { accent } = useAppTheme();
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={REVENUE} margin={{ left: 4, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity={0.25} />
            <stop offset="100%" stopColor={accent} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="fillExpenses" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={EXPENSE} stopOpacity={0.18} />
            <stop offset="100%" stopColor={EXPENSE} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="month" {...AXIS} />
        <YAxis {...AXIS} width={52} tickFormatter={(v: number) => compact(v)} />
        <Tooltip formatter={(v) => money(Number(v))} />
        <Legend iconType="circle" />
        <Area type="monotone" dataKey="revenue" name="Revenue" stroke={accent} strokeWidth={2} fill="url(#fillRevenue)" />
        <Area type="monotone" dataKey="expenses" name="Expenses" stroke={EXPENSE} strokeWidth={2} fill="url(#fillExpenses)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function AgingChart() {
  const { money, compact } = useCurrency();
  const { accent } = useAppTheme();
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={AGING} margin={{ left: 4, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="bucket" {...AXIS} />
        <YAxis {...AXIS} width={52} tickFormatter={(v: number) => compact(v)} />
        <Tooltip formatter={(v) => money(Number(v))} cursor={{ fill: "#f8fafc" }} />
        <Bar dataKey="amount" name="Outstanding" fill={accent} radius={[4, 4, 0, 0]} maxBarSize={64} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StatusChart() {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Tooltip />
        <Pie data={STATUS_DATA} dataKey="invoices" nameKey="status" innerRadius={56} outerRadius={86} paddingAngle={2} strokeWidth={2}>
          {STATUS_DATA.map((entry) => (
            <Cell key={entry.status} fill={STATUS[entry.status as keyof typeof STATUS]} />
          ))}
        </Pie>
        <Legend iconType="circle" />
      </PieChart>
    </ResponsiveContainer>
  );
}
