const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const kv = await Deno.openKv();

// Rate limiting: max 20 requests per IP per minute
async function checkRateLimit(ip: string): Promise<boolean> {
  const key = ["rate", "scraper", ip];
  const entry = await kv.get<number>(key);
  const count = entry.value ?? 0;
  if (count >= 20) return false;
  await kv.set(key, count + 1, { expireIn: 60_000 });
  return true;
}

interface QualityOption {
  label: string;
  url: string;
  width: number;
  height: number;
  bitrate: number;
  watermark: boolean;
}

function extractQualities(video: any): QualityOption[] {
  const qualities: QualityOption[] = [];
  const seenLabels = new Set<string>();

  // 1. Extract from bitrateInfo array (multiple quality tiers)
  const bitrateInfo = video?.bitrateInfo || video?.bitRateInfo || [];
  if (Array.isArray(bitrateInfo) && bitrateInfo.length > 0) {
    for (const br of bitrateInfo) {
      const playAddr = br.PlayAddr?.UrlList?.[0] || br.playAddr?.UrlList?.[0] || '';
      if (!playAddr) continue;

      const w = br.PlayAddr?.Width || br.playAddr?.Width || br.Width || 0;
      const h = br.PlayAddr?.Height || br.playAddr?.Height || br.Height || 0;
      const bitrate = br.Bitrate || br.bitrate || 0;
      const quality = br.GearName || br.QualityType || br.qualityType || '';

      let label = quality;
      if (!label) {
        const maxDim = Math.max(w, h);
        if (maxDim >= 2160) label = '4K';
        else if (maxDim >= 1080) label = '1080p';
        else if (maxDim >= 720) label = '720p';
        else if (maxDim >= 540) label = '540p';
        else if (maxDim >= 480) label = '480p';
        else label = `${maxDim}p`;
      }

      // Normalize labels
      if (label === 'normal') label = '540p';
      if (label.includes('720')) label = '720p HD';
      if (label.includes('1080')) label = '1080p HD';
      if (label.includes('2160')) label = '4K';

      if (!seenLabels.has(label)) {
        seenLabels.add(label);
        qualities.push({ label, url: playAddr, width: w, height: h, bitrate, watermark: false });
      }
    }
  }

  // 2. Extract from playAddr (no watermark)
  const playAddrList = video?.playAddr?.UrlList || video?.PlayAddr?.UrlList || [];
  const playUrl = playAddrList[0] || (typeof video?.playAddr === 'string' ? video.playAddr : '');
  if (playUrl && !qualities.some(q => q.url === playUrl)) {
    const w = video?.width || video?.Width || 0;
    const h = video?.height || video?.Height || 0;
    const maxDim = Math.max(w, h);
    let label = video?.ratio || '';
    if (!label) {
      if (maxDim >= 2160) label = '4K';
      else if (maxDim >= 1080) label = '1080p';
      else if (maxDim >= 720) label = '720p';
      else label = `${maxDim}p`;
    }
    if (!seenLabels.has(label + ' (no watermark)')) {
      qualities.push({ label: label + ' (no watermark)', url: playUrl, width: w, height: h, bitrate: 0, watermark: false });
    }
  }

  // Sort by resolution then bitrate
  qualities.sort((a, b) => {
    const resA = Math.max(a.width, a.height);
    const resB = Math.max(b.width, b.height);
    if (resB !== resA) return resB - resA;
    return b.bitrate - a.bitrate;
  });

  return qualities;
}

function buildResult(itemInfo: any, parsedVideo: any, cookieToken: string) {
  const video = itemInfo?.video || parsedVideo || {};
  const qualities = extractQualities(video);

  const bestUrl = qualities[0]?.url || video?.downloadAddr || video?.playAddr || '';

  return {
    id: itemInfo?.id || '',
    description: itemInfo?.desc || '',
    author: {
      username: itemInfo?.author?.uniqueId || itemInfo?.author || '',
      nickname: itemInfo?.author?.nickname || '',
      avatar: itemInfo?.author?.avatarThumb || itemInfo?.author?.avatarMedium || '',
    },
    video: {
      url: bestUrl,
      cover: video?.cover || video?.originCover || '',
      dynamicCover: video?.dynamicCover || '',
      duration: video?.duration || 0,
      ratio: video?.ratio || '',
      width: video?.width || video?.Width || 0,
      height: video?.height || video?.Height || 0,
    },
    qualities,
    stats: itemInfo?.stats || {},
    cookieToken,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (!(await checkRateLimit(ip))) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'Please provide a TikTok URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Must be a tiktok.com page URL, not a CDN/proxy/download link
    const trimmed = url.trim();
    const isValidTikTokPage = /^https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\//i.test(trimmed);
    if (!isValidTikTokPage) {
      return new Response(
        JSON.stringify({ error: 'Please paste a TikTok video page URL (e.g. https://www.tiktok.com/@user/video/...)' }),
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

    const response = await fetch(url, { headers, redirect: 'follow' });

    // Capture cookies and store server-side with a token
    const setCookieHeaders = response.headers.getSetCookie?.() || [];
    const cookies = setCookieHeaders.map((c: string) => c.split(';')[0]).join('; ');
    
    // Store cookies in KV with a random token (TTL 5 minutes)
    let cookieToken = '';
    if (cookies) {
      cookieToken = crypto.randomUUID();
      await kv.set(["cookies", cookieToken], cookies, { expireIn: 300_000 });
    }

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
        JSON.stringify({ error: 'Could not find video data. TikTok might be blocking the request.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parsedData = JSON.parse(scriptData);

    // Path 1: __UNIVERSAL_DATA_FOR_REHYDRATION__
    const videoDetail = parsedData?.__DEFAULT_SCOPE__?.['webapp.video-detail'];
    if (videoDetail && videoDetail.statusCode === 0) {
      const itemInfo = videoDetail.itemInfo?.itemStruct;
      if (itemInfo) {
        const result = buildResult(itemInfo, null, cookieToken);
        console.log(`Extracted ${result.qualities.length} quality options`);
        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Path 2: SIGI_STATE
    const itemModule = parsedData?.ItemModule;
    if (itemModule) {
      const firstKey = Object.keys(itemModule)[0];
      if (firstKey) {
        const item = itemModule[firstKey];
        const authorModule = parsedData?.UserModule?.users?.[item?.author];
        const itemWithAuthor = {
          ...item,
          author: {
            uniqueId: item.author,
            nickname: authorModule?.nickname || item.author,
            avatarThumb: authorModule?.avatarThumb || '',
          },
        };
        const result = buildResult(itemWithAuthor, item.video, cookieToken);
        console.log(`Extracted ${result.qualities.length} quality options (SIGI)`);
        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Video not found or is private.' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Scraping error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch video data. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
