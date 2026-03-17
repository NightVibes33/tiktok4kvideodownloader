const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Use the tiktok-api-dl npm package via Deno's npm: specifier
import { Downloader } from "npm:@tobyg74/tiktok-api-dl@1.0.9";

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

    // Try v1 first (TikTok's internal API — best quality, no watermark)
    let result = await Downloader(url, { version: "v1" });

    // Fallback to v3 if v1 fails
    if (result.status !== "success" || !result.result) {
      console.log("v1 failed, trying v3...");
      result = await Downloader(url, { version: "v3" });
    }

    // Fallback to v2 if v3 also fails
    if (result.status !== "success" || !result.result) {
      console.log("v3 failed, trying v2...");
      result = await Downloader(url, { version: "v2" });
    }

    if (result.status !== "success" || !result.result) {
      return new Response(
        JSON.stringify({ error: result.message || 'Failed to extract video data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = result.result;
    const qualities: any[] = [];

    // Build qualities from v1 response
    if (data.video?.playAddr) {
      const addrs = Array.isArray(data.video.playAddr) ? data.video.playAddr : [data.video.playAddr];
      addrs.forEach((addr: string, i: number) => {
        qualities.push({
          label: i === 0 ? 'HD (no watermark)' : `Quality ${i + 1}`,
          url: addr,
          width: 0,
          height: 0,
          bitrate: 0,
          watermark: false,
        });
      });
    }

    if (data.video?.downloadAddr) {
      const addrs = Array.isArray(data.video.downloadAddr) ? data.video.downloadAddr : [data.video.downloadAddr];
      addrs.forEach((addr: string) => {
        if (!qualities.some(q => q.url === addr)) {
          qualities.push({
            label: 'Original (watermark)',
            url: addr,
            width: 0,
            height: 0,
            bitrate: 0,
            watermark: true,
          });
        }
      });
    }

    // v3 response format
    if (data.videoHD) {
      qualities.push({
        label: 'HD (no watermark)',
        url: data.videoHD,
        width: 0,
        height: 0,
        bitrate: 0,
        watermark: false,
      });
    }
    if (data.videoWatermark && !qualities.some(q => q.url === data.videoWatermark)) {
      qualities.push({
        label: 'Original (watermark)',
        url: data.videoWatermark,
        width: 0,
        height: 0,
        bitrate: 0,
        watermark: true,
      });
    }

    // v2 response format
    if (data.video?.playAddr && typeof data.video.playAddr === 'string') {
      if (!qualities.some(q => q.url === data.video.playAddr)) {
        qualities.push({
          label: 'HD (no watermark)',
          url: data.video.playAddr,
          width: 0,
          height: 0,
          bitrate: 0,
          watermark: false,
        });
      }
    }

    // Build author info
    const author = data.author || {};
    const cover = data.video?.cover || data.video?.originCover || data.cover;
    const coverUrl = Array.isArray(cover) ? cover[0] : (cover || '');

    const responseData = {
      id: data.id || '',
      description: data.desc || data.description || '',
      author: {
        username: author.username || author.uniqueId || '',
        nickname: author.nickname || '',
        avatar: Array.isArray(author.avatarThumb) ? author.avatarThumb[0] : (author.avatar || author.avatarThumb || ''),
      },
      video: {
        url: qualities[0]?.url || '',
        cover: coverUrl,
        dynamicCover: '',
        duration: data.video?.duration || 0,
        ratio: data.video?.ratio || '',
        width: 0,
        height: 0,
      },
      qualities,
      stats: data.statistics || {
        playCount: 0,
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
      },
    };

    console.log(`Extracted ${qualities.length} quality options via tiktok-api-dl`);

    return new Response(
      JSON.stringify(responseData),
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
