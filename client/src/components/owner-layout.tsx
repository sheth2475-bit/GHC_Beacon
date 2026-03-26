import { useLocation, Link } from "wouter";
import { useOwnerAuth } from "@/lib/owner-auth";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Building2, Key, Activity, Bot, LogOut, FileText, Shield, LogIn, Users, BarChart2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const navGroups = [
  {
    label: "Overview",
    items: [
      { href: "/owner/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/owner/companies", label: "Companies", icon: Building2 },
      { href: "/owner/keys", label: "Activation Keys", icon: Key },
    ],
  },
  {
    label: "Analytics",
    items: [
      { href: "/owner/logins", label: "Login Analytics", icon: LogIn },
      { href: "/owner/users", label: "All Users", icon: Users },
      { href: "/owner/activity", label: "User Activity", icon: Activity },
      { href: "/owner/feature-usage", label: "Feature Usage", icon: BarChart2 },
      { href: "/owner/company-usage", label: "Company Usage", icon: TrendingUp },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/owner/ai-usage", label: "AI Usage", icon: Bot },
      { href: "/owner/audit", label: "Audit Log", icon: FileText },
    ],
  },
];

export function OwnerLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { owner, logout } = useOwnerAuth();

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      <aside className="w-60 flex-shrink-0 border-r border-white/10 flex flex-col">
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <Shield className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Performo AI</p>
              <p className="text-xs text-blue-400">Platform Control</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto">
          {navGroups.map(group => (
            <div key={group.label} className="mb-4">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider px-3 mb-1">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href}>
                    <a className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                      location === href || location.startsWith(href + "/")
                        ? "bg-blue-600/20 text-blue-400 font-medium"
                        : "text-gray-400 hover:text-white hover:bg-white/5",
                    )}>
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      {label}
                    </a>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-2 px-3 py-2 mb-1">
            <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
              {owner?.name?.[0] || "O"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{owner?.name}</p>
              <p className="text-xs text-gray-500 truncate">Platform Owner</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="w-full justify-start gap-2 text-gray-400 hover:text-white hover:bg-white/5 text-xs h-8"
            data-testid="button-owner-logout"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
