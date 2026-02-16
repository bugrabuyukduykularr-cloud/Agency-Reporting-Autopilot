"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { navItems } from "./nav-config";
import type { Agency } from "@/types/database";

interface MobileHeaderProps {
  agency: Agency | null;
  userName: string;
  userAvatar: string | null;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function MobileHeader({ agency, userName, userAvatar }: MobileHeaderProps) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    setOpen(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <>
      <header className="md:hidden flex items-center justify-between h-14 px-4 bg-[#0F172A] shrink-0">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="text-white p-1"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#3B82F6] text-white font-bold text-sm select-none">
          ARA
        </div>

        <Avatar className="h-8 w-8">
          <AvatarImage src={userAvatar ?? undefined} alt={userName} />
          <AvatarFallback className="bg-[#1E293B] text-white text-xs">
            {getInitials(userName)}
          </AvatarFallback>
        </Avatar>
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[260px] p-0 bg-[#0F172A] border-r-0">
          <SheetHeader className="flex flex-row items-center justify-between px-5 py-4 border-b border-white/10">
            <SheetTitle className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#3B82F6] text-white font-bold text-sm">
                ARA
              </div>
              <span className="text-white text-sm font-medium">
                {agency?.name ?? "Agency Reporting"}
              </span>
            </SheetTitle>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="text-[#94A3B8] hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </SheetHeader>

          <nav className="flex-1 py-4 px-3 space-y-0.5">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                    isActive
                      ? "bg-[#1E293B] text-white font-semibold border-l-[3px] border-[#3B82F6] pl-[calc(0.75rem-3px)]"
                      : "text-[#94A3B8] hover:bg-[#1E293B] hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-4">
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-2 w-full text-xs text-[#94A3B8] hover:text-white px-2 py-2 rounded hover:bg-[#1E293B] transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Log out
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
