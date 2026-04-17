import { LayoutDashboard, BookOpen, SquarePen, type LucideIcon } from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/topics',
    label: 'Topics',
    icon: BookOpen,
  },
  {
    href: '/practice',
    label: 'Practice',
    icon: SquarePen,
  },
];
