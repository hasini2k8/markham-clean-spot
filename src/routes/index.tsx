import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { MarkhamMap, type MapPin } from "@/components/MarkhamMap";
import { supabase } from "@/integrations/supabase/client";
import { Camera, MapPin as MapPinIcon, ClipboardCheck, Sparkles, Users } from "lucide-react";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const [pins, setPins] = useState<MapPin[]>([]);
  const [resetsIn, setResetsIn] = useState("");

  useEffect(() => {
    (async () => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("cleanup_sessions")
        .select("id, lat, lng, status, location_name, reviewed_at")
        .eq("status", "approved")
        .gte("reviewed_at", weekAgo)
        .order("reviewed_at", { ascending: false });
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
      }
    })();

    // Countdown to next Sunday midnight (rolling week reset)
    const tick = () => {
      const now = new Date();
      const next = new Date(now);
      const daysUntilSun = (7 - now.getDay()) % 7 || 7;
      next.setDate(now.getDate() + daysUntilSun);
      next.setHours(0, 0, 0, 0);
      const diff = next.getTime() - now.getTime();
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      setResetsIn(`${d}d ${h}h`);
    };
    tick();
    const i = setInterval(tick, 60000);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-hero)" }}>
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-20">
        <section className="text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/30 text-primary text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" /> For Markham residents
          </span>
          <h1 className="mt-6 font-display font-extrabold text-4xl sm:text-6xl text-foreground leading-[1.05]">
            Clean up the city we<br /><span className="text-accent">all</span> call home.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
            Pick a spot in Markham, snap a before & after, and our AI verifies your work. Supervisors approve your volunteer hours — for school, scholarships, or just because.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/auth"><Button size="lg" className="px-8">Start volunteering</Button></Link>
            <Link to="/dashboard"><Button size="lg" variant="outline" className="px-8">View the map</Button></Link>
          </div>
        </section>

        <section className="mt-20">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
            <div>
              <h2 className="font-display font-bold text-2xl sm:text-3xl flex items-center gap-2">
                <Users className="w-6 h-6 text-accent" /> Community map
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Spots cleaned by Markham volunteers this week — {pins.length} {pins.length === 1 ? "cleanup" : "cleanups"}.
              </p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary/30 px-3 py-1.5 rounded-full">
              Resets in {resetsIn}
            </span>
          </div>
          <MarkhamMap pins={pins} height="420px" />
        </section>

        <section className="mt-20 grid sm:grid-cols-3 gap-5">
          {[
            { icon: MapPinIcon, title: "1. Pick a spot", text: "Open the map of Markham and tap a location that needs care." },
            { icon: Camera, title: "2. Clean & capture", text: "Take a before photo, start the timer, clean up, and finish with an after photo." },
            { icon: ClipboardCheck, title: "3. Get hours", text: "AI checks your work, then a supervisor approves your volunteer hours." },
          ].map((s) => (
            <div key={s.title} className="bg-card border border-border rounded-2xl p-6 shadow-[var(--shadow-soft)]">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-warm)" }}>
                <s.icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <h3 className="mt-4 font-display font-bold text-lg">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.text}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
