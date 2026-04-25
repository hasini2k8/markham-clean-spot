import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, X } from "lucide-react";

type Message = { role: "user" | "assistant"; text: string };

export function MarkhamCleanupChat() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "Ask where in Markham you should clean next." },
  ]);

  const ask = async () => {
    const text = question.trim();
    if (!text || busy) return;
    setQuestion("");
    setBusy(true);
    setMessages((m) => [...m, { role: "user", text }]);
    try {
      const res = await fetch("/api/public/markham-cleanup-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", text: data.answer || data.error || "I could not answer right now." }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "I could not answer right now." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open && (
        <div className="mb-3 w-[min(calc(100vw-2rem),22rem)] overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-warm)]">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2 font-display font-bold"><Bot className="w-5 h-5 text-primary" />MaVo AI</div>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground" aria-label="Close chat"><X className="w-4 h-4" /></button>
          </div>
          <div className="max-h-80 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "ml-8 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground" : "mr-8 rounded-lg bg-muted px-3 py-2 text-sm text-foreground"}>
                {m.text}
              </div>
            ))}
          </div>
          <div className="flex gap-2 border-t border-border p-3">
            <Input value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()} placeholder="Where should I clean?" maxLength={500} />
            <Button size="icon" onClick={ask} disabled={busy} aria-label="Send message"><Send className="w-4 h-4" /></Button>
          </div>
        </div>
      )}
      <Button size="icon" className="h-12 w-12 rounded-full shadow-[var(--shadow-warm)]" onClick={() => setOpen((v) => !v)} aria-label="Open MaVo AI chat">
        <Bot className="w-5 h-5" />
      </Button>
    </div>
  );
}