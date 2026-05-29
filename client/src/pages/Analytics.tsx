import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ArrowLeft,
  Calendar,
  Filter,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Eye,
  Users,
  MousePointerClick,
  Clock,
  LogOut,
} from "lucide-react";
import { format, parseISO } from "date-fns";

const DAY_OPTIONS = [7, 30, 90, 180] as const;
type DayOption = (typeof DAY_OPTIONS)[number];

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}秒`;
  return `${m}分鐘 ${s}秒`;
}

function formatNumber(n: number) {
  return n.toLocaleString("zh-TW");
}

function ChangeTag({ change, invert = false }: { change: number; invert?: boolean }) {
  const positive = invert ? change < 0 : change >= 0;
  const color = positive ? "text-emerald-500" : "text-red-500";
  const Icon = change >= 0 ? TrendingUp : TrendingDown;
  return (
    <span className={`flex items-center gap-0.5 text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3" />
      {Math.abs(change)}%
    </span>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  change: number;
  icon: React.ElementType;
  invertChange?: boolean;
}

function StatCard({ label, value, change, icon: Icon, invertChange }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-2 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
          <Icon className="w-4 h-4 text-gray-400" />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <ChangeTag change={change} invert={invertChange} />
    </div>
  );
}

const CHART_TOOLTIP_STYLE = {
  backgroundColor: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  fontSize: 12,
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};

export default function Analytics() {
  const [, setLocation] = useLocation();
  const [days, setDays] = useState<DayOption>(30);
  const { data, isLoading, refetch } = trpc.analytics.summary.useQuery({ days });

  const chartData = (data?.daily ?? []).map((d) => ({
    ...d,
    label: format(parseISO(d.date), days <= 30 ? "MM/dd" : "MM/dd"),
  }));

  // Thin out labels for large ranges
  const tickInterval = days <= 30 ? 4 : days <= 90 ? 13 : 29;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-4">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>
          <div className="h-4 w-px bg-gray-200" />
          <img src="/logo.png" alt="262 Academy" className="h-8 w-auto" />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Title row */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">分析</h1>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors bg-white"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            重新整理
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg bg-white overflow-hidden">
            {DAY_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
                  days === d
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {d === days && <Calendar className="w-3.5 h-3.5" />}
                過去 {d} 天
              </button>
            ))}
          </div>
          <button className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors bg-white">
            <Filter className="w-3.5 h-3.5" />
            篩選器
          </button>
        </div>

        {/* Stat cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 h-28 animate-pulse" />
            ))}
          </div>
        ) : data ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            <StatCard
              label="頁面瀏覽量"
              value={formatNumber(data.pageViews.value)}
              change={data.pageViews.change}
              icon={Eye}
            />
            <StatCard
              label="訪問次數"
              value={formatNumber(data.visits.value)}
              change={data.visits.change}
              icon={MousePointerClick}
            />
            <StatCard
              label="訪客"
              value={formatNumber(data.visitors.value)}
              change={data.visitors.change}
              icon={Users}
            />
            <StatCard
              label="持續時間"
              value={formatDuration(data.duration.value)}
              change={data.duration.change}
              icon={Clock}
            />
            <StatCard
              label="跳出率"
              value={`${data.bounceRate.value}%`}
              change={data.bounceRate.change}
              icon={LogOut}
              invertChange
            />
          </div>
        ) : null}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Page views area chart */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">頁面瀏覽量趨勢</h2>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="pvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  interval={tickInterval}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={36} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number) => [formatNumber(v), "瀏覽量"]} />
                <Area
                  type="monotone"
                  dataKey="pageViews"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#pvGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Visits bar chart */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">訪問次數 / 訪客</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  interval={tickInterval}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={36} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Bar dataKey="visits" name="訪問" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={12} />
                <Bar dataKey="visitors" name="訪客" fill="#93c5fd" radius={[3, 3, 0, 0]} maxBarSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Duration area chart */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">平均持續時間（秒）</h2>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="durGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  interval={tickInterval}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={36} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number) => [formatDuration(v), "持續時間"]} />
                <Area
                  type="monotone"
                  dataKey="duration"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#durGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Bounce rate area chart */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">跳出率（%）</h2>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="brGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  interval={tickInterval}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                  domain={[50, 100]}
                />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number) => [`${v}%`, "跳出率"]} />
                <Area
                  type="monotone"
                  dataKey="bounceRate"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#brGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>
    </div>
  );
}
