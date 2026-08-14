const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range',
};

const ALLOWED_HOSTS = /(^|\.)(googlevideo\.com|ytimg\.com|youtube\.com)$/i;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 60) return false;
  entry.count++;
  return true;
}

function validateUrl(raw: string): URL | null {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'https:') return null;
    if (!ALLOWED_HOSTS.test(parsed.hostname)) return null;
    return parsed;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (!checkRateLimit(ip)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again shortly.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const params = new URL(req.url).searchParams;
    const videoUrl = params.get('videoUrl');
    const filename = params.get('filename') || 'youtube-video.mp4';
    const shouldDownload = params.get('download') === '1';

    if (!videoUrl) {
      return new Response(JSON.stringify({ error: 'Video URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!validateUrl(videoUrl)) {
      return new Response(JSON.stringify({ error: 'Invalid URL. Only YouTube CDN URLs are allowed.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fetchHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
    };
    const range = req.headers.get('range');
    if (range) fetchHeaders['Range'] = range;

    const upstream = await fetch(videoUrl, {
      method: req.method === 'HEAD' ? 'HEAD' : 'GET',
      headers: fetchHeaders,
      redirect: 'follow',
    });

    if (!upstream.ok && upstream.status !== 206) {
      console.error(`YouTube CDN error ${upstream.status}`);
      return new Response(
        JSON.stringify({ error: `Video source returned ${upstream.status}. The link may have expired — extract again.` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const headers = new Headers(corsHeaders);
    headers.set('Content-Type', upstream.headers.get('content-type') || 'video/mp4');
    headers.set('Content-Disposition', `${shouldDownload ? 'attachment' : 'inline'}; filename="${filename.replace(/"/g, '')}"`);
    headers.set('Cross-Origin-Resource-Policy', 'cross-origin');

    for (const h of ['accept-ranges', 'cache-control', 'content-length', 'content-range', 'etag', 'last-modified']) {
      const v = upstream.headers.get(h);
      if (v) headers.set(h, v);
    }

    return new Response(req.method === 'HEAD' ? null : upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    console.error('youtube proxy error:', error);
    return new Response(JSON.stringify({ error: 'Failed to proxy video. Please try again.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});