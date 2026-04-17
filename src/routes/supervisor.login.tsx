import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Shield } from "lucide-react";

export const Route = createFileRoute("/supervisor/login")({ component: SupervisorLogin });

function SupervisorLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, isSupervisor, refreshRoles } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && isSupervisor) navigate({ to: "/supervisor" });
  }, [user, isSupervisor, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Verify the signed-in user has the supervisor role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);

      const hasSupervisor = (roles ?? []).some((r) => r.role === "supervisor");
      if (!hasSupervisor) {
        await supabase.auth.signOut();
        throw new Error("This account is not authorized as a supervisor.");
      }

      await refreshRoles();
      toast.success("Welcome, supervisor.");
      navigate({ to: "/supervisor" });
    } catch (err: any) {
      toast.error(err.message ?? "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-hero)" }}>
      <Header />
      <div className="max-w-md mx-auto px-4 pt-12 pb-20">
        <Card className="p-8 shadow-[var(--shadow-warm)]">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-accent/15">
              <Shield className="w-5 h-5 text-accent" />
            </span>
            <div>
              <h1 className="font-display font-bold text-2xl">Supervisor sign in</h1>
              <p className="text-sm text-muted-foreground">Restricted access</p>
            </div>
          </div>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in as supervisor"}
            </Button>
          </form>
          <p className="mt-4 text-xs text-muted-foreground text-center">
            Only authorized supervisor accounts can sign in here.
          </p>
        </Card>
      </div>
    </div>
  );
}
