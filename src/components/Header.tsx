import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Leaf, LogOut, Shield } from "lucide-react";

export function Header() {
  const { user, isSupervisor, signOut } = useAuth();
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg text-primary">
          <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-warm)" }}>
            <Leaf className="w-5 h-5 text-primary-foreground" />
          </span>
          <span>Markham Cleanup</span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              <Link to="/dashboard" className="text-sm font-medium text-foreground/80 hover:text-primary px-3 py-2">Map</Link>
              <Link to="/my-hours" className="text-sm font-medium text-foreground/80 hover:text-primary px-3 py-2 hidden sm:inline">My Hours</Link>
              {isSupervisor && (
                <Link to="/supervisor" className="text-sm font-medium text-accent hover:opacity-80 px-3 py-2 flex items-center gap-1">
                  <Shield className="w-4 h-4" /> Review
                </Link>
              )}
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Link to="/auth"><Button variant="default" size="sm">Sign in</Button></Link>
          )}
        </nav>
      </div>
    </header>
  );
}
