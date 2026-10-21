import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { AlertCircle, CheckCircle2, Loader2, LockKeyhole, LogOut, Youtube } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import YouTubeDownloader from "@/components/YouTubeDownloader";

function hasGoogleIdentity(session: Session | null): boolean {
  if (!session) return false;
  const providers = session.user.app_metadata?.providers;
  return (
    session.user.app_metadata?.provider === "google" ||
    (Array.isArray(providers) && providers.includes("google")) ||
    session.user.identities?.some((identity) => identity.provider === "google") === true
  );
}

export default function YouTubeAccountGate() {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setInitializing(false);
    });
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return;
      setSession(data.session);
      setInitializing(false);
      if (sessionError) setError("Could not restore Google sign-in. Try again.");
    }).catch(() => {
      if (mounted) {
        setInitializing(false);
        setError("Google sign-in is temporarily unavailable.");
      }
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const googleLinked = hasGoogleIdentity(session);

  async function signIn() {
    if (working) return;
    setWorking(true);
    setError(null);
    try {
      // Basic Google identity only. No YouTube Data API scope, Google password,
      // cookies, refresh token, or OAuth credential is sent to a media processor.
      // For managed Google OAuth, avoid custom scopes that require an app-specific
      // Google Cloud OAuth consent configuration and verification.
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + window.location.pathname,
          queryParams: { prompt: "select_account" },
        },
      });
      if (authError) throw authError;
      // The browser navigates to Google's hosted sign-in page on success.
    } catch (err) {
      const message = err instanceof Error ? err.message : "Google sign-in failed.";
      setError(
        /missing OAuth secret|provider is not enabled|Unsupported provider/i.test(message)
          ? "Google authentication is not fully configured in the site's backend yet. Please try again later."
          : message
      );
      setWorking(false);
    }
  }

  async function signOut() {
    setWorking(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signOut();
      if (authError) throw authError;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign out.");
    } finally {
      setWorking(false);
    }
  }

  if (initializing) {
    return (
      <div role="status" className="theme-youtube max-w-xl mx-auto py-20 flex justify-center items-center gap-2 text-dim">
        <Loader2 className="w-5 h-5 animate-spin" /> Checking Google sign-in…
      </div>
    );
  }

  return (
    <div className="theme-youtube w-full max-w-xl mx-auto space-y-6">
      {googleLinked && session ? (
        <section aria-label="Connected Google account" className="surface-elevated rounded-2xl border border-border p-4 flex items-center gap-3">
          {typeof session.user.user_metadata?.avatar_url === "string" ? (
            <img src={session.user.user_metadata.avatar_url} referrerPolicy="no-referrer" alt="Google profile" className="w-10 h-10 object-cover rounded-full" />
          ) : (
            <span className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center"><Youtube className="w-5 h-5" /></span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-heading truncate">
              {session.user.user_metadata?.full_name || session.user.email || "Google account"}
            </p>
            <p className="text-xs text-accent flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Signed in with Google</p>
          </div>
          <button type="button" onClick={() => void signOut()} disabled={working}
            className="shrink-0 px-3 py-2 rounded-xl text-xs flex gap-1.5 items-center text-heading bg-secondary hover:bg-secondary/80 disabled:opacity-50">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </section>
      ) : (
        <section className="surface-elevated rounded-2xl border border-border px-6 py-8 sm:px-8 space-y-5 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center">
            <Youtube className="w-9 h-9 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-heading">Sign in with YouTube</h2>
            <p className="text-sm text-body">Continue with Google, then paste a YouTube video or Shorts link and choose a download format.</p>
          </div>
          <button type="button" onClick={() => void signIn()} disabled={working}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/85 disabled:opacity-60">
            {working ? <Loader2 className="w-5 h-5 animate-spin" /> : <LockKeyhole className="w-5 h-5" />}
            {working ? "Redirecting to Google…" : "Continue with Google"}
          </button>
          <p className="text-xs text-dim">Google handles the login. This site never asks for your Google password or YouTube cookies.</p>
        </section>
      )}
      {error && (
        <div role="alert" className="rounded-xl p-3 bg-destructive/10 text-destructive text-sm flex gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span>
        </div>
      )}
      {googleLinked && (
        <>
          <YouTubeDownloader />
          <p className="text-xs text-center text-dim px-4">
            Google sign-in confirms your account but does not bypass YouTube restrictions or grant download access to restricted videos.
          </p>
        </>
      )}
    </div>
  );
}
