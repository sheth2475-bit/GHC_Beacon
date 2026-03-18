import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { OwnerLayout } from "@/components/owner-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Key, Plus, Copy, Trash2, CheckCircle, Clock, XCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

const planConfig = {
  Trial:      { maxUsers: 5,   dailyAiLimit: 15,  color: "bg-gray-700/60 text-gray-300" },
  Starter:    { maxUsers: 20,  dailyAiLimit: 20,  color: "bg-blue-900/50 text-blue-300" },
  Growth:     { maxUsers: 50,  dailyAiLimit: 75,  color: "bg-emerald-900/50 text-emerald-300" },
  Enterprise: { maxUsers: 500, dailyAiLimit: 999, color: "bg-purple-900/50 text-purple-300" },
};

const statusIcon: Record<string, JSX.Element> = {
  Pending: <Clock className="h-3.5 w-3.5 text-amber-400" />,
  Active:  <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />,
  Revoked: <XCircle className="h-3.5 w-3.5 text-red-400" />,
};

export default function OwnerKeys() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [planName, setPlanName] = useState<string>("Starter");
  const [expiryDays, setExpiryDays] = useState("30");
  const [creating, setCreating] = useState(false);

  const { data: keys = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/owner/keys"],
  });

  const revokeMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/owner/keys/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/owner/keys"] });
      toast({ title: "Key revoked" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleCreate = async () => {
    setCreating(true);
    try {
      const plan = planConfig[planName as keyof typeof planConfig];
      const expiresAt = expiryDays !== "never"
        ? new Date(Date.now() + Number(expiryDays) * 86400000).toISOString()
        : null;
      await apiRequest("POST", "/api/owner/keys", {
        planName,
        maxUsers: plan.maxUsers,
        dailyAiLimit: plan.dailyAiLimit,
        expiresAt,
      });
      qc.invalidateQueries({ queryKey: ["/api/owner/keys"] });
      toast({ title: "Key created successfully" });
      setShowCreate(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const copyKey = (val: string) => {
    navigator.clipboard.writeText(val);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <OwnerLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-white" data-testid="text-keys-title">Activation Keys</h1>
            <p className="text-sm text-gray-400 mt-0.5">{keys.length} keys generated</p>
          </div>
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-sm"
            data-testid="button-create-key"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Generate Key
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          </div>
        ) : (
          <Card className="bg-gray-900 border-white/10">
            <div className="divide-y divide-white/5">
              {keys.length === 0 ? (
                <div className="flex flex-col items-center py-12 gap-3">
                  <Key className="h-8 w-8 text-gray-600" />
                  <p className="text-sm text-gray-500">No keys yet — generate one to get started</p>
                </div>
              ) : (
                keys.map((k: any) => (
                  <div key={k.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-sm text-white font-mono bg-gray-800 px-2 py-0.5 rounded border border-white/10">
                          {k.keyValue}
                        </code>
                        <button
                          onClick={() => copyKey(k.keyValue)}
                          className="text-gray-500 hover:text-gray-300"
                          data-testid={`button-copy-key-${k.id}`}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${planConfig[k.planName as keyof typeof planConfig]?.color || "bg-gray-700 text-gray-300"}`}>
                          {k.planName}
                        </span>
                        <span className="text-xs text-gray-500">
                          {k.maxUsers} users · {k.dailyAiLimit} AI/day
                        </span>
                        {k.expiresAt && (
                          <span className="text-xs text-gray-600">
                            Expires {format(new Date(k.expiresAt), "MMM d, yyyy")}
                          </span>
                        )}
                        {k.companyId && (
                          <span className="text-xs text-blue-400">Used by company #{k.companyId}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        {statusIcon[k.status] || statusIcon.Pending}
                        {k.status}
                      </div>
                      <span className="text-xs text-gray-600">
                        {k.issuedAt ? formatDistanceToNow(new Date(k.issuedAt), { addSuffix: true }) : "just now"}
                      </span>
                      {k.status === "Pending" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => revokeMut.mutate(k.id)}
                          disabled={revokeMut.isPending}
                          className="h-7 w-7 p-0 text-gray-500 hover:text-red-400 hover:bg-red-900/20"
                          data-testid={`button-revoke-key-${k.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-gray-900 border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Generate Activation Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">Plan</Label>
              <Select value={planName} onValueChange={setPlanName}>
                <SelectTrigger className="bg-gray-800 border-white/10 text-white" data-testid="select-key-plan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-white/10">
                  {Object.keys(planConfig).map(p => (
                    <SelectItem key={p} value={p} className="text-white">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {planName && (
                <p className="text-xs text-gray-500">
                  {planConfig[planName as keyof typeof planConfig]?.maxUsers} users · {planConfig[planName as keyof typeof planConfig]?.dailyAiLimit} AI requests/day
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">Expiry</Label>
              <Select value={expiryDays} onValueChange={setExpiryDays}>
                <SelectTrigger className="bg-gray-800 border-white/10 text-white" data-testid="select-key-expiry">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-white/10">
                  <SelectItem value="7" className="text-white">7 days</SelectItem>
                  <SelectItem value="14" className="text-white">14 days</SelectItem>
                  <SelectItem value="30" className="text-white">30 days</SelectItem>
                  <SelectItem value="90" className="text-white">90 days</SelectItem>
                  <SelectItem value="365" className="text-white">1 year</SelectItem>
                  <SelectItem value="never" className="text-white">Never expires</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-gray-400">Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-confirm-create-key"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OwnerLayout>
  );
}
