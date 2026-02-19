import Link from "next/link";
import { Users, FileText, Clock, Eye, MoreHorizontal, Download } from "lucide-react";
import { format, formatDistanceToNow, parseISO } from "date-fns";

import { createClient } from "@/lib/supabase/server";
import {
  getAgency,
  getDashboardStats,
  getRecentReports,
  getClients,
} from "@/lib/supabase/queries";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/reports/status-badge";

export default async function DashboardPage() {
  const supabase = createClient();
  const agency = await getAgency(supabase);

  const [stats, reports, clients] = await Promise.all([
    agency
      ? getDashboardStats(supabase, agency.id)
      : Promise.resolve({
          totalClients: 0,
          reportsSentThisMonth: 0,
          pendingReports: 0,
          avgOpenRate: 0,
        }),
    agency ? getRecentReports(supabase, agency.id) : Promise.resolve([]),
    agency ? getClients(supabase, agency.id) : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-[1280px] px-6 py-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-[28px] font-bold" style={{ color: "#2D3748" }}>
          Dashboard
        </h1>
        <p className="mt-1 text-[15px]" style={{ color: "#718096" }}>
          Monitor your automated client reporting
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Clients"
          value={stats.totalClients}
          subtitle="active clients"
          icon={Users}
        />
        <StatCard
          title="Reports Sent"
          value={stats.reportsSentThisMonth}
          subtitle="This month"
          icon={FileText}
        />
        <StatCard
          title="Open Rate"
          value={`${stats.avgOpenRate.toFixed(1)}%`}
          subtitle="Client open rate"
          icon={Eye}
        />
        <StatCard
          title="Time Saved"
          value="48h"
          subtitle="On autopilot"
          icon={Clock}
        />
      </div>

      {/* Active clients table */}
      <div
        className="rounded-lg border mb-8"
        style={{ backgroundColor: "#FFFFFF", borderColor: "#E8EBED" }}
      >
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "#E8EBED" }}
        >
          <h2 className="text-base font-semibold" style={{ color: "#2D3748" }}>
            Active Clients
          </h2>
          <Link
            href="/clients"
            className="text-sm font-medium hover:underline"
            style={{ color: "#FF6B35" }}
          >
            View all →
          </Link>
        </div>

        {clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <Users className="h-12 w-12 mb-4" style={{ color: "#E8EBED" }} />
            <h3
              className="text-base font-semibold"
              style={{ color: "#2D3748" }}
            >
              No clients yet
            </h3>
            <p className="mt-1 text-sm" style={{ color: "#718096" }}>
              Add your first client to start generating reports
            </p>
            <Link
              href="/clients"
              className="mt-4 inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: "#FF6B35" }}
            >
              Add Client
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: "#FAFBFC" }}>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-[0.5px]"
                    style={{ color: "#718096" }}
                  >
                    Client
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-[0.5px]"
                    style={{ color: "#718096" }}
                  >
                    Schedule
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-[0.5px]"
                    style={{ color: "#718096" }}
                  >
                    Status
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium uppercase tracking-[0.5px]"
                    style={{ color: "#718096" }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {clients.slice(0, 5).map((client) => (
                  <tr
                    key={client.id}
                    className="border-t transition-colors hover:bg-[#FAFBFC]"
                    style={{ borderColor: "#E8EBED" }}
                  >
                    <td className="px-6 py-3.5">
                      <Link
                        href={`/clients/${client.id}`}
                        className="text-sm font-medium hover:underline"
                        style={{ color: "#2D3748" }}
                      >
                        {client.name}
                      </Link>
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className="text-sm capitalize"
                        style={{ color: "#718096" }}
                      >
                        {client.report_schedule === "on_demand"
                          ? "On Demand"
                          : client.report_schedule}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: client.active
                            ? "#F0FFF4"
                            : "#FFF5F5",
                          color: client.active ? "#48BB78" : "#F56565",
                        }}
                      >
                        {client.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <Link
                        href={`/clients/${client.id}`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-[#F7F8F9]"
                      >
                        <MoreHorizontal
                          className="h-4 w-4"
                          style={{ color: "#718096" }}
                        />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {clients.length > 5 && (
              <div
                className="flex items-center justify-between px-6 py-3 border-t"
                style={{ borderColor: "#E8EBED" }}
              >
                <span className="text-[13px]" style={{ color: "#718096" }}>
                  Showing 5 of {clients.length} clients
                </span>
                <Link
                  href="/clients"
                  className="text-[13px] font-medium hover:underline"
                  style={{ color: "#FF6B35" }}
                >
                  View all →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent reports table */}
      <div
        className="rounded-lg border"
        style={{ backgroundColor: "#FFFFFF", borderColor: "#E8EBED" }}
      >
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "#E8EBED" }}
        >
          <h2 className="text-base font-semibold" style={{ color: "#2D3748" }}>
            Recent Reports
          </h2>
          <Link
            href="/reports"
            className="text-sm font-medium hover:underline"
            style={{ color: "#FF6B35" }}
          >
            View all →
          </Link>
        </div>

        {reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <FileText className="h-12 w-12 mb-4" style={{ color: "#E8EBED" }} />
            <h3
              className="text-base font-semibold"
              style={{ color: "#2D3748" }}
            >
              No reports yet
            </h3>
            <p className="mt-1 text-sm" style={{ color: "#718096" }}>
              Generate your first report from a client page
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: "#FAFBFC" }}>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-[0.5px]"
                    style={{ color: "#718096" }}
                  >
                    Client
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-[0.5px]"
                    style={{ color: "#718096" }}
                  >
                    Period
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-[0.5px]"
                    style={{ color: "#718096" }}
                  >
                    Status
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-[0.5px]"
                    style={{ color: "#718096" }}
                  >
                    Sent
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium uppercase tracking-[0.5px]"
                    style={{ color: "#718096" }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr
                    key={report.id}
                    className="border-t transition-colors hover:bg-[#FAFBFC]"
                    style={{ borderColor: "#E8EBED" }}
                  >
                    <td className="px-6 py-3.5">
                      <span
                        className="text-sm font-medium"
                        style={{ color: "#2D3748" }}
                      >
                        {report.client_name}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-sm" style={{ color: "#718096" }}>
                        {format(parseISO(report.period_start), "MMM yyyy")}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={report.status} />
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-sm" style={{ color: "#718096" }}>
                        {formatDistanceToNow(parseISO(report.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/reports/${report.id}`}
                          className="rounded px-2.5 py-1 text-xs font-medium transition-colors hover:bg-[#F7F8F9]"
                          style={{ color: "#FF6B35" }}
                        >
                          View
                        </Link>
                        {report.pdf_url && (
                          <a
                            href={report.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-[#F7F8F9]"
                          >
                            <Download
                              className="h-3.5 w-3.5"
                              style={{ color: "#718096" }}
                            />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
