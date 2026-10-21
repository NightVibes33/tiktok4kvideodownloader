import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { AlertCircle, CheckCircle2, Loader2, LockKeyhole, LogOut, Youtube } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import YouTubeDownloader from "@/components/YouTubeDownloader";

const YOUTUBE_READ_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";

type Channel = { id: string; title: string; thumbnail?: string };
type ChannelState = "loading" | "verified" | "unavailable" | "no-channel" | "not-checked";

function hasGoogleIdentity(session: Session | null): boolean {
  if (!session) return false;
  const providers = session.user.app_metadata?.providers;
  return session.user.app_metadata?.provider === "google" ||
    (Array.isArray(providers) && providers.includes("google")) ||
    session.user.identities?.some((identity) => identity.provider === "google") === true;
}

function accountName(session: Session): string {
  const meta = session.user.user_metadata;
  return typeof meta?.full_name === "string" && meta.full_name.trim()
    ? meta.full_name : session.user.email || "Google account";
}

function YouTubeAccountGate() {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [channelState, setChannelState] = useState<ChannelState>("not-checked");

  useEffect(() => {
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        setSession(nextSession);
        setInitializing(false);
        setError(null);
      }
    });
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return;
      setSession(data.session);
      setInitializing(false);
      if (sessionError) setError("Could not restore your sign-in. Please try again.");
    }).catch(() => {
      if (mounted) {
        setInitializing(false);
        setError("Sign-in is temporarily unavailable.");
      }
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const googleLinked = hasGoogleIdentity(session);

  useEffect(() => {
    const providerToken = googleLinked ? session?.provider_token : undefined;
    if (!providerToken) {
      setChannel(null);
      setChannelState(googleLinked ? "unavailable" : "not-checked");
      return;
    }
    // Only Google receives the user-scoped OAuth token. Never send it to Cobalt,
    // yt-dlp, logs or a custom backend. Token data stays in this session.
    const controller = new AbortController();
    setChannel(null);
    setChannelState("loading");
    void fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", {
      headers: { Authorization: "Bearer " + providerToken, Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error("YouTube channel lookup unavailable");
      const value = await response.json() as {
        items?: Array<{ id?: string; snippet?: { title?: string; thumbnails?: { default?: { url?: string } } } }>;
      };
      if (controller.signal.aborted) return;
      const item = value.items?.[0];
      if (!item?.id || !item?.snippet?.title) {
        setChannelState("no-channel");
        return;
      }
      setChannel({ id: item.id, title: item.snippet.title, thumbnail: item.snippet.thumbnails?.default?.url });
      setChannelState("verified");
    }).catch(() => {
      if (!controller.signal.aborted) setChannelState("unavailable");
    });
    return () => controller.abort();
  }, [session?.provider_token, googleLinked]);

  const signIn = async () => {
    if (working) return;
    setWorking(true);
    setError(null);
    try {
      const callbackUrl = new URL(window.location.href);
      callbackUrl.search = "";
      callbackUrl.hash = "";
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
          scopes: YOUTUBE_READ_SCOPE,
          queryParams: {
            access_type: "online",
            prompt: "select_account consent",
          },
        },
      });
      if (oauthError) throw oauthError;
      // Supabase navigates to Google's real consent screen.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
      setWorking(false);
    }
  };

  const signOut = async () => {
    setWorking(true);
    setError(null);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      setChannel(null);
      setChannelState("not-checked");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign out.");
    } finally {
      setWorking(false);
    }
  };

  if (initializing) {
    return <div className="theme-youtube max-w-xl mx-auto flex items-center justify-center gap-2 py-20 text-dim" role="status">
      <Loader2 className="w-5 h-5 animate-spin" /> Checking your Google sign-in…
    </div>;
  }

  return (
    <div className="theme-youtube w-full max-w-xl mx-auto space-y-6">
      {googleLinked && session ? (
        <section aria-label="YouTube account" className="surface-elevated rounded-2xl border border-border p-4 flex items-center gap-3">
          {typeof session.user.user_metadata?.avatar_url === "string" ? (
            <img className="w-10 h-10 rounded-full object-cover" src={session.user.user_metadata.avatar_url} alt="Google account" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/15 text-primary">
              <Youtube className="w-5 h-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-heading truncate">{accountName(session)}</p>
            {channelState === "verified" && channel ? (
              <p className="text-xs text-accent flex items-center gap-1 truncate"><CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> YouTube: {channel.title}</p>
            ) : channelState === "loading" ? (
              <p className="text-xs text-dim">Checking YouTube channel…</p>
            ) : (
              <p className="text-xs text-dim">Google signed in · YouTube channel not verified</p>
            )}
          </div>
          <button onClick={() => void signOut()} disabled={working} type="button"
            className="shrink-0 flex items-center gap-1.5 py-2 px-3 bg-secondary rounded-xl text-xs font-medium text-heading hover:bg-secondary/80 disabled:opacity-50"
            aria-label="Sign out of Google account">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </section>
      ) : (
        <section className="surface-elevated rounded-2xl border border-border p-6 sm:p-8 space-y-5 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center">
            <Youtube className="w-9 h-9 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-heading">Sign in with YouTube</h2>
            <p className="text-sm text-body">
              Continue with your Google account to access the YouTube downloader.
              We'll request read-only permission to identify your YouTube channel.
            </p>
          </div>
          <button type="button" onClick={() => void signIn()} disabled={working}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/85 disabled:opacity-60 transition-colors">
            {working ? <Loader2 className="w-5 h-5 animate-spin" /> : <LockKeyhole className="w-5 h-5" />}
            {working ? "Redirecting to Google…" : "Continue with Google"}
          </button>
          <p className="text-xs text-dim">Authentication uses Google's sign-in page. Your Google password is never entered into this site.</p>
        </section>
      )}
      {error && <div role="alert" className="rounded-xl p-3 bg-destructive/10 text-destructive text-sm flex gap-2">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span>
      </div>}
      {googleLinked && (
        <>
          <YouTubeDownloader />
          <p className="text-xs text-dim text-center px-4">
            Signing in confirms your Google identity; it does not unlock private or restricted videos
            or provide YouTube download cookies. Downloads still depend on the available media processor.
          </p>
        </>
      )}
    </div>
  );
}

export default YouTubeAccountGate;
