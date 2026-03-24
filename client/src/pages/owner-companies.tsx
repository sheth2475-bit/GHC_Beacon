import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { OwnerLayout } from "@/components/owner-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Search, Users, Bot, ChevronRight, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const planColors: Record<string, string> = {
  Trial: "bg-gray-700/60 text-gray-300",
  Starter: "bg-blue-900/50 text-blue-300",
  Growth: "bg-emerald-900/50 text-emerald-300",
  Enterprise: "bg-purple-900/50 text-purple-300",
};

export default function OwnerCompanies() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [actionId, setActionId] = useState<number | null>(null);

  const { data: companies = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/owner/companies"],
  });

  const activateMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/owner/companies/${id}/activate`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/owner/companies"] });
      toast({ title: "Company activated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    onSettled: () => setActionId(null),
  });

  const suspendMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/owner/companies/${id}/suspend`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/owner/companies"] });
      toast({ title: "Company suspended" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    onSettled: () => setActionId(null),
  });

  const filtered = companies.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <OwnerLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-white" data-testid="text-companies-title">Company Management</h1>
            <p className="text-sm text-gray-400 mt-0.5">{companies.length} companies registered</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search companies..."
              className="pl-8 w-52 bg-gray-800 border-white/10 text-white placeholder:text-gray-500 text-sm h-8"
              data-testid="input-company-search"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          </div>
        ) : (
          <Card className="bg-gray-900 border-white/10">
            <div className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Building2 className="h-8 w-8 text-gray-600" />
                  <p className="text-sm text-gray-500">No companies found</p>
                </div>
              ) : (
                filtered.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/3 transition-colors">
                    <div className="h-9 w-9 rounded-lg bg-gray-800 border border-white/10 flex items-center justify-center text-sm font-bold text-gray-300 flex-shrink-0">
                      {c.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-white truncate">{c.name}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${planColors[c.planName] || planColors.Trial}`}>
                          {c.planName || "Trial"}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${c.status === "Active" || !c.status ? "bg-emerald-900/40 text-emerald-400" : "bg-red-900/40 text-red-400"}`}>
                          {c.status || "Active"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {c.email && <span>{c.email}</span>}
                        {c.industry && <span className="text-gray-600"> · {c.industry}</span>}
                        {c.country && <span className="text-gray-600"> · {c.country}</span>}
                        {c.companySize && <span className="text-gray-600"> · {c.companySize}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {c.userCount || 0} users
                      </span>
                      <span className="flex items-center gap-1">
                        <Bot className="h-3 w-3" />
                        {c.aiToday || 0} AI today
                      </span>
                      {c.createdAt && (
                        <span className="hidden lg:block">
                          {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {c.status === "Suspended" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setActionId(c.id); activateMut.mutate(c.id); }}
                          disabled={activateMut.isPending && actionId === c.id}
                          className="h-7 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/20"
                          data-testid={`button-activate-company-${c.id}`}
                        >
                          {activateMut.isPending && actionId === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                          Activate
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setActionId(c.id); suspendMut.mutate(c.id); }}
                          disabled={suspendMut.isPending && actionId === c.id}
                          className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          data-testid={`button-suspend-company-${c.id}`}
                        >
                          {suspendMut.isPending && actionId === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3.5 w-3.5 mr-1" />}
                          Suspend
                        </Button>
                      )}
                      <Link href={`/owner/companies/${c.id}`}>
                        <a>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-500 hover:text-white" data-testid={`button-view-company-${c.id}`}>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </a>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}
      </div>
    </OwnerLayout>
  );
}
