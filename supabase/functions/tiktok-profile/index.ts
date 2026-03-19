const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

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

interface ProfileResult {
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

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function analyzePostingTimes(videos: VideoItem[]): ProfileResult['bestPostingTimes'] {
  const slots = new Map<string, { totalEngagement: number; count: number }>();

  for (const v of videos) {
    const date = new Date(v.createTime * 1000);
    const day = DAYS[date.getUTCDay()];
    const hour = date.getUTCHours();
    const key = `${day}-${hour}`;
    const engagement = v.likes + v.comments * 2 + v.shares * 3;

    const existing = slots.get(key) || { totalEngagement: 0, count: 0 };
    existing.totalEngagement += engagement;
    existing.count++;
    slots.set(key, existing);
  }

  return Array.from(slots.entries())
    .map(([key, val]) => {
      const [dayOfWeek, hourStr] = key.split('-');
      return {
        dayOfWeek,
        hour: parseInt(hourStr),
        avgEngagement: Math.round(val.totalEngagement / val.count),
        videoCount: val.count,
      };
    })
    .sort((a, b) => b.avgEngagement - a.avgEngagement);
}

function analyzeFrequency(videos: VideoItem[]): ProfileResult['postingFrequency'] {
  if (videos.length < 2) {
    return { avgDaysBetweenPosts: 0, mostActiveDay: 'N/A', postsPerWeek: 0 };
  }

  const sorted = [...videos].sort((a, b) => a.createTime - b.createTime);
  const gaps: number[] = [];
  const dayCounts = new Map<string, number>();

  for (let i = 1; i < sorted.length; i++) {
    gaps.push((sorted[i].createTime - sorted[i - 1].createTime) / 86400);
  }

  for (const v of sorted) {
    const day = DAYS[new Date(v.createTime * 1000).getUTCDay()];
    dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
  }

  const avgDays = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const mostActiveDay = [...dayCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  return {
    avgDaysBetweenPosts: Math.round(avgDays * 10) / 10,
    mostActiveDay,
    postsPerWeek: avgDays > 0 ? Math.round((7 / avgDays) * 10) / 10 : 0,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (!checkRateLimit(ip)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { url } = await req.json();
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'Please provide a TikTok profile URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const trimmed = url.trim();
    // Accept profile URLs like tiktok.com/@username (with optional query params)
    const isProfileUrl = /^https?:\/\/(www\.)?tiktok\.com\/@[\w.]+\/?(\?.*)?$/i.test(trimmed);
    // Also accept just @username
    const isUsername = /^@?[\w.]{1,30}$/i.test(trimmed);

    let profileUrl = trimmed;
    if (isUsername) {
      const username = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
      profileUrl = `https://www.tiktok.com/@${username}`;
    } else if (!isProfileUrl) {
      return new Response(
        JSON.stringify({ error: 'Please provide a TikTok profile URL (e.g. https://www.tiktok.com/@username) or just @username' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
    };

    const response = await fetch(profileUrl, { headers, redirect: 'follow' });
    const setCookieHeaders = response.headers.getSetCookie?.() || [];
    const cookies = setCookieHeaders.map((c: string) => c.split(';')[0]).join('; ');
    const html = await response.text();

    let scriptData: string | null = null;
    const patterns = [
      /<script\s+id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/,
      /<script\s+id="SIGI_STATE"[^>]*>([\s\S]*?)<\/script>/,
      /<script\s+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        scriptData = match[1];
        break;
      }
    }

    if (!scriptData) {
      return new Response(
        JSON.stringify({ error: 'Could not find profile data. TikTok might be blocking the request.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parsed = JSON.parse(scriptData);

    const defaultScope = parsed?.__DEFAULT_SCOPE__;
    const userDetail = defaultScope?.['webapp.user-detail'];
    const userInfo = userDetail?.userInfo;
    const userModule = parsed?.UserModule;
    const itemModule = parsed?.ItemModule;

    let user: any = null;
    let stats: any = null;
    let videoItems: VideoItem[] = [];

    if (userInfo) {
      user = userInfo.user;
      stats = userInfo.stats;
    } else if (userModule) {
      const userKeys = Object.keys(userModule.users || {});
      if (userKeys.length > 0) {
        user = userModule.users[userKeys[0]];
        stats = userModule.stats?.[userKeys[0]];
      }
      if (itemModule) {
        videoItems = Object.values(itemModule).map((item: any) => ({
          id: item.id || '',
          description: item.desc || '',
          createTime: item.createTime || 0,
          cover: item.video?.cover || item.video?.originCover || '',
          likes: item.stats?.diggCount || 0,
          comments: item.stats?.commentCount || 0,
          shares: item.stats?.shareCount || 0,
          plays: item.stats?.playCount || 0,
          duration: item.video?.duration || 0,
        }));
      }
    }

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Profile not found or is private.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Strategy: Extract video IDs from profile HTML, then scrape each video page for real stats
    if (videoItems.length === 0) {
      try {
        const ids = new Set<string>();
        let m;

        // Extract video IDs from profile HTML
        const videoIdPattern = /["'\/]video[\/](\d{15,25})/g;
        while ((m = videoIdPattern.exec(html)) !== null) {
          ids.add(m[1]);
        }

        // Also check href tags and meta tags
        if (ids.size === 0) {
          const linkPattern = /href="[^"]*\/video\/(\d{15,25})"/g;
          while ((m = linkPattern.exec(html)) !== null) {
            ids.add(m[1]);
          }
          const ogUrlMatch = html.match(/property="og:url"[^>]*content="[^"]*video\/(\d{15,25})"/g);
          if (ogUrlMatch) {
            for (const tag of ogUrlMatch) {
              const vidMatch = tag.match(/video\/(\d{15,25})/);
              if (vidMatch) ids.add(vidMatch[1]);
            }
          }
        }

        console.log(`Found ${ids.size} video IDs in profile HTML`);

        // Scrape each video page directly to get real stats from embedded JSON
        if (ids.size > 0) {
          const username = user.uniqueId || user.unique_id || '';
          const idsArr = Array.from(ids).slice(0, 12); // limit to 12 to avoid timeouts

          const scrapeResults = await Promise.allSettled(
            idsArr.map(async (vid) => {
              try {
                const videoUrl = `https://www.tiktok.com/@${username}/video/${vid}`;
                const r = await fetch(videoUrl, { headers, redirect: 'follow' });
                if (!r.ok) return null;
                const videoHtml = await r.text();

                // Extract embedded JSON from video page (same patterns as profile)
                let videoData: string | null = null;
                const videoPatterns = [
                  /<script\s+id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/,
                  /<script\s+id="SIGI_STATE"[^>]*>([\s\S]*?)<\/script>/,
                  /<script\s+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
                ];
                for (const p of videoPatterns) {
                  const match = videoHtml.match(p);
                  if (match) { videoData = match[1]; break; }
                }
                if (!videoData) return null;

                const vParsed = JSON.parse(videoData);

                // Try multiple known data paths for video info
                let itemInfo: any = null;

                // Path 1: __UNIVERSAL_DATA_FOR_REHYDRATION__ → webapp.video-detail
                const vDefault = vParsed?.__DEFAULT_SCOPE__;
                const videoDetail = vDefault?.['webapp.video-detail'];
                if (videoDetail?.itemInfo?.itemStruct) {
                  itemInfo = videoDetail.itemInfo.itemStruct;
                }

                // Path 2: SIGI_STATE → ItemModule
                if (!itemInfo && vParsed?.ItemModule) {
                  const items = Object.values(vParsed.ItemModule);
                  if (items.length > 0) itemInfo = items[0];
                }

                // Path 3: __NEXT_DATA__
                if (!itemInfo && vParsed?.props?.pageProps?.itemInfo?.itemStruct) {
                  itemInfo = vParsed.props.pageProps.itemInfo.itemStruct;
                }

                if (!itemInfo) return null;

                return {
                  id: itemInfo.id || vid,
                  description: itemInfo.desc || '',
                  createTime: itemInfo.createTime || 0,
                  cover: itemInfo.video?.cover || itemInfo.video?.originCover || itemInfo.video?.dynamicCover || '',
                  likes: itemInfo.stats?.diggCount || 0,
                  comments: itemInfo.stats?.commentCount || 0,
                  shares: itemInfo.stats?.shareCount || 0,
                  plays: itemInfo.stats?.playCount || 0,
                  duration: itemInfo.video?.duration || 0,
                } as VideoItem;
              } catch (e) {
                console.error(`Failed to scrape video ${vid}:`, e);
                return null;
              }
            })
          );

          for (const result of scrapeResults) {
            if (result.status === 'fulfilled' && result.value) {
              videoItems.push(result.value);
            }
          }
          console.log(`Scraped ${videoItems.length}/${idsArr.length} videos with real stats`);
        }
      } catch (e) {
        console.error('Video extraction failed:', e);
      }
    }

    // If we still have no per-video stats, estimate from profile-level data
    const videoCount = stats?.videoCount || user?.videoCount || 0;
    const totalLikesRaw = stats?.heartCount || stats?.heart || user?.heartCount || 0;

    const followers = stats?.followerCount || user?.followerCount || 0;

    // Compute engagement metrics
    // If we have per-video stats, use them. Otherwise estimate from profile totals.
    const hasPerVideoStats = videoItems.some(v => v.likes > 0 || v.plays > 0);
    
    let avgLikes: number, avgComments: number, avgShares: number, avgPlays: number;
    
    if (hasPerVideoStats) {
      avgLikes = Math.round(videoItems.reduce((s, v) => s + v.likes, 0) / videoItems.length);
      avgComments = Math.round(videoItems.reduce((s, v) => s + v.comments, 0) / videoItems.length);
      avgShares = Math.round(videoItems.reduce((s, v) => s + v.shares, 0) / videoItems.length);
      avgPlays = Math.round(videoItems.reduce((s, v) => s + v.plays, 0) / videoItems.length);
    } else {
      // Estimate from profile-level totals
      const vc = videoCount || videoItems.length || 1;
      avgLikes = Math.round(totalLikesRaw / vc);
      avgComments = Math.round(avgLikes * 0.03); // ~3% comment-to-like ratio (industry avg)
      avgShares = Math.round(avgLikes * 0.01);   // ~1% share-to-like ratio
      avgPlays = Math.round(avgLikes * 8);        // ~12.5% like-to-view ratio
    }

    const totalInteractions = avgLikes + avgComments + avgShares;
    // TikTok engagement rate should be interactions/views (not followers) since content goes viral beyond followers
    // If we have views data, use views-based. Otherwise use followers-based but cap it.
    let engagementRate: number;
    if (avgPlays > 0) {
      engagementRate = Math.round((totalInteractions / avgPlays) * 10000) / 100;
    } else if (followers > 0) {
      engagementRate = Math.round((totalInteractions / followers) * 10000) / 100;
    } else {
      engagementRate = 0;
    }
    // Cap at 100% for estimated data to avoid unrealistic numbers
    if (!hasPerVideoStats && engagementRate > 30) {
      engagementRate = Math.round((avgLikes / (avgPlays || followers || 1)) * 10000) / 100;
    }

    const topVideos = hasPerVideoStats
      ? [...videoItems].sort((a, b) => (b.likes + b.comments + b.shares) - (a.likes + a.comments + a.shares)).slice(0, 5)
      : videoItems.slice(0, 5);

    const bestPostingTimes = analyzePostingTimes(videoItems);
    const postingFrequency = analyzeFrequency(videoItems);

    const result: ProfileResult = {
      username: user.uniqueId || user.unique_id || '',
      nickname: user.nickname || '',
      avatar: user.avatarLarger || user.avatarMedium || user.avatarThumb || '',
      bio: user.signature || '',
      verified: user.verified || false,
      followers,
      following: stats?.followingCount || user?.followingCount || 0,
      likes: totalLikesRaw,
      videoCount: stats?.videoCount || user?.videoCount || 0,
      videos: videoItems,
      engagement: {
        avgLikes,
        avgComments,
        avgShares,
        avgPlays,
        engagementRate,
        topVideos,
      },
      bestPostingTimes,
      postingFrequency,
    };

    console.log(`Profile analyzed: @${result.username}, ${videoItems.length} videos, ${result.engagement.engagementRate}% ER`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Profile scraping error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to analyze profile. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
