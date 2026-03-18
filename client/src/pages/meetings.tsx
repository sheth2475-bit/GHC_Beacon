import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { LoadingCards } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import { StatusBadge } from "@/components/status-badge";
import { Plus, Calendar, Trash2 } from "lucide-react";
import type { Meeting, Department, ActionItem } from "@shared/schema";

export default function MeetingsPage() {
  const { toast } = useToast();
  const { data: meetings, isLoading, error, refetch } = useQuery<Meeting[]>({ queryKey: ["/api/meetings"] });
  const { data: departments } = useQuery<Department[]>({ queryKey: ["/api/departments"] });
  const { data: actions } = useQuery<ActionItem[]>({ queryKey: ["/api/action-items"] });
  const [showDialog, setShowDialog] = useState(false);
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [deptId, setDeptId] = useState("");
  const [summary, setSummary] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/meetings", {
        title, meetingDate, summary,
        departmentId: deptId ? parseInt(deptId) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      setShowDialog(false);
      setTitle(""); setMeetingDate(""); setDeptId(""); setSummary("");
      toast({ title: "Meeting created" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/meetings/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      toast({ title: "Meeting deleted" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const getDeptName = (deptId: number | null) => departments?.find(d => d.id === deptId)?.name || "General";
  const getMeetingActions = (meetingId: number) => (actions || []).filter(a => a.meetingId === meetingId);

  if (error) return <div className="p-6"><ErrorState message="Failed to load meetings" onRetry={() => refetch()} /></div>;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-none px-6 pt-5 pb-0">
        <PageHeader
          title="Meetings"
          description="Manage meetings and linked action items"
          icon={Calendar}
          testId="text-meetings-title"
          actions={
            <Button onClick={() => setShowDialog(true)} data-testid="button-new-meeting">
              <Plus className="h-4 w-4 mr-2" />New Meeting
            </Button>
          }
        />
      </div>

      <div className="flex-1 min-h-0 overflow-auto px-6 py-4">
      {isLoading ? (
        <LoadingCards count={3} />
      ) : (meetings || []).length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No meetings recorded"
          description="Create a meeting to link action items and track decisions."
          action={{ label: "New Meeting", onClick: () => setShowDialog(true), testId: "button-empty-new-meeting" }}
        />
      ) : (
        <div className="grid gap-4">
          {(meetings || []).map(meeting => {
            const meetingActions = getMeetingActions(meeting.id);
            return (
              <Card key={meeting.id} className="hover-elevate">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm" data-testid={`text-meeting-${meeting.id}`}>{meeting.title}</h3>
                        <Badge variant="secondary" className="font-normal text-xs">{meeting.meetingDate}</Badge>
                        <Badge variant="secondary" className="font-normal text-xs">{getDeptName(meeting.departmentId)}</Badge>
                      </div>
                      {meeting.summary && (
                        <p className="text-sm text-muted-foreground leading-relaxed">{meeting.summary}</p>
                      )}
                      {meetingActions.length > 0 && (
                        <div className="pt-2 border-t space-y-1.5">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Linked Actions ({meetingActions.length})
                          </p>
                          {meetingActions.map(a => (
                            <div key={a.id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/30">
                              <span className="text-xs font-medium truncate">{a.title}</span>
                              <StatusBadge status={a.status} className="text-[10px] px-1.5 py-0" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0" onClick={() => deleteMutation.mutate(meeting.id)} data-testid={`button-delete-meeting-${meeting.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Meeting</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Meeting title" data-testid="input-meeting-title" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} data-testid="input-meeting-date" />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={deptId} onValueChange={setDeptId}>
                  <SelectTrigger data-testid="select-meeting-dept"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{(departments || []).map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Summary / Notes</Label>
              <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Key decisions and discussion points..." rows={4} data-testid="input-meeting-summary" />
            </div>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !title || !meetingDate} className="w-full" data-testid="button-create-meeting">
              {createMutation.isPending ? "Creating..." : "Create Meeting"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
