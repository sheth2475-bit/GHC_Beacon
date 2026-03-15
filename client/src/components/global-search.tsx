import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, FolderOpen, Target, ListChecks, Calendar, CheckSquare, X } from "lucide-react";

interface SearchResults {
  projects: { id: number; name: string; status: string }[];
  tasks: { id: number; title: string; status: string; projectId: number | null }[];
  kpis: { id: number; kpiName: string; departmentId: number | null }[];
  meetings: { id: number; title: string; meetingDate: string }[];
  actionItems: { id: number; title: string; status: string }[];
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (q.length < 2) { setResults(null); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { credentials: "include" });
        if (res.ok) setResults(await res.json());
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [q]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const totalResults = results
    ? results.projects.length + results.tasks.length + results.kpis.length + results.meetings.length + results.actionItems.length
    : 0;

  const goTo = (path: string) => {
    navigate(path);
    setOpen(false);
    setQ("");
    setResults(null);
  };

  if (!open) {
    return (
      <button
        className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border bg-muted/40 hover:bg-muted transition-colors text-muted-foreground"
        onClick={() => setOpen(true)}
        data-testid="button-global-search"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search...</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4" data-testid="modal-global-search">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setOpen(false); setQ(""); setResults(null); }} />
      <div className="relative bg-background rounded-xl shadow-2xl border w-full max-w-lg overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search projects, tasks, KPIs, meetings..."
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            data-testid="input-search-query"
          />
          {q && (
            <button onClick={() => { setQ(""); setResults(null); }} className="text-muted-foreground hover:text-foreground" data-testid="button-clear-search">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          {loading && <div className="py-6 text-center text-sm text-muted-foreground">Searching...</div>}
          {!loading && q.length >= 2 && results && totalResults === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">No results for "{q}"</div>
          )}
          {!loading && q.length < 2 && (
            <div className="py-6 text-center text-xs text-muted-foreground">Type at least 2 characters to search</div>
          )}

          {results && totalResults > 0 && (
            <div className="p-2">
              {results.projects.length > 0 && (
                <div>
                  <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Projects</div>
                  {results.projects.map(p => (
                    <button
                      key={p.id}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted text-left text-sm transition-colors"
                      onClick={() => goTo(`/projects/${p.id}`)}
                      data-testid={`search-result-project-${p.id}`}
                    >
                      <FolderOpen className="h-4 w-4 text-primary shrink-0" />
                      <span className="flex-1 truncate">{p.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{p.status}</span>
                    </button>
                  ))}
                </div>
              )}
              {results.tasks.length > 0 && (
                <div>
                  <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tasks</div>
                  {results.tasks.map(t => (
                    <button
                      key={t.id}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted text-left text-sm transition-colors"
                      onClick={() => t.projectId ? goTo(`/projects/${t.projectId}`) : undefined}
                      data-testid={`search-result-task-${t.id}`}
                    >
                      <CheckSquare className="h-4 w-4 text-violet-500 shrink-0" />
                      <span className="flex-1 truncate">{t.title}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{t.status}</span>
                    </button>
                  ))}
                </div>
              )}
              {results.kpis.length > 0 && (
                <div>
                  <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">KPIs</div>
                  {results.kpis.map(k => (
                    <button
                      key={k.id}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted text-left text-sm transition-colors"
                      onClick={() => goTo("/kpis")}
                      data-testid={`search-result-kpi-${k.id}`}
                    >
                      <Target className="h-4 w-4 text-amber-500 shrink-0" />
                      <span className="flex-1 truncate">{k.kpiName}</span>
                    </button>
                  ))}
                </div>
              )}
              {results.meetings.length > 0 && (
                <div>
                  <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Meetings</div>
                  {results.meetings.map(m => (
                    <button
                      key={m.id}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted text-left text-sm transition-colors"
                      onClick={() => goTo("/meetings")}
                      data-testid={`search-result-meeting-${m.id}`}
                    >
                      <Calendar className="h-4 w-4 text-blue-500 shrink-0" />
                      <span className="flex-1 truncate">{m.title}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{m.meetingDate}</span>
                    </button>
                  ))}
                </div>
              )}
              {results.actionItems.length > 0 && (
                <div>
                  <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Action Items</div>
                  {results.actionItems.map(a => (
                    <button
                      key={a.id}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted text-left text-sm transition-colors"
                      onClick={() => goTo("/actions")}
                      data-testid={`search-result-action-${a.id}`}
                    >
                      <ListChecks className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span className="flex-1 truncate">{a.title}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{a.status}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
