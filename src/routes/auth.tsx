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

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [affiliationType, setAffiliationType] = useState<"school" | "other">("school");
  const [school, setSchool] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const trimmedSchool = school.trim();
        if (!trimmedSchool) {
          toast.error(affiliationType === "school" ? "Please enter your school name." : "Please enter your organization or 'None'.");
          setLoading(false);
          return;
        }
        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: name, school: trimmedSchool },
          },
        });
        if (error) throw error;
        // Persist school on profile (handle_new_user creates the row, then we update it)
        if (signUpData.user) {
          await supabase.from("profiles").update({ school: trimmedSchool, full_name: name }).eq("id", signUpData.user.id);
        }
        toast.success("Account created! You can start cleaning up.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-hero)" }}>
      <Header />
      <div className="max-w-md mx-auto px-4 pt-12 pb-20">
        <Card className="p-8 shadow-[var(--shadow-warm)]">
          <h1 className="font-display font-bold text-3xl">{mode === "signin" ? "Welcome back" : "Join the cleanup"}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "signin" ? "Sign in to log volunteer hours." : "Create your volunteer account."}
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <>
                <div>
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
                </div>
                <div>
                  <Label>Are you a student?</Label>
                  <div className="flex gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => { setAffiliationType("school"); setSchool(""); }}
                      className={`flex-1 px-3 py-2 rounded-md border text-sm font-medium transition ${
                        affiliationType === "school" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"
                      }`}
                    >
                      Yes, I'm a student
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAffiliationType("other"); setSchool(""); }}
                      className={`flex-1 px-3 py-2 rounded-md border text-sm font-medium transition ${
                        affiliationType === "other" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"
                      }`}
                    >
                      Not in school
                    </button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="school">
                    {affiliationType === "school" ? "School name" : "Organization (or type 'None')"}
                  </Label>
                  <Input
                    id="school"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    placeholder={affiliationType === "school" ? "e.g. Markville Secondary School" : "e.g. Markham Rotary Club, or None"}
                    required
                    maxLength={120}
                  />
                </div>
              </>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-4 text-sm text-muted-foreground hover:text-primary w-full text-center"
          >
            {mode === "signin" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </Card>
      </div>
    </div>
  );
}
