"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import {
  GripVertical,
  Briefcase,
  MessageCircle,
  BarChart2,
} from "lucide-react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ConnectionsTab } from "@/components/clients/connections-tab";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/reports/status-badge";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import type { Client, DataConnection, Report, ReportSection } from "@/types/database";
import type { Platform } from "@/types/index";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ClientDetailTabsProps {
  client: Client;
  connections: DataConnection[];
  sections: ReportSection[];
  recentReports: Report[];
  agencyId: string;
}

// ---------------------------------------------------------------------------
// Platform display helpers
// ---------------------------------------------------------------------------
const PLATFORM_LABELS: Record<Platform, string> = {
  google_analytics: "Google Analytics 4",
  meta_ads: "Meta Ads",
  linkedin_ads: "LinkedIn Ads",
};

const PLATFORM_ORDER: Platform[] = [
  "google_analytics",
  "meta_ads",
  "linkedin_ads",
];

const PLATFORM_PILL_CLASSES: Record<Platform, string> = {
  google_analytics: "border-amber-300 bg-amber-50 text-amber-700",
  meta_ads: "border-blue-300 bg-blue-50 text-blue-700",
  linkedin_ads: "border-sky-300 bg-sky-50 text-sky-700",
};

const PLATFORM_SHORT: Record<Platform, string> = {
  google_analytics: "GA4",
  meta_ads: "Meta",
  linkedin_ads: "LinkedIn",
};

// ---------------------------------------------------------------------------
// AI Tone config
// ---------------------------------------------------------------------------
type AiTone = "professional" | "friendly" | "data_heavy";

interface ToneOption {
  key: AiTone;
  label: string;
  description: string;
  icon: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export function ClientDetailTabs({
  client,
  connections,
  sections,
  recentReports,
  agencyId,
}: ClientDetailTabsProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("overview");

  // Report Config state
  const [localSections, setLocalSections] = useState<ReportSection[]>(sections);
  const [aiTone, setAiTone] = useState<string>(client.ai_tone ?? "professional");

  // Danger Zone state
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");

  // ---------------------------------------------------------------------------
  // Section toggle
  // ---------------------------------------------------------------------------
  async function handleSectionToggle(sectionId: string, enabled: boolean) {
    // Optimistic update
    setLocalSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, enabled } : s))
    );

    const supabase = createClient();
    const { error } = await supabase
      .from("report_sections")
      .update({ enabled })
      .eq("id", sectionId);

    if (error) {
      // Revert
      setLocalSections((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, enabled: !enabled } : s))
      );
      toast({
        title: "Error updating section",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  // ---------------------------------------------------------------------------
  // AI Tone update
  // ---------------------------------------------------------------------------
  async function handleAiToneChange(tone: string) {
    const previousTone = aiTone;
    setAiTone(tone);

    const supabase = createClient();
    const { error } = await supabase
      .from("clients")
      .update({ ai_tone: tone })
      .eq("id", client.id);

    if (error) {
      setAiTone(previousTone);
      toast({
        title: "Error updating tone",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Activate / Deactivate
  // ---------------------------------------------------------------------------
  async function handleToggleActive() {
    const supabase = createClient();
    const { error } = await supabase
      .from("clients")
      .update({ active: !client.active })
      .eq("id", client.id);

    if (error) {
      toast({
        title: "Error updating client status",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    router.refresh();
  }

  // ---------------------------------------------------------------------------
  // Delete client
  // ---------------------------------------------------------------------------
  async function handleDeleteClient() {
    const supabase = createClient();
    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", client.id);

    if (error) {
      toast({
        title: "Error deleting client",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    router.push("/clients");
  }

  // ---------------------------------------------------------------------------
  // Tone options
  // ---------------------------------------------------------------------------
  const TONE_OPTIONS: ToneOption[] = [
    {
      key: "professional",
      label: "Professional",
      description: "Formal language, data-focused",
      icon: <Briefcase className="h-5 w-5" />,
    },
    {
      key: "friendly",
      label: "Friendly",
      description: "Conversational and warm",
      icon: <MessageCircle className="h-5 w-5" />,
    },
    {
      key: "data_heavy",
      label: "Data-Heavy",
      description: "Maximum metrics and granular analysis",
      icon: <BarChart2 className="h-5 w-5" />,
    },
  ];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="connections">Connections</TabsTrigger>
        <TabsTrigger value="report-config">Report Config</TabsTrigger>
      </TabsList>

      {/* ===================================================================
          TAB 1 — Overview
      ==================================================================== */}
      <TabsContent value="overview" className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Client Info */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
            <h2 className="font-semibold text-slate-800 mb-4">Client Info</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Schedule</span>
                <span className="text-sm text-slate-800 capitalize">
                  {client.report_schedule.replace(/_/g, " ")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Next Report</span>
                <span className="text-sm text-slate-800">
                  {client.next_report_at
                    ? format(parseISO(client.next_report_at), "PPP")
                    : "Not scheduled"}
                </span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-sm text-slate-500">Contact Emails</span>
                <div className="text-right">
                  {client.contact_emails.map((email) => (
                    <p key={email} className="text-sm text-slate-800">
                      {email}
                    </p>
                  ))}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Created</span>
                <span className="text-sm text-slate-800">
                  {format(parseISO(client.created_at), "PPP")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Status</span>
                {client.active ? (
                  <Badge
                    variant="outline"
                    className="border-green-300 bg-green-50 text-green-700"
                  >
                    Active
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-slate-300 bg-slate-50 text-slate-500"
                  >
                    Inactive
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Connected Platforms */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
            <h2 className="font-semibold text-slate-800 mb-4">
              Connected Platforms
            </h2>
            <div>
              {PLATFORM_ORDER.map((platform) => {
                const connection = connections.find(
                  (c) => c.platform === platform
                );
                return (
                  <div
                    key={platform}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={[
                          "h-2 w-2 rounded-full flex-shrink-0",
                          connection ? "bg-green-500" : "bg-slate-300",
                        ].join(" ")}
                      />
                      <span className="text-sm text-slate-700">
                        {PLATFORM_LABELS[platform]}
                      </span>
                    </div>
                    {connection ? (
                      <div className="text-right">
                        <p className="text-xs text-green-600">Connected</p>
                        {connection.last_synced_at && (
                          <p className="text-xs text-slate-400">
                            Last synced{" "}
                            {formatDistanceToNow(
                              parseISO(connection.last_synced_at),
                              { addSuffix: true }
                            )}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">Not connected</p>
                    )}
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("connections")}
              className="mt-3 text-xs text-blue-500 hover:text-blue-700 transition-colors"
            >
              Add connections in the Connections tab →
            </button>
          </div>
        </div>

        {/* Recent Reports */}
        <div className="mt-6 bg-white rounded-xl border border-[#E2E8F0] p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Recent Reports</h2>
          {recentReports.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-8">
              No reports generated yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="text-sm">
                      {format(parseISO(report.period_start), "MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={report.status} />
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {formatDistanceToNow(parseISO(report.created_at), {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell>
                      {report.public_link ? (
                        <a
                          href={report.public_link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </a>
                      ) : (
                        <Button variant="outline" size="sm" disabled>
                          View
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </TabsContent>

      {/* ===================================================================
          TAB 2 — Connections
      ==================================================================== */}
      <TabsContent value="connections" className="mt-6">
        <ConnectionsTab
          client={client}
          connections={connections}
          agencyId={agencyId}
        />
      </TabsContent>

      {/* ===================================================================
          TAB 3 — Report Config
      ==================================================================== */}
      <TabsContent value="report-config" className="mt-6 space-y-8">
        {/* Report Sections */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
          <h2 className="font-semibold text-slate-800 mb-1">Report Sections</h2>
          <p className="text-sm text-slate-500 mb-4">
            Enable or disable sections that appear in generated reports.
          </p>
          <div>
            {localSections.map((section) => (
              <div
                key={section.id}
                className="flex items-center justify-between py-3 border-b last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-800">
                    {section.title}
                  </span>
                  <Badge
                    variant="outline"
                    className={PLATFORM_PILL_CLASSES[section.platform]}
                  >
                    {PLATFORM_SHORT[section.platform]}
                  </Badge>
                </div>
                <Switch
                  checked={section.enabled}
                  onCheckedChange={(checked) =>
                    handleSectionToggle(section.id, checked)
                  }
                />
              </div>
            ))}
            {localSections.length === 0 && (
              <p className="text-sm text-slate-400 py-4 text-center">
                No sections configured.
              </p>
            )}
          </div>
        </div>

        {/* AI Tone */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
          <h2 className="font-semibold text-slate-800 mb-1">
            AI Commentary Tone
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Choose the tone for AI-generated commentary in reports.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {TONE_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => handleAiToneChange(option.key)}
                className={[
                  "flex flex-col items-center gap-2 p-4 rounded-xl text-center transition-all",
                  aiTone === option.key
                    ? "border-2 border-blue-500 bg-blue-50"
                    : "border border-[#E2E8F0] hover:border-blue-200",
                ].join(" ")}
              >
                <span
                  className={
                    aiTone === option.key
                      ? "text-blue-600"
                      : "text-slate-500"
                  }
                >
                  {option.icon}
                </span>
                <span className="text-sm font-medium text-slate-800">
                  {option.label}
                </span>
                <span className="text-xs text-slate-500">
                  {option.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="mt-8 border-t border-red-100 pt-6">
          <h2 className="text-red-600 font-semibold mb-4">Danger Zone</h2>
          <div className="flex gap-4 flex-wrap">
            {/* Activate / Deactivate */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  {client.active ? "Deactivate Client" : "Activate Client"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {client.active ? "Deactivate" : "Activate"} Client
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {client.active
                      ? "This will deactivate the client. No new reports will be generated."
                      : "This will reactivate the client and resume scheduled reports."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleToggleActive}>
                    {client.active ? "Deactivate" : "Activate"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Delete */}
            <AlertDialog
              onOpenChange={(open) => {
                if (!open) setDeleteConfirmInput("");
              }}
            >
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Delete Client</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Client</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action is permanent and cannot be undone. All reports
                    and data associated with{" "}
                    <strong>{client.name}</strong> will be deleted.
                    <br />
                    <br />
                    Type{" "}
                    <strong className="font-mono">{client.name}</strong> to
                    confirm.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="px-6 pb-2">
                  <Input
                    placeholder={client.name}
                    value={deleteConfirmInput}
                    onChange={(e) => setDeleteConfirmInput(e.target.value)}
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={handleDeleteClient}
                    disabled={deleteConfirmInput !== client.name}
                  >
                    Delete Client
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
