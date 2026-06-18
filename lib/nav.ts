import type { LucideIcon } from "lucide-react";
import {
  Archive,
  BarChart3,
  Boxes,
  Building2,
  ClipboardList,
  CreditCard,
  FileText,
  Gem,
  Home,
  Layers,
  MessageSquare,
  Shield,
  Settings,
  ShoppingBag,
  LogOut,
  Users
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

export const navSections: NavSection[] = [
  {
    label: "Main",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: Home },
      { href: "/sales", label: "Sales", icon: CreditCard },
      { href: "/purchases", label: "Purchase", icon: ShoppingBag },
      { href: "/stock", label: "Inventory", icon: Boxes }
    ]
  },
  {
    label: "People",
    items: [
      { href: "/customers", label: "Customers", icon: Users },
      { href: "/goldsmiths", label: "Suppliers / Goldsmith", icon: Users },
      { href: "/salesmen", label: "Salesmen", icon: Users }
    ]
  },
  {
    label: "Masters",
    items: [
      { href: "/categories", label: "Categories", icon: Gem },
      { href: "/subcategories", label: "Subcategories", icon: Layers }
    ]
  },
  {
    label: "Accounts",
    items: [
      { href: "/accounts", label: "Accounts", icon: Building2 },
      { href: "/payments", label: "Payments", icon: CreditCard }
    ]
  },
  {
    label: "Reports",
    items: [{ href: "/reports", label: "Reports", icon: BarChart3 }]
  },
  {
    label: "System",
    items: [
      { href: "/sms", label: "SMS / WhatsApp", icon: MessageSquare },
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/users", label: "Users & Roles", icon: Shield },
      { href: "/backup", label: "Backup", icon: Archive },
      { href: "/logout", label: "Log Out", icon: LogOut }
    ]
  }
];

export const navItems: NavItem[] = navSections.flatMap((s) => s.items);

export const quickActions = [
  { href: "/stock/new", label: "Add Stock", icon: ClipboardList },
  { href: "/sales/new", label: "New Invoice", icon: FileText }
];
