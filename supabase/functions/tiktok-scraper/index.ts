const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    };

    const response = await fetch(url, { headers, redirect: 'follow' });
    const html = await response.text();

    // Try to find TikTok's hydration data
    let scriptData: string | null = null;
    
    // Pattern 1: __UNIVERSAL_DATA_FOR_REHYDRATION__
    const rehydrationMatch = html.match(/<script\s+id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/);
    if (rehydrationMatch) {
      scriptData = rehydrationMatch[1];
    }

    // Pattern 2: SIGI_STATE
    if (!scriptData) {
      const sigiMatch = html.match(/<script\s+id="SIGI_STATE"[^>]*>([\s\S]*?)<\/script>/);
      if (sigiMatch) {
        scriptData = sigiMatch[1];
      }
    }

    // Pattern 3: __NEXT_DATA__
    if (!scriptData) {
      const nextMatch = html.match(/<script\s+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (nextMatch) {
        scriptData = nextMatch[1];
      }
    }

    if (!scriptData) {
      return new Response(
        JSON.stringify({ error: 'Could not find video data. TikTok might be blocking the request or the URL format is unsupported.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parsedData = JSON.parse(scriptData);

    // Navigate TikTok's nested JSON structure
    let videoDetail = parsedData?.__DEFAULT_SCOPE__?.['webapp.video-detail'];
    
    // Fallback for SIGI_STATE structure
    if (!videoDetail) {
      const itemModule = parsedData?.ItemModule;
      if (itemModule) {
        const firstKey = Object.keys(itemModule)[0];
        if (firstKey) {
          const item = itemModule[firstKey];
          const authorModule = parsedData?.UserModule?.users?.[item?.author];
          
          const result = {
            id: item.id,
            description: item.desc,
            author: {
              username: item.author,
              nickname: authorModule?.nickname || item.author,
              avatar: authorModule?.avatarThumb || '',
            },
            video: {
              url: item.video?.downloadAddr || item.video?.playAddr || '',
              cover: item.video?.cover || item.video?.originCover || '',
              dynamicCover: item.video?.dynamicCover || '',
              duration: item.video?.duration || 0,
              ratio: item.video?.ratio || '',
              width: item.video?.width || 0,
              height: item.video?.height || 0,
            },
            stats: item.stats || {},
          };

          return new Response(
            JSON.stringify(result),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    if (!videoDetail || videoDetail.statusCode !== 0) {
      return new Response(
        JSON.stringify({ error: 'Video not found or is private.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const itemInfo = videoDetail.itemInfo?.itemStruct;
    if (!itemInfo) {
      return new Response(
        JSON.stringify({ error: 'Could not parse video information.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = {
      id: itemInfo.id,
      description: itemInfo.desc,
      author: {
        username: itemInfo.author?.uniqueId || '',
        nickname: itemInfo.author?.nickname || '',
        avatar: itemInfo.author?.avatarThumb || '',
      },
      video: {
        url: itemInfo.video?.downloadAddr || itemInfo.video?.playAddr || '',
        cover: itemInfo.video?.cover || '',
        dynamicCover: itemInfo.video?.dynamicCover || '',
        duration: itemInfo.video?.duration || 0,
        ratio: itemInfo.video?.ratio || '',
        width: itemInfo.video?.width || 0,
        height: itemInfo.video?.height || 0,
      },
      stats: itemInfo.stats || {},
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
