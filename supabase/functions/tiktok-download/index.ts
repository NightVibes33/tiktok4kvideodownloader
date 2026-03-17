const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, range',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let videoUrl: string | null = null;
    let filename: string | null = null;
    let cookies: string | null = null;
    let shouldDownload = false;

    const parsedUrl = new URL(req.url);

    videoUrl = parsedUrl.searchParams.get('videoUrl');
    filename = parsedUrl.searchParams.get('filename');
    cookies = parsedUrl.searchParams.get('cookies');
    shouldDownload = parsedUrl.searchParams.get('download') === '1';

    if (!videoUrl && req.method === 'POST') {
      try {
        const body = await req.json();
        videoUrl = body.videoUrl || null;
        filename = body.filename || null;
        cookies = body.cookies || null;
        shouldDownload = body.download === true;
      } catch {
        // Ignore non-JSON body
      }
    }

    if (!videoUrl) {
      return new Response(
        JSON.stringify({ error: 'Video URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Proxying video: ${videoUrl.substring(0, 80)}...`);

    const requestedRange = req.headers.get('range');
    const fetchHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': 'https://www.tiktok.com/',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
    };

    if (requestedRange) {
      fetchHeaders['Range'] = requestedRange;
    }

    if (cookies) {
      fetchHeaders['Cookie'] = cookies;
    }

    const upstreamResponse = await fetch(videoUrl, {
      method: req.method === 'HEAD' ? 'HEAD' : 'GET',
      headers: fetchHeaders,
      redirect: 'follow',
    });

    if (!upstreamResponse.ok && upstreamResponse.status !== 206) {
      const errorText = await upstreamResponse.text();
      console.error(`TikTok CDN error ${upstreamResponse.status}: ${errorText.substring(0, 200)}`);
      return new Response(
        JSON.stringify({ error: `Video source returned ${upstreamResponse.status}. The link may have expired — try extracting again.` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const safeName = filename || 'tiktok-video.mp4';
    const headers = new Headers(corsHeaders);
    headers.set('Content-Type', upstreamResponse.headers.get('content-type') || 'video/mp4');
    headers.set('Content-Disposition', `${shouldDownload ? 'attachment' : 'inline'}; filename="${safeName}"`);
    headers.set('Cross-Origin-Resource-Policy', 'cross-origin');

    const passThroughHeaders = [
      'accept-ranges',
      'cache-control',
      'content-length',
      'content-range',
      'etag',
      'last-modified',
    ];

    for (const headerName of passThroughHeaders) {
      const value = upstreamResponse.headers.get(headerName);
      if (value) {
        headers.set(headerName, value);
      }
    }

    return new Response(req.method === 'HEAD' ? null : upstreamResponse.body, {
      status: upstreamResponse.status,
      headers,
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to proxy video. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});