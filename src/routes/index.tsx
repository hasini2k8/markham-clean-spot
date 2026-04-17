import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Camera, MapPin, ClipboardCheck, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
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

        <section className="mt-20 grid sm:grid-cols-3 gap-5">
          {[
            { icon: MapPin, title: "1. Pick a spot", text: "Open the map of Markham and tap a location that needs care." },
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
