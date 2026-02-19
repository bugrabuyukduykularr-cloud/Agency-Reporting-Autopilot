"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createBrowserClient } from "@supabase/ssr";
import type { Agency } from "@/types/database";

interface ProfileTabProps {
  agency: Agency;
}

export function ProfileTab({ agency }: ProfileTabProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(agency.name);
  const [website, setWebsite] = useState(agency.custom_domain ?? "");
  const [replyTo, setReplyTo] = useState(agency.reply_to_email ?? "");
  const [logoUrl, setLogoUrl] = useState(agency.logo_url ?? "");
  const [uploading, setUploading] = useState(false);

  // Delete confirmation
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("agencies")
        .update({
          name: name.trim(),
          custom_domain: website.trim() || null,
          reply_to_email: replyTo.trim() || null,
          logo_url: logoUrl || null,
        })
        .eq("id", agency.id);

      if (error) throw error;
      toast({ title: "Settings saved" });
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

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${agency.id}/logo.${ext}`;
      const { error } = await supabase.storage
        .from("agency-logos")
        .upload(path, file, { upsert: true });
      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("agency-logos").getPublicUrl(path);
      setLogoUrl(publicUrl);
      toast({ title: "Logo uploaded" });
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Upload error",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (deleteConfirm !== agency.name) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("agencies")
        .delete()
        .eq("id", agency.id);
      if (error) throw error;

      await supabase.auth.signOut();
      window.location.href = "/signup?deleted=true";
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Delete error",
        variant: "destructive",
      });
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Agency info */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-5">
        <h2 className="text-lg font-semibold text-slate-900">
          Agency Profile
        </h2>

        <div className="space-y-2">
          <Label htmlFor="name">Agency Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your Agency"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Website URL</Label>
          <Input
            id="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://youragency.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="replyTo">Reply-to Email</Label>
          <Input
            id="replyTo"
            type="email"
            value={replyTo}
            onChange={(e) => setReplyTo(e.target.value)}
            placeholder="reports@youragency.com"
          />
          <p className="text-xs text-slate-500">
            This email appears as the sender in reports
          </p>
        </div>

        <div className="space-y-2">
          <Label>Agency Logo</Label>
          <div className="flex items-center gap-4">
            {logoUrl && (
              <img
                src={logoUrl}
                alt="Logo"
                className="h-12 w-12 rounded-lg object-cover border border-slate-200"
              />
            )}
            <label className="cursor-pointer">
              <span className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                {uploading
                  ? "Uploading..."
                  : logoUrl
                    ? "Change Logo"
                    : "Upload Logo"}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
                disabled={uploading}
              />
            </label>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Danger zone */}
      <div className="rounded-lg border border-red-200 bg-red-50/50 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-red-900">Danger Zone</h2>
        <p className="text-sm text-red-700">
          Deleting your agency will permanently remove all clients, reports,
          team members, and data. This cannot be undone.
        </p>

        {!showDelete ? (
          <Button
            variant="destructive"
            onClick={() => setShowDelete(true)}
          >
            Delete Agency
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium text-red-800">
              Type <strong>{agency.name}</strong> to confirm:
            </p>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={agency.name}
            />
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteConfirm !== agency.name || deleting}
              >
                {deleting ? "Deleting..." : "Permanently Delete"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDelete(false);
                  setDeleteConfirm("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
