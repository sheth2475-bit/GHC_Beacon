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
  TrendingDown, ListChecks, BarChart2, FolderOpen, ClipboardList,
  ArrowRight, ExternalLink, Calendar, Users, Target, Zap, FileText,
  TrendingUp, AlertTriangle,
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
  { icon: TrendingDown, label: "Which KPIs are below target?", color: "text-red-500", category: "KPIs" },
  { icon: AlertTriangle, label: "Show all overdue actions", color: "text-amber-500", category: "Actions" },
  { icon: FolderOpen, label: "What projects are at risk?", color: "text-violet-500", category: "Projects" },
  { icon: BarChart2, label: "Summarize February performance", color: "text-blue-500", category: "Reviews" },
  { icon: TrendingUp, label: "Show KPI trends this quarter", color: "text-green-500", category: "KPIs" },
  { icon: Users, label: "Who has the most open actions?", color: "text-cyan-500", category: "Team" },
  { icon: Target, label: "How are we tracking against strategic goals?", color: "text-primary", category: "Strategy" },
  { icon: Calendar, label: "What milestones are due this month?", color: "text-orange-500", category: "Projects" },
];

function parseMarkdown(text: string | null | undefined): string {
  if (!text) return "";
  return text
    // Headers
    .replace(/^### (.*)/gm, "<h4 class='font-semibold text-sm mt-3 mb-1'>$1</h4>")
    .replace(/^## (.*)/gm, "<h3 class='font-semibold text-sm mt-3 mb-1'>$1</h3>")
    // Bold
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    // Numbered lists — wrap consecutive items
    .replace(/^(\d+)\. (.*)/gm, "<li class='ml-4 list-decimal'>$2</li>")
    // Bullet lists
    .replace(/^- (.*)/gm, "<li class='ml-4 list-disc'>$1</li>")
    // Wrap consecutive <li> elements in a <ul> or <ol>
    .replace(/(<li[^>]*>.*?<\/li>)(\s*<li[^>]*>.*?<\/li>)*/gs, (match) =>
      `<ul class='space-y-0.5 my-1.5 pl-1'>${match}</ul>`
    )
    // Line breaks
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
      <div className="flex gap-3 items-start">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Bot className="h-4 w-4 text-primary" />
        </div>
        <div className="flex items-center gap-2 bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Thinking…</span>
        </div>
      </div>
    );
  }

  if (msg.role === "user") {
    return (
      <div className="flex gap-3 items-start justify-end">
        <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5">
          <p className="text-sm leading-relaxed">{msg.content}</p>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <User className="h-4 w-4 text-primary" />
        </div>
      </div>
    );
  }

  const isConfirmation = msg.type === "confirmation" && msg.pendingAction;
  const isSuccess = msg.type === "success";
  const isError = msg.type === "error";
  const isQuestion = msg.type === "question";

  return (
    <div className="flex gap-3 items-start">
      <div className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
        isSuccess ? "bg-green-100 dark:bg-green-900/30" :
        isError ? "bg-red-100 dark:bg-red-900/30" :
        "bg-primary/10"
      )}>
        {isSuccess ? <CheckCircle2 className="h-4 w-4 text-green-600" /> :
         isError ? <AlertCircle className="h-4 w-4 text-red-500" /> :
         isQuestion ? <Lightbulb className="h-4 w-4 text-amber-500" /> :
         <Bot className="h-4 w-4 text-primary" />}
      </div>
      <div className="flex-1 max-w-[88%] space-y-2">
        <div className={cn(
          "rounded-2xl rounded-tl-sm px-4 py-3",
          isSuccess ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" :
          isError ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800" :
          isQuestion ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900" :
          "bg-muted"
        )}>
          <div
            className="text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }}
          />
        </div>

        {/* Navigation link buttons */}
        {msg.links && msg.links.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pl-0.5">
            {msg.links.map((link, i) => (
              <LinkButton key={i} link={link} onNavigate={onNavigate} />
            ))}
          </div>
        )}

        {/* Quick action buttons */}
        {msg.quickActions && msg.quickActions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pl-0.5">
            {msg.quickActions.map((qa, i) => (
              <QuickActionButton key={i} qa={qa} onQuickAction={onQuickAction} />
            ))}
          </div>
        )}

        {/* Confirmation card */}
        {isConfirmation && msg.pendingAction && (
          <div className="border border-border rounded-xl overflow-hidden bg-background shadow-sm">
            <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-2.5 flex items-center gap-2">
              <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Confirm Action</span>
            </div>
            <div className="px-4 py-3">
              <p className="text-sm text-foreground font-medium mb-2">{msg.pendingAction.label}</p>
              <div className="space-y-1 bg-muted/50 rounded-lg px-3 py-2">
                {Object.entries(msg.pendingAction.data)
                  .filter(([k]) => !["companyId"].includes(k))
                  .slice(0, 10)
                  .map(([key, val]) => (
                    <div key={key} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <ArrowRight className="h-3 w-3 shrink-0 mt-0.5" />
                      <span className="font-medium text-foreground/70 capitalize min-w-[80px]">
                        {key.replace(/([A-Z])/g, " $1").trim()}:
                      </span>
                      <span className="text-foreground/90">{String(val)}</span>
                    </div>
                  ))}
              </div>
            </div>
            <div className="px-4 py-3 border-t border-border flex gap-2">
              <Button
                size="sm"
                className="flex-1 h-8 text-xs gap-1.5"
                onClick={onConfirm}
                disabled={isConfirming}
                data-testid="button-assistant-confirm"
              >
                {isConfirming ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                Confirm
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-8 text-xs gap-1.5"
                onClick={onCancel}
                disabled={isConfirming}
                data-testid="button-assistant-cancel"
              >
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
    if (open) {
      scrollToBottom();
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open, messages.length, scrollToBottom]);

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
        ? {
            ...m,
            isLoading: false,
            content: response.message,
            type: response.type,
            links: response.links || [],
            quickActions: response.quickActions || [],
            pendingAction: response.pendingAction,
          }
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
  }, [chatMutation, apiMessages, isConfirming, addLoadingMsg, replaceLoadingMsg, scrollToBottom, nextId]);

  const handleConfirm = useCallback(async () => {
    if (!pendingConfirmation) return;
    setIsConfirming(true);
    const capturedAction = pendingConfirmation.action;
    setPendingConfirmation(null);

    const loadingId = addLoadingMsg();
    try {
      const response = await chatMutation.mutateAsync({
        messages: apiMessages,
        confirmedAction: capturedAction,
      });
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
    setMessages(prev => [...prev, {
      id: msgId,
      role: "assistant",
      content: action.label,
      type: "confirmation",
      links: [],
      quickActions: [],
      pendingAction: action,
    }]);
    setPendingConfirmation({ msgId, action });
    scrollToBottom();
  }, [nextId, scrollToBottom]);

  const handleCancel = useCallback(() => {
    setPendingConfirmation(null);
    setMessages(prev => [...prev, {
      id: nextId(), role: "assistant", content: "Cancelled. No changes were made.", type: "answer", links: [], quickActions: []
    }]);
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

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-full sm:w-[440px] bg-background border-l border-border shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-label="Performo Assistant"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border bg-background">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-[18px] w-[18px] text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold tracking-tight" data-testid="text-assistant-title">
              Performo Assistant
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {user?.role === "admin" ? "Full access · read & write" : "Read-only mode"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={handleReset}
                title="New conversation"
                data-testid="button-assistant-reset"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={onClose}
              data-testid="button-assistant-close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4 py-4">
          {isEmpty ? (
            <div className="space-y-5">
              <div className="text-center space-y-2 pt-2">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mx-auto">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-base font-semibold">
                  Hi{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!
                </h3>
                <p className="text-sm text-muted-foreground max-w-[300px] mx-auto leading-relaxed">
                  I'm your business performance copilot. Ask me anything about KPIs, projects, actions, or team performance.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold px-1">
                  Suggested questions
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  {SUGGESTED_PROMPTS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => sendMessage(p.label)}
                      className="flex items-center gap-3 w-full text-left px-3.5 py-2.5 rounded-xl border border-border hover:bg-muted/60 hover:border-primary/30 transition-all group"
                      data-testid={`button-prompt-${p.label.toLowerCase().replace(/\s+/g, "-").slice(0, 35)}`}
                    >
                      <p.icon className={cn("h-4 w-4 shrink-0", p.color)} />
                      <span className="text-sm text-foreground/80 group-hover:text-foreground flex-1 leading-snug">{p.label}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal opacity-60 shrink-0">
                        {p.category}
                      </Badge>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
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
        <div className="border-t border-border px-4 py-3 bg-background space-y-2">
          <div className="flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question or give an instruction…"
              rows={1}
              className="resize-none text-sm min-h-[40px] max-h-[120px] flex-1 rounded-xl leading-5"
              style={{ height: "auto" }}
              data-testid="input-assistant-message"
              disabled={chatMutation.isPending || isConfirming}
            />
            <Button
              size="icon"
              className="h-10 w-10 shrink-0 rounded-xl"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || chatMutation.isPending || isConfirming}
              data-testid="button-assistant-send"
            >
              {chatMutation.isPending || isConfirming
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </>
  );
}
