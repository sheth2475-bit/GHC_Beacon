import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Calendar, Trash2 } from "lucide-react";
import type { Meeting, Department, ActionItem } from "@shared/schema";

export default function MeetingsPage() {
  const { toast } = useToast();
  const { data: meetings, isLoading } = useQuery<Meeting[]>({ queryKey: ["/api/meetings"] });
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
      toast({ title: "Created", description: "Meeting added" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/meetings/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      toast({ title: "Deleted" });
    },
  });

  const getDeptName = (deptId: number | null) => departments?.find(d => d.id === deptId)?.name || "-";
  const getMeetingActions = (meetingId: number) => (actions || []).filter(a => a.meetingId === meetingId);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-meetings-title">Meetings</h1>
          <p className="text-muted-foreground">Manage meetings and linked action items</p>
        </div>
        <Button onClick={() => setShowDialog(true)} data-testid="button-new-meeting">
          <Plus className="h-4 w-4 mr-2" />New Meeting
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (meetings || []).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No meetings yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {(meetings || []).map(meeting => {
            const meetingActions = getMeetingActions(meeting.id);
            return (
              <Card key={meeting.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-semibold text-sm" data-testid={`text-meeting-${meeting.id}`}>{meeting.title}</h3>
                        <Badge variant="secondary">{meeting.meetingDate}</Badge>
                        <Badge variant="secondary">{getDeptName(meeting.departmentId)}</Badge>
                      </div>
                      {meeting.summary && <p className="text-sm text-muted-foreground">{meeting.summary}</p>}
                      {meetingActions.length > 0 && (
                        <div className="mt-3 space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Linked Actions ({meetingActions.length})</p>
                          {meetingActions.map(a => (
                            <div key={a.id} className="flex items-center gap-2 text-xs">
                              <span className="font-medium">{a.title}</span>
                              <Badge variant="secondary" className="text-xs">{a.status}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(meeting.id)} data-testid={`button-delete-meeting-${meeting.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Meeting</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Meeting title" data-testid="input-meeting-title" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date</Label>
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
              <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Meeting notes..." data-testid="input-meeting-summary" />
            </div>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !title || !meetingDate} className="w-full" data-testid="button-create-meeting">
              Create Meeting
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
