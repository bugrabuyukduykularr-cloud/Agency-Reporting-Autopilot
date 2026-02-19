"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  Search,
  Plus,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Agency } from "@/types/database";

interface TopNavProps {
  agency?: Agency | null;
  userName: string;
  userEmail: string;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function TopNav({ userName, userEmail }: TopNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{
        backgroundColor: "#FFFFFF",
        borderColor: "#E8EBED",
      }}
    >
      <div className="mx-auto flex h-[60px] max-w-[1280px] items-center justify-between px-6">
        {/* LEFT SIDE */}
        <div className="flex items-center gap-6">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-[6px] text-white text-xs font-bold select-none"
              style={{ backgroundColor: "#FF6B35" }}
            >
              AR
            </div>
            <span
              className="hidden sm:block text-[17px] font-semibold"
              style={{ color: "#2D3748" }}
            >
              Agency Reports
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "text-[#FF6B35] bg-[#FFF4F0]"
                      : "text-[#718096] hover:bg-[#F7F8F9] hover:text-[#2D3748]"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-3">
          {/* Search bar — desktop only */}
          <div
            className="hidden lg:flex items-center gap-2 rounded-lg px-3 py-2"
            style={{
              backgroundColor: "#F7F8F9",
              width: "280px",
            }}
          >
            <Search className="h-4 w-4" style={{ color: "#718096" }} />
            <input
              type="text"
              placeholder="Search clients, reports..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#718096]"
              style={{ color: "#2D3748" }}
            />
          </div>

          {/* New Report button */}
          <Link
            href="/clients"
            className="hidden sm:flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: "#FF6B35" }}
          >
            <Plus className="h-4 w-4" />
            New Report
          </Link>

          {/* User avatar with dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white select-none transition-opacity hover:opacity-80"
              style={{ backgroundColor: "#FF6B35" }}
              title={userName}
            >
              {getInitials(userName)}
            </button>

            {userMenuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-56 rounded-lg border bg-white py-1 shadow-lg"
                style={{ borderColor: "#E8EBED" }}
              >
                <div className="px-3 py-2 border-b" style={{ borderColor: "#E8EBED" }}>
                  <p className="text-sm font-medium" style={{ color: "#2D3748" }}>
                    {userName}
                  </p>
                  <p className="text-xs" style={{ color: "#718096" }}>
                    {userEmail}
                  </p>
                </div>
                <Link
                  href="/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-[#F7F8F9]"
                  style={{ color: "#718096" }}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-[#F7F8F9]"
                  style={{ color: "#718096" }}
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="md:hidden p-1"
            style={{ color: "#718096" }}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile nav dropdown */}
      {mobileOpen && (
        <div
          className="md:hidden border-t px-4 py-3 space-y-1"
          style={{
            backgroundColor: "#FFFFFF",
            borderColor: "#E8EBED",
          }}
        >
          {/* Mobile search */}
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2 mb-2"
            style={{ backgroundColor: "#F7F8F9" }}
          >
            <Search className="h-4 w-4" style={{ color: "#718096" }} />
            <input
              type="text"
              placeholder="Search..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#718096]"
              style={{ color: "#2D3748" }}
            />
          </div>

          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "text-[#FF6B35] bg-[#FFF4F0]"
                    : "text-[#718096] hover:bg-[#F7F8F9]"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}

          <Link
            href="/clients"
            onClick={() => setMobileOpen(false)}
            className="flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-white mt-2"
            style={{ backgroundColor: "#FF6B35" }}
          >
            <Plus className="h-4 w-4" />
            New Report
          </Link>
        </div>
      )}
    </header>
  );
}
