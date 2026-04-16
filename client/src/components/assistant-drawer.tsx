import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  X, Send, Bot, User, Sparkles, ChevronRight, CheckCircle2,
  AlertCircle, Loader2, Lightbulb, RotateCcw, Check, XCircle,
  TrendingDown, BarChart2, ArrowRight, ExternalLink, Users, Target,
  Zap, FileText, TrendingUp, AlertTriangle, Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface PendingAction {
  type: string;
  label: string;
  data: Record<string, any>;
}

interface ResponseLink {
  label: string;
  url: string;
}

interface QuickAction {
  label: string;
  pendingAction: PendingAction;
}

interface AssistantResponse {
  type: "answer" | "question" | "confirmation" | "success" | "error";
  message: string;
  links?: ResponseLink[];
  quickActions?: QuickAction[];
  pendingAction?: PendingAction | null;
}

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  type?: AssistantResponse["type"];
  links?: ResponseLink[];
  quickActions?: QuickAction[];
  pendingAction?: PendingAction | null;
  isLoading?: boolean;
}

const SUGGESTED_PROMPTS = [
  { icon: TrendingDown, label: "Which KPIs are below target this month?", color: "text-red-500", category: "Scorecard" },
  { icon: BarChart2, label: "Summarize my latest analytics dashboard", color: "text-blue-500", category: "Analytics" },
  { icon: Target, label: "What is our overall weighted performance score?", color: "text-primary", category: "Scorecard" },
  { icon: TrendingUp, label: "Show KPI trends for the Financial perspective", color: "text-emerald-500", category: "Scorecard" },
  { icon: AlertTriangle, label: "Which KPIs are at risk of missing targets?", color: "text-amber-500", category: "Scorecard" },
  { icon: Users, label: "Which department has the lowest performance score?", color: "text-cyan-500", category: "Scorecard" },
];

function parseMarkdown(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/^### (.*)/gm, "<h4 class='font-semibold text-sm mt-3 mb-1'>$1</h4>")
    .replace(/^## (.*)/gm, "<h3 class='font-semibold text-sm mt-3 mb-1'>$1</h3>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^(\d+)\. (.*)/gm, "<li class='ml-4 list-decimal'>$2</li>")
    .replace(/^- (.*)/gm, "<li class='ml-4 list-disc'>$1</li>")
    .replace(/(<li[^>]*>.*?<\/li>)(\s*<li[^>]*>.*?<\/li>)*/gs, (match) =>
      `<ul class='space-y-0.5 my-1.5 pl-1'>${match}</ul>`
    )
    .replace(/\n/g, "<br/>");
}

function LinkButton({ link, onNavigate }: { link: ResponseLink; onNavigate: (url: string) => void }) {
  return (
    <button
      onClick={() => onNavigate(link.url)}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-primary/25 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 text-xs text-primary font-medium transition-all group"
    >
      <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100" />
      {link.label}
    </button>
  );
}

function QuickActionButton({ qa, onQuickAction }: { qa: QuickAction; onQuickAction: (a: PendingAction) => void }) {
  return (
    <button
      onClick={() => onQuickAction(qa.pendingAction)}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-accent hover:border-border/80 text-xs text-foreground/75 hover:text-foreground font-medium transition-all"
    >
      <Zap className="h-3 w-3 text-amber-500" />
      {qa.label}
    </button>
  );
}

function MessageBubble({ msg, onConfirm, onCancel, isConfirming, onNavigate, onQuickAction }: {
  msg: DisplayMessage;
  onConfirm?: () => void;
  onCancel?: () => void;
  isConfirming?: boolean;
  onNavigate: (url: string) => void;
  onQuickAction: (action: PendingAction) => void;
}) {
  if (msg.isLoading) {
    return (
      <div className="flex gap-2.5 items-start">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Bot className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="flex items-center gap-2 bg-muted rounded-2xl rounded-tl-sm px-3.5 py-2.5">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Thinking…</span>
        </div>
      </div>
    );
  }

  if (msg.role === "user") {
    return (
      <div className="flex gap-2.5 items-start justify-end">
        <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-3.5 py-2">
          <p className="text-xs leading-relaxed">{msg.content}</p>
        </div>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <User className="h-3.5 w-3.5 text-primary" />
        </div>
      </div>
    );
  }

  const isConfirmation = msg.type === "confirmation" && msg.pendingAction;
  const isSuccess = msg.type === "success";
  const isError = msg.type === "error";
  const isQuestion = msg.type === "question";

  return (
    <div className="flex gap-2.5 items-start">
      <div className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
        isSuccess ? "bg-green-100 dark:bg-green-900/30" :
        isError ? "bg-red-100 dark:bg-red-900/30" :
        "bg-primary/10"
      )}>
        {isSuccess ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> :
         isError ? <AlertCircle className="h-3.5 w-3.5 text-red-500" /> :
         isQuestion ? <Lightbulb className="h-3.5 w-3.5 text-amber-500" /> :
         <Bot className="h-3.5 w-3.5 text-primary" />}
      </div>
      <div className="flex-1 max-w-[88%] space-y-1.5">
        <div className={cn(
          "rounded-2xl rounded-tl-sm px-3.5 py-2.5",
          isSuccess ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" :
          isError ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800" :
          isQuestion ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900" :
          "bg-muted"
        )}>
          <div
            className="text-xs leading-relaxed"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }}
          />
        </div>

        {msg.links && msg.links.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pl-0.5">
            {msg.links.map((link, i) => (
              <LinkButton key={i} link={link} onNavigate={onNavigate} />
            ))}
          </div>
        )}

        {msg.quickActions && msg.quickActions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pl-0.5">
            {msg.quickActions.map((qa, i) => (
              <QuickActionButton key={i} qa={qa} onQuickAction={onQuickAction} />
            ))}
          </div>
        )}

        {isConfirmation && msg.pendingAction && (
          <div className="border border-border rounded-xl overflow-hidden bg-background shadow-sm">
            <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-3.5 py-2 flex items-center gap-2">
              <Lightbulb className="h-3 w-3 text-amber-600" />
              <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Confirm Action</span>
            </div>
            <div className="px-3.5 py-2.5">
              <p className="text-xs text-foreground font-medium mb-2">{msg.pendingAction.label}</p>
              <div className="space-y-1 bg-muted/50 rounded-lg px-2.5 py-1.5">
                {Object.entries(msg.pendingAction.data)
                  .filter(([k]) => !["companyId"].includes(k))
                  .slice(0, 8)
                  .map(([key, val]) => (
                    <div key={key} className="flex items-start gap-2 text-[10px] text-muted-foreground">
                      <ArrowRight className="h-2.5 w-2.5 shrink-0 mt-0.5" />
                      <span className="font-medium text-foreground/70 capitalize min-w-[72px]">
                        {key.replace(/([A-Z])/g, " $1").trim()}:
                      </span>
                      <span className="text-foreground/90">{String(val)}</span>
                    </div>
                  ))}
              </div>
            </div>
            <div className="px-3.5 py-2.5 border-t border-border flex gap-2">
              <Button size="sm" className="flex-1 h-7 text-xs gap-1" onClick={onConfirm} disabled={isConfirming} data-testid="button-assistant-confirm">
                {isConfirming ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                Confirm
              </Button>
              <Button size="sm" variant="outline" className="flex-1 h-7 text-xs gap-1" onClick={onCancel} disabled={isConfirming} data-testid="button-assistant-cancel">
                <XCircle className="h-3 w-3" />
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface AssistantDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function AssistantDrawer({ open, onClose }: AssistantDrawerProps) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [apiMessages, setApiMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pendingConfirmation, setPendingConfirmation] = useState<{ msgId: string; action: PendingAction } | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const idCounter = useRef(0);
  const nextId = useCallback(() => `msg-${++idCounter.current}`, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  useEffect(() => {
    if (open && !minimized) {
      scrollToBottom();
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open, minimized, messages.length, scrollToBottom]);

  // Reset minimized when re-opened
  useEffect(() => {
    if (open) setMinimized(false);
  }, [open]);

  const handleNavigate = useCallback((url: string) => {
    navigate(url);
    onClose();
  }, [navigate, onClose]);

  const chatMutation = useMutation({
    mutationFn: async (payload: { messages: ChatMessage[]; confirmedAction?: PendingAction }) => {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.status === 429 && data.type === "limit_reached") {
        return { type: "error", message: data.message, links: [{ label: "Go to Settings", url: "/settings" }] } as AssistantResponse;
      }
      if (!res.ok) throw new Error(data.message || "Request failed");
      return data as AssistantResponse;
    },
  });

  const addLoadingMsg = useCallback((): string => {
    const id = nextId();
    setMessages(prev => [...prev, { id, role: "assistant", content: "", isLoading: true }]);
    return id;
  }, [nextId]);

  const replaceLoadingMsg = useCallback((id: string, response: AssistantResponse) => {
    setMessages(prev => prev.map(m =>
      m.id === id
        ? { ...m, isLoading: false, content: response.message, type: response.type, links: response.links || [], quickActions: response.quickActions || [], pendingAction: response.pendingAction }
        : m
    ));
    if (response.type === "confirmation" && response.pendingAction) {
      setPendingConfirmation({ msgId: id, action: response.pendingAction });
    }
    scrollToBottom();
  }, [scrollToBottom]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || chatMutation.isPending || isConfirming) return;
    setPendingConfirmation(null);
    if (minimized) setMinimized(false);

    const userDisplay: DisplayMessage = { id: nextId(), role: "user", content: text };
    setMessages(prev => [...prev, userDisplay]);

    const newApiMessages: ChatMessage[] = [...apiMessages, { role: "user", content: text }];
    setApiMessages(newApiMessages);
    setInput("");
    scrollToBottom();

    const loadingId = addLoadingMsg();
    try {
      const response = await chatMutation.mutateAsync({ messages: newApiMessages });
      replaceLoadingMsg(loadingId, response);
      if (response.message) {
        setApiMessages(prev => [...prev, { role: "assistant", content: response.message }]);
      }
    } catch {
      replaceLoadingMsg(loadingId, { type: "error", message: "Sorry, something went wrong. Please try again.", links: [] });
    }
  }, [chatMutation, apiMessages, isConfirming, minimized, addLoadingMsg, replaceLoadingMsg, scrollToBottom, nextId]);

  const handleConfirm = useCallback(async () => {
    if (!pendingConfirmation) return;
    setIsConfirming(true);
    const capturedAction = pendingConfirmation.action;
    setPendingConfirmation(null);
    const loadingId = addLoadingMsg();
    try {
      const response = await chatMutation.mutateAsync({ messages: apiMessages, confirmedAction: capturedAction });
      replaceLoadingMsg(loadingId, response);
      if (response.type === "success") {
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        queryClient.invalidateQueries({ queryKey: ["/api/action-items"] });
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        queryClient.invalidateQueries({ queryKey: ["/api/kpis"] });
        queryClient.invalidateQueries({ queryKey: ["/api/milestones"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard-stats"] });
        queryClient.invalidateQueries({ queryKey: ["/api/portfolio/stats"] });
      }
    } catch {
      replaceLoadingMsg(loadingId, { type: "error", message: "Action failed. Please try again.", links: [] });
    } finally {
      setIsConfirming(false);
    }
  }, [pendingConfirmation, chatMutation, apiMessages, addLoadingMsg, replaceLoadingMsg]);

  const handleQuickAction = useCallback((action: PendingAction) => {
    const msgId = nextId();
    setMessages(prev => [...prev, { id: msgId, role: "assistant", content: action.label, type: "confirmation", links: [], quickActions: [], pendingAction: action }]);
    setPendingConfirmation({ msgId, action });
    scrollToBottom();
  }, [nextId, scrollToBottom]);

  const handleCancel = useCallback(() => {
    setPendingConfirmation(null);
    setMessages(prev => [...prev, { id: nextId(), role: "assistant", content: "Cancelled. No changes were made.", type: "answer", links: [], quickActions: [] }]);
    scrollToBottom();
  }, [scrollToBottom, nextId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setApiMessages([]);
    setPendingConfirmation(null);
    setInput("");
  };

  const isEmpty = messages.length === 0;

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed bottom-5 right-5 z-50 flex flex-col bg-background border border-border rounded-2xl shadow-2xl transition-all duration-200 ease-out",
        "w-[360px]",
        minimized ? "h-auto" : "h-[560px]",
        open ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4 pointer-events-none"
      )}
      role="dialog"
      aria-label="GHC Beacon Assistant"
      style={{ transformOrigin: "bottom right" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border rounded-t-2xl bg-background shrink-0">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
          <Sparkles className="h-[14px] w-[14px] text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xs font-semibold tracking-tight" data-testid="text-assistant-title">
            Beacon Assistant
          </h2>
          <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
            {user?.role === "admin" ? "Full access · read & write" : "Read-only mode"}
          </p>
        </div>
        <div className="flex items-center gap-0.5">
          {messages.length > 0 && !minimized && (
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleReset} title="New conversation" data-testid="button-assistant-reset">
              <RotateCcw className="h-3 w-3" />
            </Button>
          )}
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setMinimized(v => !v)} title={minimized ? "Expand" : "Minimise"} data-testid="button-assistant-minimise">
            <Minus className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose} data-testid="button-assistant-close">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Body — hidden when minimised */}
      {!minimized && (
        <>
          {/* Messages */}
          <ScrollArea className="flex-1 px-3.5 py-3 min-h-0">
            {isEmpty ? (
              <div className="space-y-4">
                <div className="text-center space-y-1.5 pt-1">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 mx-auto">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold">
                    Hi{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!
                  </h3>
                  <p className="text-[11px] text-muted-foreground max-w-[260px] mx-auto leading-relaxed">
                    Ask me anything about your analytics dashboards or scorecard performance.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold px-0.5">
                    Suggested questions
                  </p>
                  <div className="grid grid-cols-1 gap-1">
                    {SUGGESTED_PROMPTS.map((p) => (
                      <button
                        key={p.label}
                        onClick={() => sendMessage(p.label)}
                        className="flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl border border-border hover:bg-muted/60 hover:border-primary/30 transition-all group"
                        data-testid={`button-prompt-${p.label.toLowerCase().replace(/\s+/g, "-").slice(0, 35)}`}
                      >
                        <p.icon className={cn("h-3.5 w-3.5 shrink-0", p.color)} />
                        <span className="text-[11px] text-foreground/80 group-hover:text-foreground flex-1 leading-snug">{p.label}</span>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-normal opacity-60 shrink-0">
                          {p.category}
                        </Badge>
                        <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    onConfirm={pendingConfirmation?.msgId === msg.id ? handleConfirm : undefined}
                    onCancel={pendingConfirmation?.msgId === msg.id ? handleCancel : undefined}
                    isConfirming={isConfirming}
                    onNavigate={handleNavigate}
                    onQuickAction={handleQuickAction}
                  />
                ))}
                <div ref={bottomRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="border-t border-border px-3.5 py-2.5 bg-background rounded-b-2xl shrink-0 space-y-1.5">
            <div className="flex gap-2 items-end">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything…"
                rows={1}
                className="resize-none text-xs min-h-[36px] max-h-[100px] flex-1 rounded-xl leading-5"
                style={{ height: "auto" }}
                data-testid="input-assistant-message"
                disabled={chatMutation.isPending || isConfirming}
              />
              <Button
                size="icon"
                className="h-9 w-9 shrink-0 rounded-xl"
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || chatMutation.isPending || isConfirming}
                data-testid="button-assistant-send"
              >
                {chatMutation.isPending || isConfirming
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Send className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </>
      )}
    </div>
  );
}
