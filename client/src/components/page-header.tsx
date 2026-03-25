import type { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  testId?: string;
}

export function PageHeader({ title, description, icon: Icon, actions, testId }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="relative mt-0.5 shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          </div>
        )}
        <div>
          <h1
            className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent"
            data-testid={testId}
          >
            {title}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{description}</p>
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
