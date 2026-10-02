import {
  DashboardIcon,
  MarketsIcon,
  WatchlistIcon,
  PortfolioIcon,
  StatusIcon,
  AccountIcon,
  AdminIcon,
} from "@/components/ui/Icons";

export interface NavItem {
  name: string;
  href: string;
  icon: typeof DashboardIcon;
  description: string;
  isAdminOnly?: boolean;
}

export const primaryNavItems: NavItem[] = [
  {
    name: "Dashboard",
    href: "/",
    icon: DashboardIcon,
    description: "Overview of markets, watchlists, and portfolio",
  },
  {
    name: "Markets & Search",
    href: "/markets",
    icon: MarketsIcon,
    description: "Search instruments, daily price charts & technical indicators",
  },
  {
    name: "Watchlists",
    href: "/watchlists",
    icon: WatchlistIcon,
    description: "Personal equity tracking lists",
  },
  {
    name: "Portfolio",
    href: "/portfolio",
    icon: PortfolioIcon,
    description: "Ledger-based transaction entries and allocation analytics",
  },
  {
    name: "Data Status",
    href: "/status",
    icon: StatusIcon,
    description: "Dataset freshness badges and update timelines",
  },
];

export const secondaryNavItems: NavItem[] = [
  {
    name: "Account",
    href: "/account",
    icon: AccountIcon,
    description: "User profile and session settings",
  },
  {
    name: "Admin Operations",
    href: "/admin",
    icon: AdminIcon,
    description: "Ingestion queue management and job monitoring",
    isAdminOnly: true,
  },
];
