import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { buildVolunteerFormPdf } from "@/lib/volunteerPdf";
import { toast } from "sonner";
import { FileText, PenLine, X, Download } from "lucide-react";

export const Route = createFileRoute("/supervisor/forms")({ component: SupervisorForms });

interface Form {
  id: string;
  student_id: string;
  student_name: string;
  student_school: string | null;
  supervisor_name: string;
  supervisor_email: string | null;
  hours: number;
  activity_description: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  unsigned_pdf_url: string | null;
  signed_pdf_url: string | null;
  signature_name: string | null;
  signed_at: string | null;
  created_at: string;
}

function SupervisorForms() {
  const { user, loading, isSupervisor } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Form[]>([]);
  const [signing, setSigning] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
    if (!loading && user && !isSupervisor) navigate({ to: "/dashboard" });
  }, [user, loading, isSupervisor, navigate]);

  const load = async () => {
    const { data } = await supabase
      .from("volunteer_forms")
      .select("*")
      .or(`supervisor_id.eq.${user!.id},supervisor_id.is.null`)
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    setItems((data ?? []) as Form[]);
  };

  useEffect(() => { if (isSupervisor && user) load(); }, [isSupervisor, user]);

  const sign = async (f: Form) => {
    const name = (signing[f.id] || "").trim();
    if (!name) return toast.error("Type your name to sign.");
    setBusy(f.id);
    try {
      const signedAt = new Date().toISOString();
      const pdfBytes = await buildVolunteerFormPdf({
        studentName: f.student_name,
        studentSchool: f.student_school,
        supervisorName: f.supervisor_name,
        supervisorEmail: f.supervisor_email,
        hours: Number(f.hours),
        activityDescription: f.activity_description,
        startDate: f.start_date,
        endDate: f.end_date,
        signatureName: name,
        signedAt,
      });

      // Upload under student folder is blocked by RLS for supervisor; use supervisor folder
      const path = `${user!.id}/signed-${f.id}.pdf`;
      const { error: upErr } = await supabase.storage
        .from("volunteer-forms")
        .upload(path, pdfBytes, { contentType: "application/pdf", upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("volunteer-forms").getPublicUrl(path);

      const { error: updErr } = await supabase
        .from("volunteer_forms")
        .update({
          status: "signed",
          signature_name: name,
          signed_at: signedAt,
          signed_pdf_url: urlData.publicUrl,
          supervisor_id: user!.id,
        })
        .eq("id", f.id);
      if (updErr) throw updErr;

      toast.success("Form signed and returned to student.");
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to sign.");
    } finally {
      setBusy(null);
    }
  };

  const decline = async (f: Form) => {
    const reason = (reasons[f.id] || "").trim();
    setBusy(f.id);
    try {
      const { error } = await supabase
        .from("volunteer_forms")
        .update({ status: "declined", decline_reason: reason || "Declined by supervisor", supervisor_id: user!.id })
        .eq("id", f.id);
      if (error) throw error;
      toast.success("Form declined.");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  if (!user || !isSupervisor) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-accent/15">
              <FileText className="w-5 h-5 text-accent" />
            </span>
            <div>
              <h1 className="font-display font-bold text-3xl">Forms to sign</h1>
              <p className="text-sm text-muted-foreground">{items.length} pending form{items.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <Link to="/supervisor" className="text-sm text-muted-foreground hover:text-primary">← Back to reviews</Link>
        </div>

        <div className="mt-6 space-y-4">
          {items.length === 0 && <p className="text-muted-foreground text-center py-12">No forms waiting.</p>}
          {items.map((f) => (
            <Card key={f.id} className="p-6">
              <div className="flex justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-display font-bold text-lg">{f.student_name}</div>
                  <div className="text-sm text-muted-foreground">{f.student_school || "—"} • {new Date(f.created_at).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-display font-bold text-primary tabular-nums">{f.hours} hrs</div>
                  {(f.start_date || f.end_date) && (
                    <div className="text-xs text-muted-foreground">{f.start_date || "?"} → {f.end_date || "?"}</div>
                  )}
                </div>
              </div>
              <div className="mt-3 p-3 rounded-lg bg-muted/50 text-sm whitespace-pre-wrap">{f.activity_description}</div>
              {f.unsigned_pdf_url && (
                <a href={f.unsigned_pdf_url} target="_blank" rel="noreferrer" className="inline-block mt-3">
                  <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" />Preview PDF</Button>
                </a>
              )}

              <div className="mt-4 border-t pt-4 space-y-3">
                <div>
                  <label className="text-xs uppercase font-semibold text-muted-foreground">Type your full name to sign</label>
                  <Input
                    value={signing[f.id] ?? ""}
                    onChange={(e) => setSigning({ ...signing, [f.id]: e.target.value })}
                    placeholder="e.g. Jane Smith"
                    maxLength={120}
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2 justify-end flex-wrap">
                  <Textarea
                    placeholder="Decline reason (optional)…"
                    value={reasons[f.id] ?? ""}
                    onChange={(e) => setReasons({ ...reasons, [f.id]: e.target.value })}
                    className="flex-1 min-w-[200px]"
                    rows={1}
                    maxLength={500}
                  />
                  <Button variant="outline" disabled={busy === f.id} onClick={() => decline(f)}>
                    <X className="w-4 h-4 mr-1" />Decline
                  </Button>
                  <Button disabled={busy === f.id} onClick={() => sign(f)}>
                    <PenLine className="w-4 h-4 mr-1" />{busy === f.id ? "Signing…" : "Sign & return"}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
