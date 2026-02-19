"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createBrowserClient } from "@supabase/ssr";
import type { Agency } from "@/types/database";

interface WhiteLabelTabProps {
  agency: Agency;
}

export function WhiteLabelTab({ agency }: WhiteLabelTabProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [primary, setPrimary] = useState(agency.primary_color || "#3B82F6");
  const [secondary, setSecondary] = useState(
    agency.secondary_color || "#0F172A"
  );

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("agencies")
        .update({
          primary_color: primary,
          secondary_color: secondary,
        })
        .eq("id", agency.id);

      if (error) throw error;
      toast({ title: "Brand colors saved" });
      router.refresh();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Save failed",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Brand colors */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-5">
        <h2 className="text-lg font-semibold text-slate-900">Brand Colors</h2>
        <p className="text-sm text-slate-500">
          These colors appear in your report emails and public report viewer.
        </p>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="primary">Primary Color</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                id="primary"
                value={primary}
                onChange={(e) => setPrimary(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded border border-slate-300"
              />
              <span className="text-sm text-slate-600 font-mono">
                {primary}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="secondary">Secondary Color</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                id="secondary"
                value={secondary}
                onChange={(e) => setSecondary(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded border border-slate-300"
              />
              <span className="text-sm text-slate-600 font-mono">
                {secondary}
              </span>
            </div>
          </div>
        </div>

        {/* Live preview */}
        <div className="mt-4">
          <Label className="mb-2 block">Preview</Label>
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <div
              className="px-4 py-3 text-white text-sm font-semibold"
              style={{ backgroundColor: primary }}
            >
              {agency.name} — Monthly Report
            </div>
            <div className="p-4">
              <div
                className="inline-block rounded px-3 py-1.5 text-xs font-medium text-white"
                style={{ backgroundColor: secondary }}
              >
                View Report
              </div>
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Colors"}
        </Button>
      </div>

      {/* Custom domain — Pro only */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Custom Domain</h2>

        {agency.plan !== "active" ? (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
            <p className="text-sm text-slate-600">
              Custom domains are available on the Pro plan.
            </p>
            <a
              href="/upgrade"
              className="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline"
            >
              Upgrade to Pro →
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              Serve reports from your own domain (e.g.,
              reports.youragency.com).
            </p>
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm">
              <p className="font-medium text-slate-700 mb-2">
                DNS Configuration
              </p>
              <p className="text-slate-600">
                Add a{" "}
                <code className="text-xs bg-slate-200 px-1 py-0.5 rounded">
                  CNAME
                </code>{" "}
                record pointing your subdomain to{" "}
                <code className="text-xs bg-slate-200 px-1 py-0.5 rounded">
                  cname.vercel-dns.com
                </code>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
