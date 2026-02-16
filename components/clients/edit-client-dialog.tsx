"use client";

import { useState } from "react";
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
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { calculateNextReportAt } from "@/lib/utils";
import type { Client } from "@/types/database";

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
interface EditClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function EditClientDialog({
  open,
  onOpenChange,
  client,
}: EditClientDialogProps) {
  const router = useRouter();
  const { toast } = useToast();

  // Email tag state initialised from client
  const [emails, setEmails] = useState<string[]>(client.contact_emails);
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: client.name,
      report_schedule: client.report_schedule,
      report_day: client.report_day ?? null,
      report_time: client.report_time?.slice(0, 5) ?? "09:00",
      timezone: client.timezone,
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
  // Reset
  // ---------------------------------------------------------------------------
  function resetAll() {
    form.reset({
      name: client.name,
      report_schedule: client.report_schedule,
      report_day: client.report_day ?? null,
      report_time: client.report_time?.slice(0, 5) ?? "09:00",
      timezone: client.timezone,
    });
    setEmails(client.contact_emails);
    setEmailInput("");
    setEmailError(null);
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
      const supabase = createSupabaseClient();

      const nextReportAt = calculateNextReportAt(
        values.report_schedule,
        values.report_day ?? null,
        values.report_time ?? null,
        values.timezone
      );

      const { error } = await supabase
        .from("clients")
        .update({
          name: values.name,
          contact_emails: emails,
          report_schedule: values.report_schedule,
          report_day: values.report_day ?? null,
          report_time: values.report_time ?? null,
          timezone: values.timezone,
          next_report_at: nextReportAt,
        })
        .eq("id", client.id);

      if (error) {
        toast({
          title: "Error updating client",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Client updated",
        description: `${values.name} has been updated successfully.`,
      });

      onOpenChange(false);
      router.refresh();
    } catch (err) {
      console.error("[EditClientDialog submit]", err);
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
          <DialogTitle>Edit Client</DialogTitle>
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

                {/* Existing Logo */}
                {client.logo_url && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium leading-none">
                      Current Logo
                    </label>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={client.logo_url}
                      alt={`${client.name} logo`}
                      className="h-12 w-12 rounded object-cover border border-slate-200"
                    />
                  </div>
                )}

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
                        value={field.value}
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
                          value={
                            field.value !== null && field.value !== undefined
                              ? String(field.value)
                              : ""
                          }
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

                {/* Report Time + Timezone */}
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
                            value={field.value}
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
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
