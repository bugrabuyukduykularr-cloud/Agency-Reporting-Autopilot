import Link from "next/link";
import { Users, FileText, Clock, Eye } from "lucide-react";
import { format, formatDistanceToNow, parseISO } from "date-fns";

import { createClient } from "@/lib/supabase/server";
import { getAgency, getDashboardStats, getRecentReports } from "@/lib/supabase/queries";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/reports/status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function DashboardPage() {
  const supabase = createClient();
  const agency = await getAgency(supabase);

  const [stats, reports] = await Promise.all([
    agency
      ? getDashboardStats(supabase, agency.id)
      : Promise.resolve({
          totalClients: 0,
          reportsSentThisMonth: 0,
          pendingReports: 0,
          avgOpenRate: 0,
        }),
    agency ? getRecentReports(supabase, agency.id) : Promise.resolve([]),
  ]);

  return (
    <div className="p-6">
      {/* Page header */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          {agency?.name ?? "Your agency"} — overview
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Clients"
          value={stats.totalClients}
          subtitle="active clients"
          icon={Users}
          iconColor="blue"
        />
        <StatCard
          title="Reports This Month"
          value={stats.reportsSentThisMonth}
          subtitle="reports delivered"
          icon={FileText}
          iconColor="green"
        />
        <StatCard
          title="Pending Reports"
          value={stats.pendingReports}
          subtitle="ready to send"
          icon={Clock}
          iconColor="amber"
        />
        <StatCard
          title="Avg Open Rate"
          value={`${stats.avgOpenRate.toFixed(1)}%`}
          subtitle="client open rate"
          icon={Eye}
          iconColor="purple"
        />
      </div>

      {/* Recent reports */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">
            Recent Reports
          </h2>
          <Link
            href="/reports"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View all →
          </Link>
        </div>

        {reports.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <FileText className="h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-base font-semibold text-slate-700">
              No reports yet
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              Add your first client to get started
            </p>
            <Button asChild className="mt-5" size="sm">
              <Link href="/clients">Add Client</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className="text-xs font-medium text-slate-500 w-[200px]">
                    Client
                  </TableHead>
                  <TableHead className="text-xs font-medium text-slate-500">
                    Period
                  </TableHead>
                  <TableHead className="text-xs font-medium text-slate-500">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-medium text-slate-500">
                    Generated
                  </TableHead>
                  <TableHead className="text-xs font-medium text-slate-500 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow
                    key={report.id}
                    className="border-slate-100 hover:bg-slate-50/50"
                  >
                    <TableCell className="font-medium text-slate-800">
                      {report.client_name}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {format(parseISO(report.period_start), "MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={report.status} />
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {formatDistanceToNow(parseISO(report.created_at), {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          asChild
                        >
                          <Link href={`/reports/${report.id}`}>View</Link>
                        </Button>
                        {report.status === "sent" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-slate-500"
                          >
                            Resend
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
