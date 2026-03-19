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
  if (entry.count >= 15) return false;
  entry.count++;
  return true;
}

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

// Resolve short links (vm.tiktok.com, vt.tiktok.com, tiktok.com/t/) to final URL
async function resolveUrl(url: string): Promise<string> {
  const isShortLink = /^https?:\/\/(vm|vt)\.tiktok\.com\//i.test(url) ||
    /^https?:\/\/(www\.)?tiktok\.com\/t\//i.test(url);

  if (!isShortLink) return url;

  const resp = await fetch(url, {
    headers: BROWSER_HEADERS,
    redirect: 'follow',
  });
  return resp.url;
}

interface VideoStats {
  id: string;
  description: string;
  createTime: number;
  author: {
    username: string;
    nickname: string;
    avatar: string;
    verified: boolean;
  };
  music: {
    title: string;
    author: string;
  };
  cover: string;
  duration: number;
  likes: number;
  comments: number;
  shares: number;
  plays: number;
  saves: number;
  hashtags: string[];
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
        JSON.stringify({ error: 'Please provide a TikTok video URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const trimmed = url.trim();

    // Validate it's a TikTok URL
    const isTikTokUrl = /^https?:\/\/(www\.|vm\.|vt\.)?(tiktok\.com)\//i.test(trimmed);
    if (!isTikTokUrl) {
      return new Response(
        JSON.stringify({ error: 'Please provide a valid TikTok video URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve short links
    const resolvedUrl = await resolveUrl(trimmed);
    console.log('Resolved URL:', resolvedUrl);

    // Check if it's a video URL
    const isVideoUrl = /\/@[\w.]+\/video\/\d+/i.test(resolvedUrl) ||
      /\/video\/\d+/i.test(resolvedUrl);

    if (!isVideoUrl) {
      return new Response(
        JSON.stringify({ error: 'URL does not point to a TikTok video. Please provide a video link.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the video page
    const response = await fetch(resolvedUrl, { headers: BROWSER_HEADERS, redirect: 'follow' });
    const html = await response.text();

    // Extract embedded JSON
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
        JSON.stringify({ error: 'Could not extract video data. TikTok might be blocking the request.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parsed = JSON.parse(scriptData);

    // Try multiple known data paths
    let itemInfo: any = null;

    // Path 1: __UNIVERSAL_DATA_FOR_REHYDRATION__
    const defaultScope = parsed?.__DEFAULT_SCOPE__;
    const videoDetail = defaultScope?.['webapp.video-detail'];
    if (videoDetail?.itemInfo?.itemStruct) {
      itemInfo = videoDetail.itemInfo.itemStruct;
    }

    // Path 2: SIGI_STATE → ItemModule
    if (!itemInfo && parsed?.ItemModule) {
      const items = Object.values(parsed.ItemModule);
      if (items.length > 0) itemInfo = items[0] as any;
    }

    // Path 3: __NEXT_DATA__
    if (!itemInfo && parsed?.props?.pageProps?.itemInfo?.itemStruct) {
      itemInfo = parsed.props.pageProps.itemInfo.itemStruct;
    }

    if (!itemInfo) {
      return new Response(
        JSON.stringify({ error: 'Video not found or is private.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract hashtags from description
    const hashtagPattern = /#[\w\u00C0-\u024F\u1E00-\u1EFF]+/g;
    const hashtags = (itemInfo.desc || '').match(hashtagPattern) || [];

    const result: VideoStats = {
      id: itemInfo.id || '',
      description: itemInfo.desc || '',
      createTime: itemInfo.createTime || 0,
      author: {
        username: itemInfo.author?.uniqueId || itemInfo.author?.unique_id || '',
        nickname: itemInfo.author?.nickname || '',
        avatar: itemInfo.author?.avatarLarger || itemInfo.author?.avatarMedium || '',
        verified: itemInfo.author?.verified || false,
      },
      music: {
        title: itemInfo.music?.title || '',
        author: itemInfo.music?.authorName || '',
      },
      cover: itemInfo.video?.cover || itemInfo.video?.originCover || itemInfo.video?.dynamicCover || '',
      duration: itemInfo.video?.duration || 0,
      likes: itemInfo.stats?.diggCount || 0,
      comments: itemInfo.stats?.commentCount || 0,
      shares: itemInfo.stats?.shareCount || 0,
      plays: itemInfo.stats?.playCount || 0,
      saves: itemInfo.stats?.collectCount || 0,
      hashtags,
    };

    console.log(`Video analyzed: ${result.id} by @${result.author.username}, ${result.plays} plays`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Video stats error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to analyze video. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
