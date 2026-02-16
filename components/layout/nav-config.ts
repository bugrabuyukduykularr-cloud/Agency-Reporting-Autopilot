import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients",   label: "Clients",   icon: Users },
  { href: "/reports",   label: "Reports",   icon: FileText },
  { href: "/settings",  label: "Settings",  icon: Settings },
];
