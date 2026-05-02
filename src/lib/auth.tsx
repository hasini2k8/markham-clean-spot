import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { isNative } from "@/lib/platform";

type Role = "volunteer" | "supervisor";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  roles: Role[];
  loading: boolean;
  isSupervisor: boolean;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRoles = async (uid: string) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    setRoles((data ?? []).map((r) => r.role as Role));
  };

  useEffect(() => {
    // 1. Subscribe FIRST so we don't miss SIGNED_IN events fired during init.
    //    Do NOT await supabase calls inside the callback — defer with setTimeout
    //    to avoid deadlocks (especially on Capacitor webviews returning from OAuth).
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const uid = s.user.id;
        setTimeout(() => {
          loadRoles(uid);
        }, 0);
      } else {
        setRoles([]);
      }
    });

    // 2. On Capacitor / native: OAuth tokens may come back in the URL hash
    //    at capacitor://localhost. Try to exchange/restore the session
    //    explicitly so the listener above fires.
    const init = async () => {
      try {
        if (isNative() && typeof window !== "undefined") {
          const hash = window.location.hash || "";
          if (hash.includes("access_token") || hash.includes("refresh_token")) {
            // Let supabase parse tokens from the URL; detectSessionInUrl handles this on getSession().
            // Clear the hash afterwards so we don't re-process it.
            await supabase.auth.getSession();
            try {
              window.history.replaceState(null, "", window.location.pathname);
            } catch {
              // ignore
            }
          }
        }

        const { data: { session: s } } = await supabase.auth.getSession();
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) await loadRoles(s.user.id);
      } finally {
        setLoading(false);
      }
    };
    init();

    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthCtx = {
    user,
    session,
    roles,
    loading,
    isSupervisor: roles.includes("supervisor"),
    signOut: async () => {
      await supabase.auth.signOut();
    },
    refreshRoles: async () => {
      if (user) await loadRoles(user.id);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be inside AuthProvider");
  return v;
}
