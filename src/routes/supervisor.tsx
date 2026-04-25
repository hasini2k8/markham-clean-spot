import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Check, X, Clock } from "lucide-react";

export const Route = createFileRoute("/supervisor")({ component: Supervisor });

interface Pending {
  id: string;
  location_name: string;
  started_at: string;
  duration_minutes: number | null;
  ai_verdict: string | null;
  ai_reasoning: string | null;
  before_photo_url: string | null;
  after_photo_url: string | null;
  volunteer_id: string;
  status: string;
}

interface VolunteerTotal {
  volunteer_id: string;
  name: string;
  minutes: number;
}

const displayDate = (value: string) => new Date(value).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });

function Supervisor() {
  const { user, loading, isSupervisor } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Pending[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [names, setNames] = useState<Record<string, string>>({});
  const [totals, setTotals] = useState<VolunteerTotal[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
    if (!loading && user && !isSupervisor) navigate({ to: "/dashboard" });
  }, [user, loading, isSupervisor, navigate]);

  const load = async () => {
    const { data } = await supabase
      .from("cleanup_sessions")
      .select("id,location_name,started_at,duration_minutes,ai_verdict,ai_reasoning,before_photo_url,after_photo_url,volunteer_id,status")
      .eq("status", "pending_review")
      .order("started_at", { ascending: true });
    const { data: approved } = await supabase
      .from("cleanup_sessions")
      .select("volunteer_id,duration_minutes")
      .eq("status", "approved");
    const allIds = Array.from(new Set([...(data ?? []).map((d) => d.volunteer_id), ...(approved ?? []).map((d) => d.volunteer_id)]));
    const map: Record<string, string> = {};
    if (allIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id,full_name,email").in("id", allIds);
      profs?.forEach((p) => (map[p.id] = p.full_name || p.email || "Volunteer"));
      setNames(map);
    }
    if (data) {
      setItems(data as Pending[]);
    }
    const summary = new Map<string, number>();
    (approved ?? []).forEach((row) => summary.set(row.volunteer_id, (summary.get(row.volunteer_id) ?? 0) + (row.duration_minutes ?? 0)));
    setTotals(Array.from(summary.entries()).map(([volunteer_id, minutes]) => ({ volunteer_id, minutes, name: map[volunteer_id] ?? "Volunteer" })).sort((a, b) => b.minutes - a.minutes));
  };

  useEffect(() => { if (isSupervisor) load(); }, [isSupervisor]);

  const decide = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase
      .from("cleanup_sessions")
      .update({
        status,
        supervisor_id: user!.id,
        supervisor_notes: notes[id] ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Session ${status}`);
      load();
    }
  };

  if (!user || !isSupervisor) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-accent/15"><Shield className="w-5 h-5 text-accent" /></span>
          <div>
            <h1 className="font-display font-bold text-3xl">Supervisor review</h1>
            <p className="text-sm text-muted-foreground">{items.length} pending session{items.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {items.length === 0 && <p className="text-muted-foreground text-center py-12">All caught up — no pending reviews.</p>}
          {items.map((s) => (
            <Card key={s.id} className="p-6">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <div className="font-display font-bold text-lg">{s.location_name}</div>
                  <div className="text-sm text-muted-foreground">By {names[s.volunteer_id] ?? "Volunteer"} • {new Date(s.started_at).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-display font-bold text-primary tabular-nums">{s.duration_minutes ?? 0} min</div>
                  <div className="text-xs text-muted-foreground">claimed time</div>
                </div>
              </div>
              {s.ai_verdict && (
                <div className="mt-3 p-3 rounded-lg bg-muted/50 text-sm">
                  <span className="font-semibold">AI verdict — {s.ai_verdict.replace("_", " ")}:</span> {s.ai_reasoning}
                </div>
              )}
              <div className="mt-4 grid grid-cols-2 gap-3">
                {s.before_photo_url && <div><div className="text-xs uppercase font-semibold text-muted-foreground mb-1">Before</div><img src={s.before_photo_url} alt="before" className="rounded-lg w-full h-48 object-cover" /></div>}
                {s.after_photo_url && <div><div className="text-xs uppercase font-semibold text-muted-foreground mb-1">After</div><img src={s.after_photo_url} alt="after" className="rounded-lg w-full h-48 object-cover" /></div>}
              </div>
              <Textarea
                placeholder="Optional notes for the volunteer…"
                value={notes[s.id] ?? ""}
                onChange={(e) => setNotes({ ...notes, [s.id]: e.target.value })}
                className="mt-4"
                maxLength={500}
              />
              <div className="mt-3 flex gap-2 justify-end">
                <Button variant="outline" onClick={() => decide(s.id, "rejected")}><X className="w-4 h-4 mr-1" />Reject</Button>
                <Button onClick={() => decide(s.id, "approved")}><Check className="w-4 h-4 mr-1" />Approve hours</Button>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
