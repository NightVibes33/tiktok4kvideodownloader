import { useState, useRef } from "react";
import {
  User, Loader2, Link2, Heart, MessageCircle, Share2, Eye, TrendingUp,
  Clock, Calendar, BarChart3, Trophy, Flame, X, ClipboardPaste, BadgeCheck,
  Play, Music, Hash, Bookmark,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/* ── Types ── */

interface VideoItem {
  id: string;
  description: string;
  createTime: number;
  cover: string;
  likes: number;
  comments: number;
  shares: number;
  plays: number;
  duration: number;
}

interface ProfileData {
  username: string;
  nickname: string;
  avatar: string;
  bio: string;
  verified: boolean;
  followers: number;
  following: number;
  likes: number;
  videoCount: number;
  videos: VideoItem[];
  engagement: {
    avgLikes: number;
    avgComments: number;
    avgShares: number;
    avgPlays: number;
    engagementRate: number;
    topVideos: VideoItem[];
  };
  bestPostingTimes: {
    dayOfWeek: string;
    hour: number;
    avgEngagement: number;
    videoCount: number;
  }[];
  postingFrequency: {
    avgDaysBetweenPosts: number;
    mostActiveDay: string;
    postsPerWeek: number;
  };
}

interface VideoStatsData {
  id: string;
  description: string;
  createTime: number;
  author: { username: string; nickname: string; avatar: string; verified: boolean };
  music: { title: string; author: string };
  cover: string;
  duration: number;
  likes: number;
  comments: number;
  shares: number;
  plays: number;
  saves: number;
  hashtags: string[];
}

type TabMode = "profile" | "video";

/* ── Helpers ── */

function fmt(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toString();
}

function formatHour(h: number): string {
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 || 12;
  return `${hr}${ampm}`;
}

function timeAgo(ts: number): string {
  if (!ts) return "";
  const diff = Date.now() / 1000 - ts;
  const days = Math.floor(diff / 86400);
  if (days < 1) return "today";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function formatDuration(sec: number): string {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ── Sub-components ── */

function StatCard({ icon: Icon, label, value, accent = false }: {
  icon: any; label: string; value: string; accent?: boolean;
}) {
  return (
    <div className="p-3 rounded-xl bg-secondary/50 ring-1 ring-border/50 space-y-1">
      <div className="flex items-center gap-1.5">
        <Icon className={`w-3 h-3 ${accent ? "text-accent" : "text-primary"}`} />
        <span className="text-[10px] text-dim uppercase tracking-widest font-mono">{label}</span>
      </div>
      <p className="text-lg font-bold text-heading tabular">{value}</p>
    </div>
  );
}

function EngagementCard({ data, isEstimated }: { data: ProfileData["engagement"]; isEstimated: boolean }) {
  const ratingLabel = data.engagementRate > 10
    ? { emoji: "🔥", text: "Viral", color: "text-accent" }
    : data.engagementRate > 5
    ? { emoji: "🔥", text: "Excellent", color: "text-accent" }
    : data.engagementRate > 2
    ? { emoji: "✅", text: "Good", color: "text-primary" }
    : data.engagementRate > 1
    ? { emoji: "📊", text: "Average", color: "text-muted-foreground" }
    : { emoji: "📉", text: "Below Average", color: "text-muted-foreground" };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-heading flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          Engagement Metrics
        </h3>
        {isEstimated ? (
          <span className="text-[9px] text-muted-foreground font-mono bg-secondary/80 px-2.5 py-1 rounded-full ring-1 ring-border/50 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400/70" />
            ESTIMATED
          </span>
        ) : (
          <span className="text-[9px] text-accent font-mono bg-accent/10 px-2.5 py-1 rounded-full ring-1 ring-accent/20 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            REAL DATA
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatCard icon={Heart} label="Avg Likes" value={fmt(data.avgLikes)} />
        <StatCard icon={MessageCircle} label="Avg Comments" value={fmt(data.avgComments)} accent />
        <StatCard icon={Share2} label="Avg Shares" value={fmt(data.avgShares)} />
        <StatCard icon={Eye} label="Avg Views" value={fmt(data.avgPlays)} accent />
      </div>

      <div className="p-4 rounded-xl bg-primary/10 ring-1 ring-primary/20 text-center">
        <p className="text-[10px] text-dim uppercase tracking-widest font-mono mb-1">
          Engagement Rate {isEstimated ? "" : "(interactions / views)"}
        </p>
        <p className="text-3xl font-bold text-heading">{data.engagementRate}%</p>
        <p className={`text-xs mt-1 font-medium ${ratingLabel.color}`}>
          {ratingLabel.emoji} {ratingLabel.text}
        </p>
      </div>

      {isEstimated && (
        <div className="p-3 rounded-xl bg-secondary/30 ring-1 ring-border/30">
          <p className="text-[10px] text-dim text-center font-mono leading-relaxed">
            ⚠️ Stats estimated from profile totals. Use the Video Stats tab
            to get exact data for individual videos.
          </p>
        </div>
      )}
    </div>
  );
}

function BestTimesCard({ times, frequency }: {
  times: ProfileData["bestPostingTimes"];
  frequency: ProfileData["postingFrequency"];
}) {
  const top5 = times.slice(0, 5);
  const maxEng = top5[0]?.avgEngagement || 1;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-heading flex items-center gap-2">
        <Clock className="w-4 h-4 text-accent" />
        Best Posting Times (UTC)
      </h3>

      {top5.length > 0 ? (
        <div className="space-y-2">
          {top5.map((slot, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 ring-1 ring-border/50">
              <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center shrink-0 font-bold text-xs">
                #{i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-heading">
                  {slot.dayOfWeek} at {formatHour(slot.hour)}
                </p>
                <div className="mt-1.5 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                    style={{ width: `${(slot.avgEngagement / maxEng) * 100}%` }}
                  />
                </div>
              </div>
              <span className="text-[10px] text-dim font-mono shrink-0">
                {slot.videoCount} vid{slot.videoCount !== 1 ? "s" : ""}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-dim">Not enough data to calculate optimal posting times.</p>
      )}

      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-xl bg-secondary/50 ring-1 ring-border/50 text-center">
          <p className="text-[10px] text-dim uppercase tracking-widest font-mono">Posts/Week</p>
          <p className="text-lg font-bold text-heading mt-1">{frequency.postsPerWeek}</p>
        </div>
        <div className="p-3 rounded-xl bg-secondary/50 ring-1 ring-border/50 text-center">
          <p className="text-[10px] text-dim uppercase tracking-widest font-mono">Most Active</p>
          <p className="text-sm font-bold text-heading mt-1">{frequency.mostActiveDay.slice(0, 3)}</p>
        </div>
        <div className="p-3 rounded-xl bg-secondary/50 ring-1 ring-border/50 text-center">
          <p className="text-[10px] text-dim uppercase tracking-widest font-mono">Avg Gap</p>
          <p className="text-lg font-bold text-heading mt-1">{frequency.avgDaysBetweenPosts}d</p>
        </div>
      </div>
    </div>
  );
}

function TopVideos({ videos }: { videos: VideoItem[] }) {
  if (videos.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-heading flex items-center gap-2">
        <Trophy className="w-4 h-4 text-primary" />
        Top Performing Videos
      </h3>
      <div className="space-y-2">
        {videos.map((v, i) => (
          <div key={v.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 ring-1 ring-border/50">
            {v.cover && (
              <img src={v.cover} alt="" className="w-10 h-14 rounded-lg object-cover shrink-0 bg-secondary" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-heading truncate">
                {v.description || `Video #${i + 1}`}
              </p>
              <div className="flex gap-3 mt-1 text-[10px] text-dim font-mono">
                <span className="flex items-center gap-1"><Heart className="w-2.5 h-2.5" /> {fmt(v.likes)}</span>
                <span className="flex items-center gap-1"><Eye className="w-2.5 h-2.5" /> {fmt(v.plays)}</span>
                <span className="flex items-center gap-1"><MessageCircle className="w-2.5 h-2.5" /> {fmt(v.comments)}</span>
              </div>
              <p className="text-[10px] text-dim/60 font-mono mt-0.5">{timeAgo(v.createTime)}</p>
            </div>
            <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 font-bold text-[10px]">
              {i + 1}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Video Stats Results ── */

function VideoStatsResults({ data }: { data: VideoStatsData }) {
  const engagementRate = data.plays > 0
    ? Math.round(((data.likes + data.comments + data.shares) / data.plays) * 10000) / 100
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-500">
      {/* Video header */}
      <div className="surface-elevated rounded-2xl p-5 space-y-4">
        <div className="flex items-start gap-4">
          {data.cover && (
            <img
              src={data.cover}
              alt="Video thumbnail"
              className="w-20 h-28 rounded-xl object-cover ring-2 ring-accent/30 shrink-0"
            />
          )}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              {data.author.avatar && (
                <img src={data.author.avatar} alt="" className="w-6 h-6 rounded-full" />
              )}
              <span className="text-sm font-bold text-heading">@{data.author.username}</span>
              {data.author.verified && <BadgeCheck className="w-3.5 h-3.5 text-accent" />}
            </div>
            <p className="text-xs text-body leading-relaxed line-clamp-3">{data.description}</p>
            <div className="flex flex-wrap gap-2">
              {data.duration > 0 && (
                <span className="text-[10px] text-dim font-mono flex items-center gap-1">
                  <Play className="w-2.5 h-2.5" /> {formatDuration(data.duration)}
                </span>
              )}
              {data.createTime > 0 && (
                <span className="text-[10px] text-dim font-mono flex items-center gap-1">
                  <Calendar className="w-2.5 h-2.5" /> {timeAgo(data.createTime)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Music */}
        {data.music.title && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary/50 ring-1 ring-border/50">
            <Music className="w-3.5 h-3.5 text-primary shrink-0" />
            <p className="text-xs text-heading truncate">{data.music.title}</p>
            <span className="text-[10px] text-dim shrink-0">— {data.music.author}</span>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="surface-elevated rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-heading flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Video Statistics
          </h3>
          <span className="text-[9px] text-accent font-mono bg-accent/10 px-2.5 py-1 rounded-full ring-1 ring-accent/20 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            REAL DATA
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <StatCard icon={Eye} label="Views" value={fmt(data.plays)} accent />
          <StatCard icon={Heart} label="Likes" value={fmt(data.likes)} />
          <StatCard icon={MessageCircle} label="Comments" value={fmt(data.comments)} accent />
          <StatCard icon={Share2} label="Shares" value={fmt(data.shares)} />
          <StatCard icon={Bookmark} label="Saves" value={fmt(data.saves)} />
          <div className="p-3 rounded-xl bg-primary/10 ring-1 ring-primary/20 space-y-1">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3 text-primary" />
              <span className="text-[10px] text-dim uppercase tracking-widest font-mono">Eng. Rate</span>
            </div>
            <p className="text-lg font-bold text-heading">{engagementRate}%</p>
          </div>
        </div>
      </div>

      {/* Hashtags */}
      {data.hashtags.length > 0 && (
        <div className="surface-elevated rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-heading flex items-center gap-2">
            <Hash className="w-4 h-4 text-accent" />
            Hashtags
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {data.hashtags.map((tag, i) => (
              <span
                key={i}
                className="text-xs font-mono px-2.5 py-1 rounded-full bg-accent/10 text-accent ring-1 ring-accent/20"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main ── */

export default function ProfileAnalyzerTool() {
  const [tab, setTab] = useState<TabMode>("profile");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [videoStats, setVideoStats] = useState<VideoStatsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setProfile(null);
    setVideoStats(null);

    try {
      if (tab === "profile") {
        const { data, error: fnError } = await supabase.functions.invoke("tiktok-profile", {
          body: { url: trimmed },
        });
        if (fnError) throw new Error(fnError.message);
        if (data?.error) throw new Error(data.error);
        if (!data?.username) throw new Error("Could not extract profile data.");
        setProfile(data);
      } else {
        const { data, error: fnError } = await supabase.functions.invoke("tiktok-video-stats", {
          body: { url: trimmed },
        });
        if (fnError) throw new Error(fnError.message);
        if (data?.error) throw new Error(data.error);
        if (!data?.id) throw new Error("Could not extract video data.");
        setVideoStats(data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to analyze");
    } finally {
      setLoading(false);
    }
  };

  const handlePasteButton = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        inputRef.current?.focus();
      }
    } catch { /* ignore */ }
  };

  const switchTab = (t: TabMode) => {
    setTab(t);
    setError(null);
    setProfile(null);
    setVideoStats(null);
    setUrl("");
  };

  const placeholder = tab === "profile"
    ? "@username or https://tiktok.com/@username"
    : "Paste TikTok video link";

  return (
    <div className="w-full max-w-xl mx-auto space-y-8 selection:bg-primary/30 selection:text-primary-foreground">
      {/* Header */}
      <div className="space-y-4 text-center">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center ring-2 ring-accent/30 shadow-lg shadow-accent/10">
            <BarChart3 className="w-8 h-8 text-accent" />
          </div>
        </div>
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-heading tracking-tight">
            TikTok <span className="text-gradient">Analyzer</span>
          </h1>
          <p className="text-sm text-dim mt-2 flex items-center justify-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-primary" />
            Profile insights · Video stats · Engagement data
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-center gap-1 p-1 rounded-2xl bg-secondary/50 ring-1 ring-border/50">
        <button
          onClick={() => switchTab("profile")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
            tab === "profile"
              ? "bg-accent text-accent-foreground shadow-lg shadow-accent/20"
              : "text-muted-foreground hover:text-heading"
          }`}
        >
          <User className="w-4 h-4" />
          Profile
        </button>
        <button
          onClick={() => switchTab("video")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
            tab === "video"
              ? "bg-accent text-accent-foreground shadow-lg shadow-accent/20"
              : "text-muted-foreground hover:text-heading"
          }`}
        >
          <Play className="w-4 h-4" />
          Video Stats
        </button>
      </div>

      {/* Input */}
      <form onSubmit={handleFetch} className="relative group space-y-2">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-accent/20 to-primary/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
        <div className="relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            {loading ? (
              <Loader2 className="w-4 h-4 text-accent animate-spin" />
            ) : tab === "profile" ? (
              <User className="w-4 h-4 text-muted-foreground group-focus-within:text-accent transition-colors ease-expo duration-200" />
            ) : (
              <Play className="w-4 h-4 text-muted-foreground group-focus-within:text-accent transition-colors ease-expo duration-200" />
            )}
          </div>
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            className="w-full bg-secondary/80 backdrop-blur-sm border-0 ring-1 ring-border focus:ring-2 focus:ring-accent/50 rounded-2xl py-4 pl-11 pr-32 text-heading placeholder:text-muted-foreground transition-all ease-expo duration-200 outline-none text-sm"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          {url && !loading && (
            <button
              type="button"
              onClick={() => { setUrl(""); setError(null); setProfile(null); setVideoStats(null); inputRef.current?.focus(); }}
              className="absolute right-[6.5rem] top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-heading hover:bg-secondary transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="absolute right-2 top-2 bottom-2 px-5 bg-accent hover:bg-accent/85 disabled:bg-secondary text-accent-foreground disabled:text-muted-foreground font-semibold rounded-xl text-sm transition-all ease-expo duration-200 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="hidden sm:inline">Analyzing</span>
              </>
            ) : (
              "Analyze"
            )}
          </button>
        </div>
        {!url && !loading && !profile && !videoStats && (
          <button
            type="button"
            onClick={handlePasteButton}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-xs text-dim hover:text-heading rounded-xl bg-secondary/40 hover:bg-secondary/70 ring-1 ring-border/30 hover:ring-border transition-all duration-200"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            Paste from clipboard
          </button>
        )}
      </form>

      {/* Error */}
      {error && (
        <div className="p-4 bg-destructive/10 ring-1 ring-destructive/20 rounded-2xl text-destructive text-sm animate-in fade-in slide-in-from-top-2 duration-300">
          {error}
        </div>
      )}

      {/* Profile Results */}
      {profile && tab === "profile" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-500">
          {/* Profile header */}
          <div className="surface-elevated rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-4">
              {profile.avatar && (
                <img
                  src={profile.avatar}
                  alt={`@${profile.username}`}
                  className="w-16 h-16 rounded-full ring-2 ring-accent/30"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-heading truncate">@{profile.username}</h2>
                  {profile.verified && <BadgeCheck className="w-4 h-4 text-accent shrink-0" />}
                </div>
                <p className="text-sm text-dim truncate">{profile.nickname}</p>
              </div>
            </div>
            {profile.bio && (
              <p className="text-sm text-body leading-relaxed">{profile.bio}</p>
            )}
            <div className="grid grid-cols-4 gap-2">
              <StatCard icon={User} label="Followers" value={fmt(profile.followers)} />
              <StatCard icon={User} label="Following" value={fmt(profile.following)} accent />
              <StatCard icon={Heart} label="Likes" value={fmt(profile.likes)} />
              <StatCard icon={Calendar} label="Videos" value={fmt(profile.videoCount)} accent />
            </div>
          </div>

          {/* Engagement */}
          <div className="surface-elevated rounded-2xl p-5">
            <EngagementCard data={profile.engagement} isEstimated={profile.videos.length === 0 || !profile.videos.some(v => v.likes > 0)} />
          </div>

          {/* Best posting times */}
          {profile.bestPostingTimes.length > 0 && (
            <div className="surface-elevated rounded-2xl p-5">
              <BestTimesCard times={profile.bestPostingTimes} frequency={profile.postingFrequency} />
            </div>
          )}

          {/* Top videos */}
          {profile.engagement.topVideos.length > 0 && profile.engagement.topVideos.some(v => v.likes > 0) && (
            <div className="surface-elevated rounded-2xl p-5">
              <TopVideos videos={profile.engagement.topVideos} />
            </div>
          )}
        </div>
      )}

      {/* Video Stats Results */}
      {videoStats && tab === "video" && (
        <VideoStatsResults data={videoStats} />
      )}

      {/* Info cards when no results */}
      {!profile && !videoStats && !loading && (
        <div className="grid grid-cols-3 gap-3">
          {tab === "profile" ? (
            <>
              {[
                { icon: "📊", title: "Engagement", desc: "Avg likes, views & rate" },
                { icon: "⏰", title: "Best Times", desc: "When to post" },
                { icon: "🏆", title: "Top Content", desc: "Best performers" },
              ].map((f) => (
                <div key={f.title} className="text-center p-4 rounded-2xl bg-secondary/50 ring-1 ring-border/50">
                  <div className="text-2xl mb-2">{f.icon}</div>
                  <p className="text-xs font-semibold text-heading">{f.title}</p>
                  <p className="text-[10px] text-dim mt-0.5">{f.desc}</p>
                </div>
              ))}
            </>
          ) : (
            <>
              {[
                { icon: "👁️", title: "Views", desc: "Exact play count" },
                { icon: "❤️", title: "Likes & Saves", desc: "Real engagement" },
                { icon: "🏷️", title: "Hashtags", desc: "Tags used" },
              ].map((f) => (
                <div key={f.title} className="text-center p-4 rounded-2xl bg-secondary/50 ring-1 ring-border/50">
                  <div className="text-2xl mb-2">{f.icon}</div>
                  <p className="text-xs font-semibold text-heading">{f.title}</p>
                  <p className="text-[10px] text-dim mt-0.5">{f.desc}</p>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
