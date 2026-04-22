import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { buildVolunteerFormPdf } from "@/lib/volunteerPdf";
import { toast } from "sonner";
import { FileText, Send } from "lucide-react";

export const Route = createFileRoute("/forms/new")({ component: NewForm });

interface Sup {
  id: string;
  full_name: string | null;
  email: string | null;
}

function NewForm() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [supervisors, setSupervisors] = useState<Sup[]>([]);
  const [supervisorId, setSupervisorId] = useState<string>("");
  const [studentName, setStudentName] = useState("");
  const [studentSchool, setStudentSchool] = useState("");
  const [hours, setHours] = useState("");
  const [activity, setActivity] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: prof } = await supabase.from("profiles").select("full_name,school").eq("id", user.id).maybeSingle();
      if (prof?.full_name) setStudentName(prof.full_name);
      if (prof?.school) setStudentSchool(prof.school);
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "supervisor");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id,full_name,email").in("id", ids);
        setSupervisors((profs ?? []) as Sup[]);
      }
    })();
  }, [user]);

  const submit = async () => {
    if (!user) return;
    if (!supervisorId) return toast.error("Please choose a supervisor.");
    const hoursNum = parseFloat(hours);
    if (!studentName.trim() || !activity.trim() || !hoursNum || hoursNum <= 0) {
      return toast.error("Please fill in name, hours, and activity description.");
    }
    if (activity.length > 2000) return toast.error("Activity description is too long.");

    const sup = supervisors.find((s) => s.id === supervisorId);
    if (!sup) return toast.error("Supervisor not found.");

    setBusy(true);
    try {
      const pdfBytes = await buildVolunteerFormPdf({
        studentName: studentName.trim(),
        studentSchool: studentSchool.trim() || null,
        supervisorName: sup.full_name || sup.email || "Supervisor",
        supervisorEmail: sup.email,
        hours: hoursNum,
        activityDescription: activity.trim(),
        startDate: startDate || null,
        endDate: endDate || null,
      });

      const path = `${user.id}/${Date.now()}-unsigned.pdf`;
      const { error: upErr } = await supabase.storage
        .from("volunteer-forms")
        .upload(path, pdfBytes, { contentType: "application/pdf", upsert: false });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("volunteer-forms").getPublicUrl(path);

      const { error: insErr } = await supabase.from("volunteer_forms").insert({
        student_id: user.id,
        supervisor_id: sup.id,
        student_name: studentName.trim(),
        student_school: studentSchool.trim() || null,
        supervisor_name: sup.full_name || sup.email || "Supervisor",
        supervisor_email: sup.email,
        hours: hoursNum,
        activity_description: activity.trim(),
        start_date: startDate || null,
        end_date: endDate || null,
        unsigned_pdf_url: urlData.publicUrl,
        status: "pending",
      });
      if (insErr) throw insErr;

      toast.success("Form sent to supervisor!");
      navigate({ to: "/forms" });
    } catch (e: any) {
      toast.error(e.message || "Failed to send form.");
    } finally {
      setBusy(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-accent/15">
            <FileText className="w-5 h-5 text-accent" />
          </span>
          <div>
            <h1 className="font-display font-bold text-3xl">New volunteer form</h1>
            <p className="text-sm text-muted-foreground">Fill it out, send to a supervisor for signature.</p>
          </div>
        </div>

        <Card className="mt-6 p-6 space-y-4">
          <div>
            <Label>Supervisor</Label>
            <Select value={supervisorId} onValueChange={setSupervisorId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a supervisor…" /></SelectTrigger>
              <SelectContent>
                {supervisors.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.full_name || s.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="sn">Your full name</Label>
            <Input id="sn" value={studentName} onChange={(e) => setStudentName(e.target.value)} maxLength={120} />
          </div>
          <div>
            <Label htmlFor="ss">School / Organization</Label>
            <Input id="ss" value={studentSchool} onChange={(e) => setStudentSchool(e.target.value)} maxLength={200} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="h">Hours</Label>
              <Input id="h" type="number" min="0" step="0.25" value={hours} onChange={(e) => setHours(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="sd">Start date</Label>
              <Input id="sd" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ed">End date</Label>
              <Input id="ed" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="ac">Activity description</Label>
            <Textarea id="ac" value={activity} onChange={(e) => setActivity(e.target.value)} maxLength={2000} rows={5} placeholder="Describe what you did, where, and when." />
          </div>
          <div className="flex justify-between items-center pt-2">
            <Link to="/forms" className="text-sm text-muted-foreground hover:text-primary">← My forms</Link>
            <Button onClick={submit} disabled={busy}>
              <Send className="w-4 h-4 mr-2" />{busy ? "Sending…" : "Generate & send"}
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
