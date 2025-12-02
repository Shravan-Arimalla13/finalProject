// In client/src/pages/AdminAnalyticsPage.jsx
import React, { useState, useEffect } from "react";
import api from "../api";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { ScrollText, CheckCircle2, XCircle } from "lucide-react";
import {
  Loader2,
  TrendingUp,
  Users,
  Award,
  Calendar,
  Activity,
  FileText,
  Blocks,
} from "lucide-react";
// --- SHADCN IMPORTS ---
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert-box";

// --- 1. PROFESSIONAL COLOR PALETTE ---
const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];

// --- 2. CUSTOM TOOLTIP COMPONENT ---
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-700">
        <p className="font-bold text-sm mb-1">{label}</p>
        <p className="text-xs text-slate-300">
          {payload[0].name}:{" "}
          <span className="font-mono font-bold text-blue-400">
            {payload[0].value}
          </span>
        </p>
      </div>
    );
  }
  return null;
};

// --- 3. ANIMATED STAT CARD ---
const StatCard = ({ title, value, icon, colorClass, trend }) => (
  <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-transparent hover:border-l-primary">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        {title}
      </CardTitle>
      <div className={`p-2 rounded-full ${colorClass} bg-opacity-10`}>
        {icon}
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground mt-1 flex items-center">
        {trend && <TrendingUp className="h-3 w-3 mr-1 text-green-500" />}
        {trend || "Updated just now"}
      </p>
    </CardContent>
  </Card>
);

function AdminAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await api.get("/admin/analytics");
        setData(response.data);
      } catch (err) {
        setError("Failed to load analytics data.");
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading)
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  if (error)
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );

  // Fallback if no trend data exists yet
  const trendData =
    data.trends && data.trends.length > 0
      ? data.trends
      : [{ name: "No Data", total: 0 }];

  return (
    <div className="min-h-screen bg-muted/40 p-6 md:p-10 space-y-8 animate-in fade-in duration-700">
      {/* --- HEADER --- */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Analytics Overview
        </h1>
        <p className="text-muted-foreground">
          Real-time insights into credentialing performance.
        </p>
      </div>

      {/* --- TOP ROW: STAT CARDS --- */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Certificates"
          value={data.totalCerts}
          icon={<Award className="h-5 w-5 text-blue-600" />}
          colorClass="bg-blue-100"
          trend="+12% this month"
        />
        <StatCard
          title="Active Students"
          value={data.totalStudents}
          icon={<Users className="h-5 w-5 text-green-600" />}
          colorClass="bg-green-100"
          trend="+5 new today"
        />
        <StatCard
          title="Total Events"
          value={data.totalEvents}
          icon={<Calendar className="h-5 w-5 text-orange-600" />}
          colorClass="bg-orange-100"
        />
        <StatCard
          title="Verification Rate"
          value={`${data.verificationRate}%`} // <-- Use real data
          icon={<Activity className="h-5 w-5 text-purple-600" />}
          colorClass="bg-purple-100"
        />
      </div>

      {/* --- MIDDLE ROW: CHARTS --- */}
      <div className="grid gap-6 md:grid-cols-7">
        {/* 1. MAIN CHART (Area - Takes up 4 columns) */}
        <Card className="md:col-span-4 shadow-md">
          <CardHeader>
            <CardTitle>Issuance Trends</CardTitle>
            <CardDescription>Certificates issued over time.</CardDescription>
          </CardHeader>
          <CardContent className="pl-0">
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  className="stroke-slate-200 dark:stroke-slate-700"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#888", fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#888", fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 2. SECONDARY CHART (Pie - Takes up 3 columns) */}
        <Card className="md:col-span-3 shadow-md">
          <CardHeader>
            <CardTitle>Department Distribution</CardTitle>
            <CardDescription>Share of certificates by dept.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={data.certsByDept}
                  cx="50%"
                  cy="50%"
                  innerRadius={60} // Makes it a DONUT chart (Modern look)
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.certsByDept.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* --- BOTTOM ROW: TABS --- */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reports">Detailed Reports</TabsTrigger>
          <TabsTrigger value="logs">Blockchain Logs</TabsTrigger>
        </TabsList>
        {/* In client/src/pages/AdminAnalyticsPage.jsx */}

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest system transactions and issuances.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!data.recentLogs || data.recentLogs.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No recent activity logs available.
                </div>
              ) : (
                <div className="space-y-8">
                  {data.recentLogs.map((log, i) => (
                    <div key={i} className="flex items-center">
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none text-foreground">
                          {log.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {log.action} • by {log.adminName} •{" "}
                          {new Date(log.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="ml-auto font-medium text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        {/* --- TAB 2: DETAILED REPORTS --- */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" /> Certificate Ledger
              </CardTitle>
              <CardDescription>
                A complete list of all issued credentials.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="p-4 font-medium">Student Name</th>
                      <th className="p-4 font-medium">Event</th>
                      <th className="p-4 font-medium">Certificate ID</th>
                      <th className="p-4 font-medium text-right">
                        Date Issued
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {!data.detailedReports ||
                    data.detailedReports.length === 0 ? (
                      <tr>
                        <td
                          colSpan="4"
                          className="text-center p-4 text-muted-foreground"
                        >
                          No certificate reports found.
                        </td>
                      </tr>
                    ) : (
                      data.detailedReports.map((report) => (
                        <tr
                          key={report._id}
                          className="border-t hover:bg-muted/20"
                        >
                          <td className="p-4 font-medium">
                            {report.studentName || "Unknown"}
                          </td>
                          <td className="p-4">
                            {report.eventName || "Unknown"}
                          </td>
                          <td className="p-4 font-mono text-xs">
                            {report.certificateId || "N/A"}
                          </td>
                          <td className="p-4 text-right text-muted-foreground">
                            {report.createdAt
                              ? new Date(report.createdAt).toLocaleDateString()
                              : "No Date"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- TAB 3: BLOCKCHAIN LOGS --- */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Blocks className="h-5 w-5" /> Blockchain Transactions
              </CardTitle>
              <CardDescription>
                Raw transaction data from the Smart Contract.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Method</th>
                      <th className="p-4 font-medium">Transaction Hash (TX)</th>
                      <th className="p-4 font-medium text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!data.blockchainLogs ||
                    data.blockchainLogs.length === 0 ? (
                      <tr>
                        <td
                          colSpan="4"
                          className="text-center p-4 text-muted-foreground"
                        >
                          No blockchain transaction logs found.
                        </td>
                      </tr>
                    ) : (
                      data.blockchainLogs.map((log, i) => (
                        <tr key={i} className="border-t hover:bg-muted/20">
                          <td className="p-4">
                            <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
                              {log.status || "Unknown"}
                            </span>
                          </td>
                          <td className="p-4 font-mono text-xs text-blue-600">
                            {log.method || "MintCertificate"}
                          </td>
                          <td
                            className="p-4 font-mono text-xs text-muted-foreground break-all max-w-[200px] truncate"
                            title={log.txHash}
                          >
                            {log.txHash || "Pending..."}
                          </td>
                          <td className="p-4 text-right text-muted-foreground">
                            {log.timestamp
                              ? new Date(log.timestamp).toLocaleString()
                              : "No Date"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AdminAnalyticsPage;
