import { createFileRoute, useNavigate, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Plus, Download, Clock, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/forms")({ component: MyForms });

interface Form {
  id: string;
  supervisor_name: string;
  hours: number;
  activity_description: string;
  status: string;
  unsigned_pdf_url: string | null;
  signed_pdf_url: string | null;
  signed_at: string | null;
  decline_reason: string | null;
  created_at: string;
}

function MyForms() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [forms, setForms] = useState<Form[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("volunteer_forms")
        .select("id,supervisor_name,hours,activity_description,status,unsigned_pdf_url,signed_pdf_url,signed_at,decline_reason,created_at")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });
      setForms((data ?? []) as Form[]);
    })();
  }, [user]);

  if (!user) return null;
  if (location.pathname !== "/forms") return <Outlet />;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-accent/15">
              <FileText className="w-5 h-5 text-accent" />
            </span>
            <div>
              <h1 className="font-display font-bold text-3xl">My forms</h1>
              <p className="text-sm text-muted-foreground">Volunteer hour forms sent to supervisors.</p>
            </div>
          </div>
          <Button asChild>
            <Link to="/forms/new"><Plus className="w-4 h-4 mr-1" />New form</Link>
          </Button>
        </div>

        <div className="mt-6 space-y-3">
          {forms.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">
              No forms yet. <Link to="/forms/new" className="text-primary underline">Create your first one</Link>.
            </Card>
          )}
          {forms.map((f) => (
            <Card key={f.id} className="p-5">
              <div className="flex justify-between items-start gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="font-display font-bold">To {f.supervisor_name} • {f.hours} hours</div>
                  <div className="text-sm text-muted-foreground line-clamp-2">{f.activity_description}</div>
                  <div className="text-xs text-muted-foreground mt-1">Sent {new Date(f.created_at).toLocaleString()}</div>
                </div>
                <StatusBadge status={f.status} />
              </div>
              {f.status === "declined" && f.decline_reason && (
                <div className="mt-3 p-3 rounded-lg bg-destructive/10 text-sm text-destructive">
                  Reason: {f.decline_reason}
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {f.unsigned_pdf_url && (
                  <a href={f.unsigned_pdf_url} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" />Original</Button>
                  </a>
                )}
                {f.signed_pdf_url && (
                  <a href={f.signed_pdf_url} target="_blank" rel="noreferrer">
                    <Button size="sm"><Download className="w-4 h-4 mr-1" />Signed PDF</Button>
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "signed")
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-secondary/40 text-primary"><CheckCircle2 className="w-3.5 h-3.5" />Signed</span>;
  if (status === "declined")
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-destructive/15 text-destructive"><XCircle className="w-3.5 h-3.5" />Declined</span>;
  return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground"><Clock className="w-3.5 h-3.5" />Pending</span>;
}
