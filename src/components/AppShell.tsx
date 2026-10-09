import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  History,
  LayoutDashboard,
  Link2,
  MessageSquareWarning,
  Settings,
  Shield,
} from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/url", label: "URL Scanner", icon: Link2 },
  { to: "/message", label: "Message Analyzer", icon: MessageSquareWarning },
  { to: "/history", label: "History", icon: History },
  { to: "/guide", label: "Security Guide", icon: BookOpen },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen md:flex">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <aside className="border-b bg-sidebar md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex items-center gap-2 px-5 py-4">
          <Shield aria-hidden="true" className="size-7 text-primary" />
          <span className="font-display text-lg font-bold">
            CyberShield <span className="text-primary">AI</span>
          </span>
        </div>
        <nav aria-label="Main">
          <ul className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
            {NAV.map(({ to, label, icon: Icon }) => (
              <li key={to} className="shrink-0">
                <Link
                  to={to}
                  activeOptions={{ exact: to === "/" }}
                  className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  activeProps={{
                    className: "bg-sidebar-accent text-sidebar-foreground font-semibold",
                    "aria-current": "page",
                  }}
                >
                  <Icon aria-hidden="true" className="size-4" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <main id="main" tabIndex={-1} className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-4xl">{children}</div>
        <footer className="mx-auto mt-16 max-w-4xl border-t pt-4 text-xs text-muted-foreground">
          Heuristic analysis only — not a guarantee of safety. Never share passwords, PINs or OTPs
          with anyone.
        </footer>
      </main>
    </div>
  );
}
