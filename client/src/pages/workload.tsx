import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, AlertTriangle, CheckCircle2, Activity, Target } from "lucide-react";
import type { Task } from "@shared/schema";

interface WorkloadEntry {
  name: string;
  total: number;
  notStarted: number;
  inProgress: number;
  completed: number;
  overdue: number;
  tasks: Task[];
}

function statusPill(s: string) {
  if (s === "Completed") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
  if (s === "In Progress") return "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400";
  if (s === "Not Started") return "bg-muted text-muted-foreground";
  return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
}

function priorityDot(p: string) {
  if (p === "Critical") return "bg-red-500";
  if (p === "High") return "bg-orange-500";
  if (p === "Medium") return "bg-blue-500";
  return "bg-gray-400";
}

export default function WorkloadPage() {
  const { data: workload = [], isLoading } = useQuery<WorkloadEntry[]>({
    queryKey: ["/api/workload"],
  });

  const maxTotal = Math.max(...workload.map(w => w.total), 1);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" /> Workload View
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Task distribution and workload by team member</p>
      </div>

      {/* Summary row */}
      {!isLoading && workload.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium">Team Members</p>
              <p className="text-2xl font-bold mt-1">{workload.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium">Total Tasks</p>
              <p className="text-2xl font-bold mt-1">{workload.reduce((a, b) => a + b.total, 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-red-500" /> Overdue
              </p>
              <p className="text-2xl font-bold mt-1 text-red-600 dark:text-red-400">{workload.reduce((a, b) => a + b.overdue, 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Completed
              </p>
              <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{workload.reduce((a, b) => a + b.completed, 0)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Workload cards */}
      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : workload.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">No tasks assigned yet</p>
            <p className="text-sm text-muted-foreground">Create tasks and assign them to team members to see workload.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {workload.map(person => {
            const completedPct = person.total > 0 ? Math.round((person.completed / person.total) * 100) : 0;
            const widthPct = Math.round((person.total / maxTotal) * 100);
            return (
              <Card key={person.name} data-testid={`card-workload-${person.name.replace(/\s+/g, "-").toLowerCase()}`}>
                <CardContent className="p-5">
                  {/* Person header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                      {person.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm" data-testid={`text-workload-name-${person.name.replace(/\s+/g, "-").toLowerCase()}`}>{person.name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[200px]">
                          <div className="h-full bg-primary/70 rounded-full" style={{ width: `${widthPct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{person.total} tasks</span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground font-medium">{person.notStarted} not started</span>
                      <span className="text-xs px-2 py-1 rounded bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400 font-medium">{person.inProgress} active</span>
                      <span className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium">{person.completed} done</span>
                      {person.overdue > 0 && (
                        <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-medium flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> {person.overdue} overdue
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-4 space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Completion</span>
                      <span className="font-medium text-foreground">{completedPct}%</span>
                    </div>
                    <Progress value={completedPct} className="h-1.5" />
                  </div>

                  {/* Task list */}
                  <div className="space-y-1.5">
                    {person.tasks.slice(0, 5).map(t => (
                      <div key={t.id} className="flex items-center gap-2 text-xs py-1 border-b border-border/40 last:border-0" data-testid={`row-task-${t.id}`}>
                        <span className={`h-2 w-2 rounded-full shrink-0 ${priorityDot(t.priority)}`} />
                        <span className="flex-1 truncate text-foreground">{t.title}</span>
                        {t.dueDate && <span className="text-muted-foreground shrink-0">{t.dueDate}</span>}
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${statusPill(t.status)}`}>{t.status}</span>
                      </div>
                    ))}
                    {person.tasks.length > 5 && (
                      <p className="text-xs text-muted-foreground pt-1 pl-4">+{person.tasks.length - 5} more tasks</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
