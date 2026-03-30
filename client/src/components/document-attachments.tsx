import { useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Paperclip, Upload, Trash2, Download, FileText,
  FileImage, FileVideo, FileArchive, File, Loader2,
} from "lucide-react";
import type { Document } from "@shared/schema";

function fileIcon(mimeType: string | null | undefined) {
  if (!mimeType) return File;
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.startsWith("video/")) return FileVideo;
  if (mimeType.includes("pdf") || mimeType.includes("word") || mimeType.includes("text")) return FileText;
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar")) return FileArchive;
  return File;
}

function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTs(ts: Date | string | null | undefined) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

interface Props {
  entityType: "task" | "subtask" | "project" | "workflow_submission";
  entityId: number;
}

export function DocumentAttachments({ entityType, entityId }: Props) {
  const { canEdit } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const queryKey = ["/api/documents", entityType, entityId];

  const { data: docs = [], isLoading } = useQuery<Document[]>({
    queryKey,
    queryFn: () =>
      fetch(`/api/documents?entityType=${entityType}&entityId=${entityId}`, { credentials: "include" })
        .then(r => r.json()),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/documents/${id}`, { method: "DELETE", credentials: "include" }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "File deleted" });
    },
    onError: () => toast({ title: "Failed to delete file", variant: "destructive" }),
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("entityType", entityType);
      form.append("entityId", String(entityId));
      const res = await fetch("/api/documents", { method: "POST", body: form, credentials: "include" });
      if (!res.ok) throw new Error("Upload failed");
      await queryClient.invalidateQueries({ queryKey });
      toast({ title: "File uploaded successfully" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Paperclip className="h-3.5 w-3.5" />
          Attachments
          {docs.length > 0 && (
            <span className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full text-[10px]">{docs.length}</span>
          )}
        </div>
        {canEdit && (
          <>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={handleUpload}
              accept="*/*"
              data-testid="input-upload-file"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              data-testid="button-upload-file"
            >
              {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              {uploading ? "Uploading…" : "Upload"}
            </Button>
          </>
        )}
      </div>

      {/* File list */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading…
        </div>
      ) : docs.length === 0 ? (
        <p className="text-xs text-muted-foreground/60 italic">No attachments yet.</p>
      ) : (
        <div className="space-y-1.5">
          {docs.map(doc => {
            const Icon = fileIcon(doc.mimeType);
            return (
              <div
                key={doc.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/40 border border-border/50 group hover:bg-muted/60 transition-colors"
                data-testid={`doc-row-${doc.id}`}
              >
                <Icon className="h-4 w-4 text-primary/70 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate leading-tight">{doc.originalName}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatBytes(doc.size)}{doc.uploadedBy ? ` · ${doc.uploadedBy}` : ""}{doc.createdAt ? ` · ${formatTs(doc.createdAt)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={`/api/documents/${doc.id}/download`}
                    download={doc.originalName}
                    className="p-1 text-muted-foreground hover:text-primary transition-colors rounded"
                    data-testid={`button-download-doc-${doc.id}`}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                  {canEdit && (
                    <button
                      onClick={() => deleteMutation.mutate(doc.id)}
                      className="p-1 text-muted-foreground hover:text-red-500 transition-colors rounded"
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-doc-${doc.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
