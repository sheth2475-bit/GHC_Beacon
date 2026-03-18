import { useQuery } from "@tanstack/react-query";
import { OwnerLayout } from "@/components/owner-layout";
import { Card } from "@/components/ui/card";
import { FileText, Loader2, ShieldCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function OwnerAudit() {
  const { data: logs = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/owner/audit"],
  });

  return (
    <OwnerLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-white" data-testid="text-audit-title">Audit Log</h1>
          <p className="text-sm text-gray-400 mt-0.5">All platform owner actions</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          </div>
        ) : (
          <Card className="bg-gray-900 border-white/10">
            <div className="divide-y divide-white/5">
              {logs.length === 0 ? (
                <div className="flex flex-col items-center py-12 gap-3">
                  <FileText className="h-8 w-8 text-gray-600" />
                  <p className="text-sm text-gray-500">No audit entries yet</p>
                </div>
              ) : (
                logs.map((l: any, i: number) => (
                  <div key={i} className="flex items-start gap-4 px-5 py-3.5">
                    <div className="h-7 w-7 rounded-lg bg-blue-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">
                        <span className="font-medium">{l.action}</span>
                        {l.targetType && <span className="text-gray-400"> on {l.targetType}</span>}
                      </p>
                      {l.details && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{typeof l.details === "object" ? JSON.stringify(l.details) : l.details}</p>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 flex-shrink-0">
                      {formatDistanceToNow(new Date(l.createdAt), { addSuffix: true })}
                    </p>
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
