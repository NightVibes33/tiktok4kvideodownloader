import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { CheckCircle2, Loader2, LogOut, ShieldCheck, UserRound, Youtube } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { isGoogleAccount } from "@/lib/youtube-account";
import YouTubeDownloader from "./YouTubeDownloader";

export default function YouTubeAccountGate() {
  const [user, setUser] = useState<User | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const validateRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    let active = true;
    let revision = 0;
    const validate = async () => {
      const current = ++revision;
      setUser(null);
      setRestoring(true);
      try {
        const { data, error: authError } = await supabase.auth.getUser();
        if (!active || current !== revision) return;
        if (authError && authError.name !== "AuthSessionMissingError") {
          setError("Your account could not be verified. Please sign in again.");
        }
        setUser(!authError && isGoogleAccount(data.user) ? data.user : null);
      } catch {
        if (active && current === revision) setError("Could not verify your account. Please try again.");
      } finally {
        if (active && current === revision) setRestoring(false);
      }
    };
    validateRef.current = validate;
    // Register before the initial read. Never await Auth calls inside this listener.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (!active) return;
      if (event === "SIGNED_OUT") {
        ++revision;
        setUser(null);
        setRestoring(false);
        setBusy(false);
      } else {
        setUser(null);
        setRestoring(true);
        queueMicrotask(() => { if (active) void validate(); });
      }
    });
    void validate();
    return () => { active = false; ++revision; subscription.unsubscribe(); };
  }, []);

  const signIn = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        // This is a public sign-in screen, not a protected redirect destination.
        redirect_uri: new URL("youtube", window.location.origin + import.meta.env.BASE_URL).href,
        extraParams: { prompt: "select_account" },
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      // A successful helper result alone is not proof of a valid Google session.
      await validateRef.current();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Google sign-in could not be completed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    setBusy(true);
    setError(null);
    // Hide and unmount the downloader immediately, including any prior results.
    setUser(null);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError("Sign-out could not be completed. Please try again.");
    setBusy(false);
  };

  if (restoring) {
    return <section className="theme-youtube min-h-80 flex items-center justify-center gap-3 text-primary" role="status" aria-live="polite">
      <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" />
      <span>Checking your Google account…</span>
    </section>;
  }

  if (user) {
    const google = user.identities?.find((identity) => identity.provider === "google")?.identity_data;
    const name = String(google?.full_name || google?.name || user.email || "Google account");
    const email = String(google?.email || user.email || "");
    return <section className="theme-youtube space-y-8">
      <header className="mx-auto max-w-xl flex items-center gap-3 border-b border-border pb-5">
        <UserRound className="h-8 w-8 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-primary flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" />Google connected</p>
          <p className="font-medium text-heading break-words">{name}</p>
          {email && email !== name && <p className="text-xs text-dim break-all">{email}</p>}
        </div>
        <Button variant="outline" size="sm" onClick={signOut} disabled={busy}><LogOut />Sign out</Button>
      </header>
      {error && <p role="alert" className="text-destructive text-sm text-center">{error}</p>}
      <YouTubeDownloader />
    </section>;
  }

  return <section className="theme-youtube mx-auto max-w-md py-8 sm:py-16 text-center space-y-8">
    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 glow-primary">
      <Youtube className="h-11 w-11 text-primary" strokeWidth={1.5} />
    </div>
    <div className="space-y-3">
      <p className="font-mono text-xs uppercase tracking-widest text-primary">Your account · Your videos</p>
      <h1 className="text-3xl sm:text-4xl font-bold text-heading">Sign in with YouTube</h1>
      <p className="text-dim text-sm leading-relaxed">Connect your Google account to continue.</p>
    </div>
    <div className="space-y-4">
      <Button onClick={signIn} disabled={busy} size="lg" className="w-full h-14 text-base">
        {busy ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <span aria-hidden="true" className="text-xl font-bold">G</span>}
        {busy ? "Connecting…" : "Continue with Google"}
      </Button>
      {error && <p role="alert" className="text-sm text-destructive break-words">{error}</p>}
      <p className="flex items-center justify-center gap-2 text-xs text-dim"><ShieldCheck className="h-4 w-4 text-accent" />Basic Google account access only</p>
    </div>
    <p className="text-xs text-dim leading-relaxed border-t border-border pt-6">
      <Link to="/privacy-policy" className="underline underline-offset-4 hover:text-primary">Privacy Policy</Link>
      <span className="mx-3">·</span>
      <Link to="/terms" className="underline underline-offset-4 hover:text-primary">Terms of Service</Link>
    </p>
  </section>;
}