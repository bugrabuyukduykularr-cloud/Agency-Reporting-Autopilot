"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { calculateNextReportAt } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Istanbul",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
] as const;

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  report_schedule: z.enum(["monthly", "weekly", "on_demand"]),
  report_day: z.number().int().nullable().optional(),
  report_time: z.string().nullable().optional(),
  timezone: z.string().min(1, "Please select a timezone"),
});

type FormValues = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface AddClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function AddClientDialog({
  open,
  onOpenChange,
  agencyId,
}: AddClientDialogProps) {
  const router = useRouter();
  const { toast } = useToast();

  // Email tag state
  const [emails, setEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  // Logo state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      report_schedule: "monthly",
      report_day: null,
      report_time: "09:00",
      timezone: "UTC",
    },
  });

  const schedule = form.watch("report_schedule");

  // ---------------------------------------------------------------------------
  // Email helpers
  // ---------------------------------------------------------------------------
  function addEmail(value: string) {
    const trimmed = value.trim().replace(/,$/, "");
    if (!trimmed) return;

    const parseResult = z.string().email().safeParse(trimmed);
    if (!parseResult.success) {
      setEmailError("Please enter a valid email address");
      return;
    }
    if (emails.includes(trimmed)) {
      setEmailError("Email already added");
      return;
    }
    setEmails((prev) => [...prev, trimmed]);
    setEmailInput("");
    setEmailError(null);
  }

  function removeEmail(email: string) {
    setEmails((prev) => prev.filter((e) => e !== email));
  }

  function handleEmailKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addEmail(emailInput);
    }
  }

  function handleEmailBlur() {
    if (emailInput.trim()) {
      addEmail(emailInput);
    }
  }

  // ---------------------------------------------------------------------------
  // Logo helpers
  // ---------------------------------------------------------------------------
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    setLogoFile(file);
    const preview = URL.createObjectURL(file);
    setLogoPreview(preview);
  }

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------
  function resetAll() {
    form.reset();
    setEmails([]);
    setEmailInput("");
    setEmailError(null);
    setLogoFile(null);
    setLogoPreview(null);
    setIsSubmitting(false);
  }

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------
  async function onSubmit(values: FormValues) {
    if (emails.length === 0) {
      setEmailError("Add at least one contact email");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const clientId = crypto.randomUUID();
      let logoUrl: string | null = null;

      // Upload logo if provided
      if (logoFile) {
        const ext = logoFile.name.split(".").pop();
        const path = `${agencyId}/${clientId}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("client-logos")
          .upload(path, logoFile, { upsert: true });

        if (uploadError) {
          console.error("[upload logo]", uploadError.message);
        } else {
          const { data: urlData } = supabase.storage
            .from("client-logos")
            .getPublicUrl(path);
          logoUrl = urlData.publicUrl;
        }
      }

      // Calculate next report
      const nextReportAt = calculateNextReportAt(
        values.report_schedule,
        values.report_day ?? null,
        values.report_time ?? null,
        values.timezone
      );

      // Insert client
      const { error: clientError } = await supabase.from("clients").insert({
        id: clientId,
        agency_id: agencyId,
        name: values.name,
        contact_emails: emails,
        report_schedule: values.report_schedule,
        report_day: values.report_day ?? null,
        report_time: values.report_time ?? null,
        timezone: values.timezone,
        logo_url: logoUrl,
        active: true,
        next_report_at: nextReportAt,
      });

      if (clientError) {
        toast({
          title: "Error creating client",
          description: clientError.message,
          variant: "destructive",
        });
        return;
      }

      // Insert default report sections
      const { error: sectionsError } = await supabase
        .from("report_sections")
        .insert([
          {
            client_id: clientId,
            agency_id: agencyId,
            platform: "google_analytics",
            section_type: "overview",
            title: "Website Traffic",
            enabled: true,
            sort_order: 1,
          },
          {
            client_id: clientId,
            agency_id: agencyId,
            platform: "meta_ads",
            section_type: "overview",
            title: "Meta Ads Performance",
            enabled: true,
            sort_order: 2,
          },
          {
            client_id: clientId,
            agency_id: agencyId,
            platform: "linkedin_ads",
            section_type: "overview",
            title: "LinkedIn Ads Performance",
            enabled: true,
            sort_order: 3,
          },
        ]);

      if (sectionsError) {
        console.error("[insert sections]", sectionsError.message);
        // Non-fatal — client was created
      }

      toast({
        title: "Client created",
        description: `${values.name} has been added successfully.`,
      });

      onOpenChange(false);
      router.refresh();
      resetAll();
    } catch (err) {
      console.error("[AddClientDialog submit]", err);
      toast({
        title: "Unexpected error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) resetAll();
        onOpenChange(val);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="max-h-[70vh] px-1">
              <div className="space-y-5 py-2 pr-3">
                {/* Client Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Corporation" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Contact Emails */}
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">
                    Contact Emails
                  </label>
                  <Input
                    type="text"
                    placeholder="Add email and press Enter"
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value);
                      setEmailError(null);
                    }}
                    onKeyDown={handleEmailKeyDown}
                    onBlur={handleEmailBlur}
                  />
                  {emailError && (
                    <p className="text-xs text-red-500">{emailError}</p>
                  )}
                  {emails.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {emails.map((email) => (
                        <span
                          key={email}
                          className="bg-blue-100 text-blue-800 rounded-full px-2 py-0.5 text-xs flex items-center gap-1"
                        >
                          {email}
                          <button
                            type="button"
                            onClick={() => removeEmail(email)}
                            className="hover:text-blue-600"
                            aria-label={`Remove ${email}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Report Schedule */}
                <FormField
                  control={form.control}
                  name="report_schedule"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Report Schedule</FormLabel>
                      <Select
                        onValueChange={(val) => {
                          field.onChange(val);
                          form.setValue("report_day", null);
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select schedule" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="on_demand">On Demand</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Report Day — monthly */}
                {schedule === "monthly" && (
                  <FormField
                    control={form.control}
                    name="report_day"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Day of Month (1–28)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={28}
                            placeholder="1"
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.onChange(val === "" ? null : parseInt(val, 10));
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Report Day — weekly */}
                {schedule === "weekly" && (
                  <FormField
                    control={form.control}
                    name="report_day"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Day of Week</FormLabel>
                        <Select
                          onValueChange={(val) => field.onChange(parseInt(val, 10))}
                          value={field.value !== null && field.value !== undefined ? String(field.value) : ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select day" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1">Monday</SelectItem>
                            <SelectItem value="2">Tuesday</SelectItem>
                            <SelectItem value="3">Wednesday</SelectItem>
                            <SelectItem value="4">Thursday</SelectItem>
                            <SelectItem value="5">Friday</SelectItem>
                            <SelectItem value="6">Saturday</SelectItem>
                            <SelectItem value="0">Sunday</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Report Time + Timezone — shown when not on_demand */}
                {schedule !== "on_demand" && (
                  <>
                    <FormField
                      control={form.control}
                      name="report_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Report Time</FormLabel>
                          <FormControl>
                            <Input
                              type="time"
                              value={field.value ?? "09:00"}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="timezone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timezone</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select timezone" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {TIMEZONES.map((tz) => (
                                <SelectItem key={tz} value={tz}>
                                  {tz}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {/* Logo Upload */}
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">
                    Logo (optional)
                  </label>
                  <div className="flex items-center gap-3">
                    {logoPreview && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="h-10 w-10 rounded object-cover border border-slate-200"
                      />
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {logoPreview ? "Change Logo" : "Choose Logo"}
                    </Button>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetAll();
                  onOpenChange(false);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Client
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
