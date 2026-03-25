import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    testId?: string;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="relative mb-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/10 shadow-sm">
          <Icon className="h-8 w-8 text-primary/70" />
        </div>
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent blur-sm -z-10" />
      </div>
      <h3 className="text-base font-semibold mb-1.5 text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">{description}</p>
      {action && (
        <Button className="mt-5 shadow-sm" onClick={action.onClick} data-testid={action.testId}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
