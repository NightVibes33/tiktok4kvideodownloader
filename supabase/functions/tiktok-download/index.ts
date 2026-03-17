const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let videoUrl: string | null = null;
    let filename: string | null = null;
    let cookies: string | null = null;

    const parsedUrl = new URL(req.url);

    // Always check query params first (works for both GET and POST with query strings)
    videoUrl = parsedUrl.searchParams.get('videoUrl');
    filename = parsedUrl.searchParams.get('filename');
    cookies = parsedUrl.searchParams.get('cookies');

    // If not in query params and body exists, try JSON body
    if (!videoUrl && req.method === 'POST') {
      try {
        const body = await req.json();
        videoUrl = body.videoUrl || videoUrl;
        filename = body.filename || filename;
        cookies = body.cookies || cookies;
      } catch {
        // Body wasn't JSON, ignore
      }
    }

    if (!videoUrl) {
      return new Response(
        JSON.stringify({ error: 'Video URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fetchHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': 'https://www.tiktok.com/',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Range': 'bytes=0-',
    };

    if (cookies) {
      fetchHeaders['Cookie'] = cookies;
    }

    const response = await fetch(videoUrl, { headers: fetchHeaders, redirect: 'follow' });

    if (!response.ok && response.status !== 206) {
      console.error(`TikTok CDN responded with ${response.status}`);
      return new Response(
        JSON.stringify({ error: `Failed to fetch video: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const videoBody = response.body;
    const contentLength = response.headers.get('content-length');
    const contentRange = response.headers.get('content-range');
    const acceptRanges = response.headers.get('accept-ranges');
    const safeName = filename || 'tiktok-video.mp4';

    const headers: Record<string, string> = {
      ...corsHeaders,
      'Content-Type': response.headers.get('content-type') || 'video/mp4',
      'Content-Disposition': `attachment; filename="${safeName}"`,
    };

    if (contentLength) {
      headers['Content-Length'] = contentLength;
    }
    if (contentRange) {
      headers['Content-Range'] = contentRange;
    }
    if (acceptRanges) {
      headers['Accept-Ranges'] = acceptRanges;
    }

    return new Response(videoBody, { status: response.status === 206 ? 206 : 200, headers });
  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to proxy video' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
