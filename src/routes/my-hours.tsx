import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/my-hours")({ component: MyHours });

interface Session {
  id: string;
  location_name: string;
  started_at: string;
  duration_minutes: number | null;
  status: string;
  ai_verdict: string | null;
  ai_reasoning: string | null;
  before_photo_url: string | null;
  after_photo_url: string | null;
  supervisor_notes: string | null;
}

function MyHours() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("cleanup_sessions")
        .select("id,location_name,started_at,duration_minutes,status,ai_verdict,ai_reasoning,before_photo_url,after_photo_url,supervisor_notes")
        .eq("volunteer_id", user.id)
        .order("started_at", { ascending: false });
      if (data) setSessions(data as Session[]);
    })();
  }, [user]);

  const totalApproved = sessions.filter((s) => s.status === "approved").reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="font-display font-bold text-3xl">My volunteer hours</h1>
        <Card className="mt-4 p-6 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <div className="text-xs uppercase font-semibold text-muted-foreground">Approved total</div>
            <div className="text-4xl font-display font-bold text-primary mt-1">{(totalApproved / 60).toFixed(1)} hours</div>
          </div>
          <div className="text-sm text-muted-foreground">{sessions.length} session{sessions.length !== 1 ? "s" : ""}</div>
        </Card>

        <div className="mt-6 space-y-3">
          {sessions.length === 0 && <p className="text-muted-foreground text-center py-12">No cleanups yet — head to the map to start your first one.</p>}
          {sessions.map((s) => (
            <Card key={s.id} className="p-5">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <div className="font-display font-semibold">{s.location_name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{new Date(s.started_at).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={s.status} />
                  <span className="text-sm font-semibold tabular-nums">{s.duration_minutes ?? 0} min</span>
                </div>
              </div>
              {s.ai_verdict && (
                <div className="mt-3 text-sm text-muted-foreground border-l-2 border-accent/40 pl-3">
                  <span className="font-semibold text-foreground">AI ({s.ai_verdict.replace("_", " ")}):</span> {s.ai_reasoning}
                </div>
              )}
              {s.supervisor_notes && (
                <div className="mt-2 text-sm border-l-2 border-primary/40 pl-3">
                  <span className="font-semibold">Supervisor:</span> {s.supervisor_notes}
                </div>
              )}
              {(s.before_photo_url || s.after_photo_url) && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {s.before_photo_url && <img src={s.before_photo_url} alt="before" className="rounded h-24 w-full object-cover" />}
                  {s.after_photo_url && <img src={s.after_photo_url} alt="after" className="rounded h-24 w-full object-cover" />}
                </div>
              )}
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    in_progress: "bg-blue-100 text-blue-800",
    pending_review: "bg-amber-100 text-amber-900",
    approved: "bg-secondary/40 text-primary",
    rejected: "bg-destructive/15 text-destructive",
  };
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${map[status] ?? ""}`}>{status.replace("_", " ")}</span>;
}
