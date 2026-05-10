import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  CreditCard,
  Gem,
  Home,
  Layers,
  Settings,
  ShoppingBag,
  Truck,
  Users
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/stock", label: "Stock", icon: Boxes },
  { href: "/goldsmiths", label: "Goldsmiths", icon: Users },
  { href: "/categories", label: "Categories", icon: Gem },
  { href: "/subcategories", label: "Subcategories", icon: Layers },
  { href: "/sales", label: "Invoices", icon: CreditCard },
  { href: "/salesmen", label: "Salesmen", icon: Users },
  //{ href: "/purchases", label: "Purchases", icon: ShoppingBag },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/suppliers", label: "Suppliers", icon: Truck },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  //{ href: "/settings", label: "Settings", icon: Settings }
];

export const quickActions = [
  { href: "/stock/new", label: "Add Stock", icon: ClipboardList },
  { href: "/sales/new", label: "New Invoice", icon: CreditCard }
];
