import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { MarkhamMap } from "@/components/MarkhamMap";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, Play, StopCircle, Sparkles } from "lucide-react";

export const Route = createFileRoute("/cleanup/new")({ component: NewCleanup });

type Step = "pick" | "before" | "in_progress" | "after" | "verify" | "done";

function NewCleanup() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("pick");
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null);
  const [afterUrl, setAfterUrl] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [verdict, setVerdict] = useState<{ verdict: string; reasoning: string } | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (step === "in_progress" && startedAt) {
      timerRef.current = window.setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000));
      }, 1000);
      return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
    }
  }, [step, startedAt]);

  const uploadPhoto = async (file: File, kind: "before" | "after"): Promise<string> => {
    if (!user) throw new Error("not signed in");
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${Date.now()}-${kind}.${ext}`;
    const { error } = await supabase.storage.from("cleanup-photos").upload(path, file, { upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from("cleanup-photos").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleBeforeUpload = async (file: File) => {
    if (!picked || !user) return;
    setBusy(true);
    try {
      const url = await uploadPhoto(file, "before");
      const started = new Date();
      const { data, error } = await supabase
        .from("cleanup_sessions")
        .insert({
          volunteer_id: user.id,
          lat: picked.lat,
          lng: picked.lng,
          location_name: locationName || `${picked.lat.toFixed(4)}, ${picked.lng.toFixed(4)}`,
          before_photo_url: url,
          started_at: started.toISOString(),
          status: "in_progress",
        })
        .select("id").single();
      if (error) throw error;
      setSessionId(data.id);
      setBeforeUrl(url);
      setStartedAt(started);
      setStep("in_progress");
      toast.success("Cleanup started — timer running!");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setBusy(false); }
  };

  const finishCleanup = () => setStep("after");

  const handleAfterUpload = async (file: File) => {
    if (!sessionId || !startedAt) return;
    setBusy(true);
    try {
      const url = await uploadPhoto(file, "after");
      setAfterUrl(url);
      const ended = new Date();
      const minutes = Math.max(1, Math.round((ended.getTime() - startedAt.getTime()) / 60000));

      setStep("verify");
      // AI verify
      const { data: verifyData, error: verifyErr } = await supabase.functions.invoke("verify-cleanup", {
        body: { beforeUrl, afterUrl: url },
      });
      if (verifyErr) throw verifyErr;
      if (verifyData?.error) throw new Error(verifyData.error);

      const v = { verdict: verifyData.verdict, reasoning: verifyData.reasoning };
      setVerdict(v);

      const { error: updErr } = await supabase
        .from("cleanup_sessions")
        .update({
          after_photo_url: url,
          ended_at: ended.toISOString(),
          duration_minutes: minutes,
          ai_verdict: v.verdict,
          ai_reasoning: v.reasoning,
          status: "pending_review",
        })
        .eq("id", sessionId);
      if (updErr) throw updErr;

      setStep("done");
    } catch (e: any) {
      toast.error(e.message);
      setStep("after");
    } finally { setBusy(false); }
  };

  const fmtElapsed = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="font-display font-bold text-3xl">New cleanup session</h1>

        {step === "pick" && (
          <>
            <p className="text-muted-foreground mt-2">Tap a spot on the map of Markham to begin.</p>
            <div className="mt-6">
              <MarkhamMap pickedLocation={picked} onPickLocation={(lat, lng) => setPicked({ lat, lng })} />
            </div>
            {picked && (
              <Card className="mt-6 p-6">
                <Label htmlFor="loc">Location name (optional)</Label>
                <Input id="loc" value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="e.g. Milne Dam Park north trail" maxLength={120} className="mt-1" />
                <p className="text-xs text-muted-foreground mt-2">Coordinates: {picked.lat.toFixed(5)}, {picked.lng.toFixed(5)}</p>
                <Button className="mt-4" onClick={() => setStep("before")}>Continue →</Button>
              </Card>
            )}
          </>
        )}

        {step === "before" && (
          <Card className="mt-6 p-8 text-center">
            <Camera className="w-10 h-10 mx-auto text-accent" />
            <h2 className="font-display font-bold text-2xl mt-4">Take the BEFORE photo</h2>
            <p className="text-muted-foreground text-sm mt-2">Capture the area before you start cleaning.</p>
            <label className="mt-6 inline-block">
              <input
                type="file" accept="image/*" capture="environment" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleBeforeUpload(e.target.files[0])}
                disabled={busy}
              />
              <span className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium cursor-pointer hover:opacity-90">
                {busy ? "Uploading…" : <><Play className="w-4 h-4 mr-2" />Upload & start timer</>}
              </span>
            </label>
          </Card>
        )}

        {step === "in_progress" && (
          <Card className="mt-6 p-8 text-center">
            <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Cleanup in progress</div>
            <div className="mt-3 text-6xl font-display font-bold text-primary tabular-nums">{fmtElapsed}</div>
            <p className="text-muted-foreground text-sm mt-3">Take your time. Tap finish when the area is clean.</p>
            {beforeUrl && <img src={beforeUrl} alt="before" className="mt-6 max-h-64 mx-auto rounded-lg" />}
            <Button size="lg" variant="default" className="mt-6" onClick={finishCleanup}>
              <StopCircle className="w-4 h-4 mr-2" />Finish & take after photo
            </Button>
          </Card>
        )}

        {step === "after" && (
          <Card className="mt-6 p-8 text-center">
            <Camera className="w-10 h-10 mx-auto text-accent" />
            <h2 className="font-display font-bold text-2xl mt-4">Take the AFTER photo</h2>
            <p className="text-muted-foreground text-sm mt-2">Show off your hard work!</p>
            <label className="mt-6 inline-block">
              <input
                type="file" accept="image/*" capture="environment" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleAfterUpload(e.target.files[0])}
                disabled={busy}
              />
              <span className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-accent text-accent-foreground font-medium cursor-pointer hover:opacity-90">
                {busy ? "Uploading…" : "Upload after photo"}
              </span>
            </label>
          </Card>
        )}

        {step === "verify" && (
          <Card className="mt-6 p-8 text-center">
            <Sparkles className="w-10 h-10 mx-auto text-accent animate-pulse" />
            <h2 className="font-display font-bold text-2xl mt-4">AI is reviewing your cleanup…</h2>
            <p className="text-muted-foreground text-sm mt-2">Comparing your before & after photos.</p>
          </Card>
        )}

        {step === "done" && verdict && (
          <Card className="mt-6 p-8">
            <div className="text-center">
              <div className={`inline-flex px-4 py-1.5 rounded-full text-sm font-semibold ${
                verdict.verdict === "clean" ? "bg-secondary/40 text-primary" :
                verdict.verdict === "not_clean" ? "bg-destructive/15 text-destructive" :
                "bg-muted text-muted-foreground"
              }`}>
                AI verdict: {verdict.verdict.replace("_", " ")}
              </div>
              <p className="mt-4 text-foreground">{verdict.reasoning}</p>
              <p className="text-sm text-muted-foreground mt-4">Submitted to a supervisor for hour approval.</p>
              <div className="grid grid-cols-2 gap-4 mt-6">
                {beforeUrl && <div><div className="text-xs uppercase font-semibold text-muted-foreground mb-1">Before</div><img src={beforeUrl} className="rounded-lg" alt="before" /></div>}
                {afterUrl && <div><div className="text-xs uppercase font-semibold text-muted-foreground mb-1">After</div><img src={afterUrl} className="rounded-lg" alt="after" /></div>}
              </div>
              <div className="mt-6 flex gap-3 justify-center">
                <Button onClick={() => navigate({ to: "/my-hours" })}>View my hours</Button>
                <Button variant="outline" onClick={() => navigate({ to: "/dashboard" })}>Back to map</Button>
              </div>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
