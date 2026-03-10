import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  "On Track": "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  "Green": "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  "Completed": "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  "Amber": "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  "At Risk": "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  "In Progress": "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  "Below Target": "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
  "Red": "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
  "Delayed": "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
  "Cancelled": "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700",
  "Not Started": "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700",
};

const priorityStyles: Record<string, string> = {
  "Critical": "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
  "High": "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800",
  "Medium": "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  "Low": "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700",
};

interface StatusBadgeProps {
  status: string | null;
  className?: string;
  testId?: string;
}

export function StatusBadge({ status, className, testId }: StatusBadgeProps) {
  const style = statusStyles[status || ""] || "bg-muted text-muted-foreground";
  return (
    <Badge variant="outline" className={cn("font-medium border", style, className)} data-testid={testId}>
      {status || "Unknown"}
    </Badge>
  );
}

export function PriorityBadge({ status, className, testId }: StatusBadgeProps) {
  const style = priorityStyles[status || ""] || "bg-muted text-muted-foreground";
  return (
    <Badge variant="outline" className={cn("font-medium border", style, className)} data-testid={testId}>
      {status || "Medium"}
    </Badge>
  );
}
