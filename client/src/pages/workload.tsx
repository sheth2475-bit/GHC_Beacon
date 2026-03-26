import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Users, AlertTriangle, CheckCircle2, Activity, Target, BarChart3 } from "lucide-react";
import type { Task } from "@shared/schema";
import { formatDate } from "@/lib/utils";

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
  return "bg-gray-300";
}

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function avatarColor(name: string) {
  const colors = [
    "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

function StackedBar({ total, notStarted, inProgress, completed, overdue }: {
  total: number; notStarted: number; inProgress: number; completed: number; overdue: number;
}) {
  if (total === 0) return <div className="h-3 rounded-full bg-muted" />;
  const pct = (n: number) => `${Math.round((n / total) * 100)}%`;
  return (
    <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
      {completed > 0 && <div className="bg-emerald-500 rounded-l transition-all" style={{ width: pct(completed) }} title={`${completed} completed`} />}
      {inProgress > 0 && <div className="bg-violet-500 transition-all" style={{ width: pct(inProgress) }} title={`${inProgress} in progress`} />}
      {notStarted > 0 && <div className="bg-muted-foreground/25 transition-all" style={{ width: pct(notStarted) }} title={`${notStarted} not started`} />}
      {overdue > 0 && <div className="bg-red-500 rounded-r transition-all" style={{ width: pct(overdue) }} title={`${overdue} overdue`} />}
    </div>
  );
}

export default function WorkloadPage() {
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);

  const { data: workload = [], isLoading } = useQuery<WorkloadEntry[]>({
    queryKey: ["/api/workload"],
  });

  const totalTasks = workload.reduce((a, b) => a + b.total, 0);
  const totalOverdue = workload.reduce((a, b) => a + b.overdue, 0);
  const totalCompleted = workload.reduce((a, b) => a + b.completed, 0);
  const totalActive = workload.reduce((a, b) => a + b.inProgress, 0);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2.5">
          <Users className="h-6 w-6 text-primary" /> Team Workload
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Initiative and action item distribution by team member</p>
      </div>

      {/* Summary stats */}
      {!isLoading && workload.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-primary/10"><Users className="h-3.5 w-3.5 text-primary" /></div>
                <p className="text-xs text-muted-foreground font-medium">Team Members</p>
              </div>
              <p className="text-2xl font-bold tabular-nums">{workload.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30"><Target className="h-3.5 w-3.5 text-blue-600" /></div>
                <p className="text-xs text-muted-foreground font-medium">Total Initiatives</p>
              </div>
              <p className="text-2xl font-bold tabular-nums">{totalTasks}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/30"><Activity className="h-3.5 w-3.5 text-violet-600" /></div>
                <p className="text-xs text-muted-foreground font-medium">In Progress</p>
              </div>
              <p className="text-2xl font-bold tabular-nums text-violet-600 dark:text-violet-400">{totalActive}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30"><AlertTriangle className="h-3.5 w-3.5 text-red-600" /></div>
                <p className="text-xs text-muted-foreground font-medium">Overdue</p>
              </div>
              <p className="text-2xl font-bold tabular-nums text-red-600 dark:text-red-400">{totalOverdue}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Legend */}
      {!isLoading && workload.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Bar legend:</span>
          {[
            { color: "bg-emerald-500", label: "Completed" },
            { color: "bg-violet-500", label: "In Progress" },
            { color: "bg-muted-foreground/25", label: "Not Started" },
            { color: "bg-red-500", label: "Overdue" },
          ].map(l => (
            <span key={l.label} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-sm ${l.color}`} />
              {l.label}
            </span>
          ))}
        </div>
      )}

      {/* Workload cards */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-36" />)}
        </div>
      ) : workload.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-base">No initiatives assigned yet</p>
              <p className="text-sm text-muted-foreground mt-1">Create initiatives and assign them to team members to see workload distribution.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {workload.map(person => {
            const completedPct = person.total > 0 ? Math.round((person.completed / person.total) * 100) : 0;
            const isExpanded = expandedPerson === person.name;

            return (
              <Card
                key={person.name}
                className="hover:shadow-sm transition-shadow"
                data-testid={`card-workload-${person.name.replace(/\s+/g, "-").toLowerCase()}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${avatarColor(person.name)}`}>
                      {initials(person.name)}
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <div>
                          <p className="font-semibold text-sm" data-testid={`text-workload-name-${person.name.replace(/\s+/g, "-").toLowerCase()}`}>
                            {person.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{person.total} initiatives · {completedPct}% complete</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                          {person.overdue > 0 && (
                            <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-medium flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> {person.overdue} overdue
                            </span>
                          )}
                          <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium">
                            {person.completed} done
                          </span>
                          <span className="text-xs px-2 py-1 rounded-full bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400 font-medium">
                            {person.inProgress} active
                          </span>
                          <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground font-medium">
                            {person.notStarted} queued
                          </span>
                        </div>
                      </div>

                      {/* Stacked bar */}
                      <StackedBar
                        total={person.total}
                        notStarted={person.notStarted}
                        inProgress={person.inProgress}
                        completed={person.completed}
                        overdue={person.overdue}
                      />

                      {/* Task list */}
                      {person.tasks.length > 0 && (
                        <div className="mt-3">
                          <button
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                            onClick={() => setExpandedPerson(isExpanded ? null : person.name)}
                            data-testid={`button-expand-${person.name.replace(/\s+/g, "-").toLowerCase()}`}
                          >
                            <BarChart3 className="h-3 w-3" />
                            {isExpanded ? "Hide" : "Show"} initiatives ({person.tasks.length})
                          </button>

                          {isExpanded && (
                            <div className="mt-2 space-y-1 border-t border-border/40 pt-2">
                              {person.tasks.map(t => (
                                <div
                                  key={t.id}
                                  className="flex items-center gap-2.5 text-xs py-1.5 border-b border-border/30 last:border-0"
                                  data-testid={`row-task-${t.id}`}
                                >
                                  <span className={`h-2 w-2 rounded-full shrink-0 ${priorityDot(t.priority)}`} />
                                  <span className="flex-1 truncate text-foreground font-medium">{t.title}</span>
                                  {t.dueDate && (
                                    <span className={`shrink-0 tabular-nums ${
                                      t.status !== "Completed" && t.dueDate < new Date().toISOString().split("T")[0]
                                        ? "text-red-500 font-semibold"
                                        : "text-muted-foreground"
                                    }`}>
                                      {formatDate(t.dueDate)}
                                    </span>
                                  )}
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${statusPill(t.status)}`}>
                                    {t.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {!isLoading && workload.length > 0 && totalCompleted > 0 && (
        <Card className="bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p className="text-sm text-emerald-800 dark:text-emerald-200">
              <span className="font-semibold">{totalCompleted} initiatives completed</span> across {workload.length} team members.
              {totalOverdue > 0 && ` ${totalOverdue} initiative${totalOverdue !== 1 ? "s" : ""} require immediate attention.`}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
