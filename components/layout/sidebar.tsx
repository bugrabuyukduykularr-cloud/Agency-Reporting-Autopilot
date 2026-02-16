"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { navItems } from "./nav-config";
import type { Agency } from "@/types/database";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SidebarProps {
  agency: Agency | null;
  userName: string;
  userEmail: string;
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

export function Sidebar({ agency, userName, userEmail, userAvatar }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="hidden md:flex flex-col w-[240px] shrink-0 bg-[#0F172A] h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#3B82F6] text-white font-bold text-sm select-none shrink-0">
          ARA
        </div>
        <span className="text-white text-sm font-medium leading-tight truncate">
          {agency?.name ?? "Agency Reporting"}
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-4 px-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
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

      {/* User footer */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={userAvatar ?? undefined} alt={userName} />
            <AvatarFallback className="bg-[#1E293B] text-white text-xs">
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-white text-xs font-medium truncate">{userName}</p>
            <p className="text-[#94A3B8] text-xs truncate">{userEmail}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full text-xs text-[#94A3B8] hover:text-white px-2 py-1.5 rounded hover:bg-[#1E293B] transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Log out
        </button>
      </div>
    </aside>
  );
}
