const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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
      if (label === 'adapt_lowest_720_1' || label === 'adapt_720_1') label = '720p HD';
      if (label === 'adapt_1080_1' || label === 'higher') label = '1080p HD';
      if (label === 'adapt_2160_1' || label === 'highest') label = '4K';

      if (!seenLabels.has(label)) {
        seenLabels.add(label);
        qualities.push({
          label,
          url: playAddr,
          width: w,
          height: h,
          bitrate,
          watermark: false,
        });
      }
    }
  }

  // 2. Extract from playAddr (no watermark, usually best quality)
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
      qualities.push({
        label: label + ' (no watermark)',
        url: playUrl,
        width: w,
        height: h,
        bitrate: 0,
        watermark: false,
      });
    }
  }

  // 3. Extract downloadAddr (with watermark, but reliable)
  const dlAddrList = video?.downloadAddr?.UrlList || video?.DownloadAddr?.UrlList || [];
  const dlUrl = dlAddrList[0] || (typeof video?.downloadAddr === 'string' ? video.downloadAddr : '');
  if (dlUrl && !qualities.some(q => q.url === dlUrl)) {
    const w = video?.width || video?.Width || 0;
    const h = video?.height || video?.Height || 0;
    qualities.push({
      label: `${video?.ratio || 'Original'} (watermark)`,
      url: dlUrl,
      width: w,
      height: h,
      bitrate: 0,
      watermark: true,
    });
  }

  // Sort by bitrate descending, then by resolution
  qualities.sort((a, b) => {
    const resA = Math.max(a.width, a.height);
    const resB = Math.max(b.width, b.height);
    if (resB !== resA) return resB - resA;
    return b.bitrate - a.bitrate;
  });

  return qualities;
}

function buildResult(itemInfo: any, parsedVideo: any, cookies: string) {
  const video = itemInfo?.video || parsedVideo || {};
  const qualities = extractQualities(video);

  // Best URL fallback
  const bestUrl = qualities[0]?.url
    || video?.downloadAddr
    || video?.playAddr
    || '';

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
    cookies,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url || !url.includes('tiktok.com')) {
      return new Response(
        JSON.stringify({ error: 'Invalid TikTok URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch with browser-like headers
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
    
    // Capture cookies from TikTok response for use in download proxy
    const setCookieHeaders = response.headers.getSetCookie?.() || [];
    const cookies = setCookieHeaders
      .map((c: string) => c.split(';')[0])
      .join('; ');
    
    const html = await response.text();

    // Try multiple hydration patterns
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
        const result = buildResult(itemInfo, null, cookies);
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
        const result = buildResult(itemWithAuthor, item.video);
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
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch video data';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
