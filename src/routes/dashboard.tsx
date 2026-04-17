import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { MarkhamMap, type MapPin } from "@/components/MarkhamMap";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Clock } from "lucide-react";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [pins, setPins] = useState<MapPin[]>([]);
  const [stats, setStats] = useState({ totalMin: 0, count: 0 });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("cleanup_sessions")
        .select("id, lat, lng, status, location_name, duration_minutes, volunteer_id")
        .order("created_at", { ascending: false });
      if (data) {
        setPins(
          data.map((d) => ({
            id: d.id,
            lat: d.lat,
            lng: d.lng,
            status: d.status as MapPin["status"],
            label: d.location_name,
          }))
        );
        const mine = data.filter((d) => d.volunteer_id === user.id && d.status === "approved");
        setStats({
          totalMin: mine.reduce((s, d) => s + (d.duration_minutes ?? 0), 0),
          count: mine.length,
        });
      }
    })();
  }, [user]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display font-bold text-3xl">Markham Cleanup Map</h1>
            <p className="text-muted-foreground text-sm mt-1">Tap any spot inside the dashed boundary to start a cleanup.</p>
          </div>
          <Link to="/cleanup/new"><Button size="lg"><Plus className="w-4 h-4 mr-2" />Start a cleanup</Button></Link>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <Card className="p-5">
            <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Approved hours</div>
            <div className="mt-2 text-3xl font-display font-bold text-primary flex items-baseline gap-1">
              {(stats.totalMin / 60).toFixed(1)}<span className="text-sm font-normal text-muted-foreground">h</span>
            </div>
          </Card>
          <Card className="p-5">
            <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Cleanups completed</div>
            <div className="mt-2 text-3xl font-display font-bold text-accent">{stats.count}</div>
          </Card>
          <Card className="p-5 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Track progress</div>
              <div className="mt-1 text-sm">View all your sessions</div>
            </div>
            <Link to="/my-hours"><Button variant="outline" size="sm"><Clock className="w-4 h-4 mr-1" />Hours</Button></Link>
          </Card>
        </div>

        <MarkhamMap pins={pins} height="600px" />

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <Legend color="oklch(0.55 0.15 145)" label="Approved" />
          <Legend color="oklch(0.7 0.15 75)" label="Pending review" />
          <Legend color="oklch(0.6 0.12 230)" label="In progress" />
          <Legend color="oklch(0.55 0.2 28)" label="Rejected" />
        </div>
      </main>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="w-3 h-3 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
