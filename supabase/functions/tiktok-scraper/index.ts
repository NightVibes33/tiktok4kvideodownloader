const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// In-memory rate limiting (resets on cold start, acceptable for edge functions)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 20) return false;
  entry.count++;
  return true;
}

// Encrypt cookies so they can be passed to the download function securely
async function encryptCookies(cookies: string): Promise<string> {
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(secret.slice(0, 32).padEnd(32, '0')),
    { name: 'AES-GCM' }, false, ['encrypt']
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    keyMaterial,
    encoder.encode(cookies)
  );
  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

interface QualityOption {
  label: string;
  url: string;
  width: number;
  height: number;
  bitrate: number;
  watermark: boolean;
}

function inferResolutionFromLabel(label: string): number {
  const lower = label.toLowerCase();
  const explicit = lower.match(/(2160|1440|1080|720|540|480)p/);
  if (explicit) return Number(explicit[1]);
  if (lower.includes('4k') || lower.includes('2160')) return 2160;
  if (lower.includes('1440')) return 1440;
  if (lower.includes('1080') || lower.includes('full hd') || lower.includes('hd quality')) return 1080;
  if (lower.includes('720')) return 720;
  if (lower.includes('540')) return 540;
  if (lower.includes('480')) return 480;
  if (lower.includes('standard quality')) return 540;
  if (lower.includes('best available')) return 720;
  return 0;
}

function getQualityResolution(option: QualityOption): number {
  return Math.max(option.width, option.height, inferResolutionFromLabel(option.label));
}

function resolutionLabel(maxDim: number): string {
  if (maxDim >= 2160) return '4K';
  if (maxDim >= 1440) return '1440p';
  if (maxDim >= 1080) return '1080p HD';
  if (maxDim >= 720) return '720p HD';
  if (maxDim >= 540) return '540p';
  if (maxDim >= 480) return '480p';
  if (maxDim > 0) return `${maxDim}p`;
  return 'Standard';
}

function normalizeQualityLabel(rawLabel: string, width: number, height: number): string {
  const label = rawLabel.trim();
  const lower = label.toLowerCase();
  const maxDim = Math.max(width, height);
  const matchedResolution = lower.match(/(?:lowest|normal|adapt_[^_]+)_(\d+)_\d+/)?.[1];
  const resolvedDim = matchedResolution ? Number(matchedResolution) : maxDim;
  const fallback = resolutionLabel(resolvedDim);

  if (!label || label === 'normal') return fallback;
  if (/^lowest_\d+_\d+$/i.test(label)) return `${fallback} · smaller file`;
  if (/^normal_\d+_\d+$/i.test(label)) return fallback;
  if (lower.includes('2160') || lower.includes('4k')) return '4K';
  if (lower.includes('1080')) return '1080p HD';
  if (lower.includes('720')) return '720p HD';
  if (lower.includes('540')) return '540p';
  if (lower.includes('480')) return '480p';

  return label;
}

function extractQualities(video: any): QualityOption[] {
  const qualities: QualityOption[] = [];
  const seenUrls = new Set<string>();
  const seenLabels = new Set<string>();

  const bitrateInfo = video?.bitrateInfo || video?.bitRateInfo || [];
  if (Array.isArray(bitrateInfo) && bitrateInfo.length > 0) {
    for (const br of bitrateInfo) {
      const playAddr = br.PlayAddr?.UrlList?.[0] || br.playAddr?.UrlList?.[0] || '';
      if (!playAddr) continue;

      const w = br.PlayAddr?.Width || br.playAddr?.Width || br.Width || 0;
      const h = br.PlayAddr?.Height || br.playAddr?.Height || br.Height || 0;
      const bitrate = br.Bitrate || br.bitrate || 0;
      const rawLabel = br.GearName || br.QualityType || br.qualityType || '';
      // Keep all codecs including HEVC/H.265 to expose higher resolutions (1080p often only available as HEVC)

      const label = normalizeQualityLabel(rawLabel, w, h);
      const dedupeKey = `${label}:${w}x${h}`;
      if (seenUrls.has(playAddr) || seenLabels.has(dedupeKey)) continue;

      seenUrls.add(playAddr);
      seenLabels.add(dedupeKey);
      qualities.push({ label, url: playAddr, width: w, height: h, bitrate, watermark: false });
    }
  }

  const playAddrList = video?.playAddr?.UrlList || video?.PlayAddr?.UrlList || [];
  const playUrl = playAddrList[0]
    || (typeof video?.playAddr === 'string' ? video.playAddr : '')
    || (typeof video?.PlayAddr === 'string' ? video.PlayAddr : '');

  if (playUrl && !seenUrls.has(playUrl)) {
    const w = video?.width || video?.Width || 0;
    const h = video?.height || video?.Height || 0;
    const label = normalizeQualityLabel(video?.ratio || '', w, h);
    const dedupeKey = `${label}:${w}x${h}`;
    if (!seenLabels.has(dedupeKey)) {
      seenUrls.add(playUrl);
      seenLabels.add(dedupeKey);
      qualities.push({ label, url: playUrl, width: w, height: h, bitrate: 0, watermark: false });
    }
  }

  qualities.sort((a, b) => {
    const resA = getQualityResolution(a);
    const resB = getQualityResolution(b);
    if (resB !== resA) return resB - resA;
    return b.bitrate - a.bitrate;
  });

  return qualities;
}

// ─── Fallback APIs ───

interface FallbackResult {
  id: string;
  description: string;
  author: { username: string; nickname: string; avatar: string };
  video: { url: string; cover: string; dynamicCover: string; duration: number; ratio: string; width: number; height: number };
  qualities: QualityOption[];
  images: string[];
  isSlideshow: boolean;
  livePhotoItems?: { image: string; motion?: string }[];
  isLivePhoto?: boolean;
  stats: Record<string, number>;
  cookieToken: string;
}

async function fetchFromTikwm(videoUrl: string, encryptedCookies: string): Promise<FallbackResult | null> {
  try {
    const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(videoUrl)}&hd=1`;
    const resp = await fetch(apiUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    });
    const data = await resp.json();
    if (data?.code !== 0 || !data?.data) return null;

    const d = data.data;
    const qualities: QualityOption[] = [];

    const slideshowItems: { image: string; motion?: string }[] = [];
    if (d.images && Array.isArray(d.images)) {
      for (const imgUrl of d.images) {
        if (typeof imgUrl === 'string' && imgUrl) slideshowItems.push({ image: imgUrl });
        else if (imgUrl?.url) {
          const motion = imgUrl?.video || imgUrl?.video_url || imgUrl?.live_photo || '';
          slideshowItems.push({ image: imgUrl.url, ...(motion ? { motion } : {}) });
        }
      }
    }
    // tikwm returns motion videos under `live_images` (preferred) or sometimes `live_photo`,
    // as a parallel array of URLs (or {url} objects) matching `images` length.
    const motionSource = (Array.isArray(d.live_images) && d.live_images.length === slideshowItems.length)
      ? d.live_images
      : (Array.isArray(d.live_photo) && d.live_photo.length === slideshowItems.length ? d.live_photo : null);
    if (motionSource) {
      motionSource.forEach((m: any, i: number) => {
        const motion = typeof m === 'string' ? m : m?.url || m?.play_addr || '';
        if (motion) slideshowItems[i].motion = motion;
      });
    }
    const slideshowImages = slideshowItems.map((s) => s.image);
    const liveMotions = slideshowItems.filter((s) => s.motion).length;

    // Offer BOTH HD and compatible when available, with honest labels
    if (d.hdplay) {
      const hdW = d.hd_width || 0;
      const hdH = d.hd_height || 0;
      const hdMax = Math.max(hdW, hdH);
      // Only label as "HD" if we can confirm resolution >= 720, otherwise use "Best available"
      const hdLabel = hdMax >= 1080 ? `${resolutionLabel(hdMax)} (no watermark)`
        : hdMax >= 720 ? `${resolutionLabel(hdMax)} (no watermark)`
        : 'Best available (no watermark)';
      qualities.push({ label: hdLabel, url: d.hdplay, width: hdW, height: hdH, bitrate: 0, watermark: false });
    }
    if (d.play) {
      const sdW = d.width || 0;
      const sdH = d.height || 0;
      const sdMax = Math.max(sdW, sdH);
      const playLabel = d.hdplay
        ? (sdMax > 0 ? `${resolutionLabel(sdMax)} (no watermark)` : 'Standard (no watermark)')
        : (sdMax > 0 ? `${resolutionLabel(sdMax)} · no watermark` : 'Best available (no watermark)');
      qualities.push({ label: playLabel, url: d.play, width: sdW, height: sdH, bitrate: 0, watermark: false });
    }
    if (d.wmplay) {
      qualities.push({ label: 'With watermark', url: d.wmplay, width: 0, height: 0, bitrate: 0, watermark: true });
    }

    return {
      id: String(d.id || ''),
      description: d.title || '',
      author: {
        username: d.author?.unique_id || '',
        nickname: d.author?.nickname || '',
        avatar: d.author?.avatar || '',
      },
      video: {
        url: qualities[0]?.url || d.play || '',
        cover: d.cover || d.origin_cover || '',
        dynamicCover: d.animated_cover || '',
        duration: d.duration || 0,
        ratio: '',
        width: d.width || 0,
        height: d.height || 0,
      },
      qualities,
      images: slideshowImages,
      isSlideshow: slideshowImages.length > 0,
      livePhotoItems: slideshowItems,
      isLivePhoto: liveMotions > 0,
      stats: {
        diggCount: d.digg_count,
        commentCount: d.comment_count,
        shareCount: d.share_count,
        playCount: d.play_count,
      },
      cookieToken: encryptedCookies,
    };
  } catch (e) {
    console.error('TikWM fallback error:', e);
    return null;
  }
}

async function fetchFromTikcdn(videoUrl: string, encryptedCookies: string): Promise<FallbackResult | null> {
  try {
    const resp = await fetch('https://tikcdn.io/ssstik/video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      body: `id=${encodeURIComponent(videoUrl)}&locale=en&tt=1`,
    });
    if (!resp.ok) return null;
    const html = await resp.text();

    // Extract download links from the HTML response
    const hdMatch = html.match(/href="(https?:\/\/[^"]+)"[^>]*>\s*Without watermark\s*\(HD\)/i);
    const sdMatch = html.match(/href="(https?:\/\/[^"]+)"[^>]*>\s*Without watermark/i);

    if (!hdMatch && !sdMatch) return null;

    const qualities: QualityOption[] = [];
    if (hdMatch) qualities.push({ label: 'HD quality (no watermark)', url: hdMatch[1], width: 0, height: 0, bitrate: 0, watermark: false });
    if (sdMatch && sdMatch[1] !== hdMatch?.[1]) qualities.push({ label: 'Standard quality (no watermark)', url: sdMatch[1], width: 0, height: 0, bitrate: 0, watermark: false });

    if (qualities.length === 0) return null;

    return {
      id: '',
      description: '',
      author: { username: '', nickname: '', avatar: '' },
      video: { url: qualities[0].url, cover: '', dynamicCover: '', duration: 0, ratio: '', width: 0, height: 0 },
      qualities,
      images: [],
      isSlideshow: false,
      stats: {},
      cookieToken: encryptedCookies,
    };
  } catch (e) {
    console.error('TikCDN fallback error:', e);
    return null;
  }
}

/** Try all fallback APIs in order, return first success */
async function fetchFromFallbackApis(videoUrl: string, encryptedCookies: string): Promise<FallbackResult | null> {
  // Try tikwm first (most reliable, has metadata)
  const tikwmResult = await fetchFromTikwm(videoUrl, encryptedCookies);
  if (tikwmResult) return tikwmResult;

  // Try tikcdn as second fallback
  const tikcdnResult = await fetchFromTikcdn(videoUrl, encryptedCookies);
  if (tikcdnResult) return tikcdnResult;

  return null;
}

/** Merge fallback HD qualities into primary result if primary is missing HD */
function mergeQualities(primary: QualityOption[], fallback: QualityOption[]): QualityOption[] {
  const primaryUrls = new Set(primary.map(q => q.url));
  const primaryMaxRes = primary.reduce((max, q) => Math.max(max, getQualityResolution(q)), 0);
  const merged = [...primary];

  for (const fq of fallback) {
    if (fq.watermark) continue;
    if (primaryUrls.has(fq.url)) continue;
    const fqRes = getQualityResolution(fq);
    if (fqRes > primaryMaxRes || (primaryMaxRes === 0 && fqRes > 0)) {
      merged.push(fq);
    }
  }

  merged.sort((a, b) => {
    const resA = getQualityResolution(a);
    const resB = getQualityResolution(b);
    if (resB !== resA) return resB - resA;
    return b.bitrate - a.bitrate;
  });

  return merged;
}

// ─── Slideshow extraction ───

interface SlideshowItem {
  image: string;
  motion?: string; // optional motion video for iOS Live Photo
}

function pickFirstUrl(...candidates: any[]): string {
  for (const c of candidates) {
    if (typeof c === 'string' && c) return c;
    if (Array.isArray(c) && c.length > 0 && typeof c[0] === 'string') return c[0];
  }
  return '';
}

function extractSlideshowItems(itemInfo: any): SlideshowItem[] {
  const items: SlideshowItem[] = [];

  const sources = [itemInfo?.imagePost, itemInfo?.imagePostInfo, itemInfo?.image_post_info];
  for (const src of sources) {
    if (items.length > 0) break;
    if (!src?.images || !Array.isArray(src.images)) continue;
    for (const img of src.images) {
      const image = pickFirstUrl(
        img?.imageURL?.urlList,
        img?.imageUrl?.urlList,
        img?.display_image?.url_list,
        img?.url,
      );
      if (!image) continue;
      const motion = pickFirstUrl(
        img?.video?.playAddr?.UrlList,
        img?.video?.PlayAddr?.UrlList,
        img?.video?.url_list,
        img?.video?.playAddr,
        img?.video_url,
      );
      items.push({ image, ...(motion ? { motion } : {}) });
    }
  }

  if (items.length === 0 && itemInfo?.stickersOnItem) {
    for (const s of itemInfo.stickersOnItem) {
      const url = s?.stickerText?.[0] || '';
      if (url) items.push({ image: url });
    }
  }

  return items;
}

function extractSlideshowImages(itemInfo: any): string[] {
  return extractSlideshowItems(itemInfo).map((i) => i.image);
}

// ─── Result builder ───

function buildResult(itemInfo: any, parsedVideo: any, encryptedCookies: string) {
  const video = itemInfo?.video || parsedVideo || {};
  const qualities = extractQualities(video);
  const playAddrUrl = video?.playAddr?.UrlList?.[0]
    || video?.PlayAddr?.UrlList?.[0]
    || (typeof video?.playAddr === 'string' ? video.playAddr : '')
    || (typeof video?.PlayAddr === 'string' ? video.PlayAddr : '');
  const bestUrl = qualities[0]?.url || playAddrUrl || video?.downloadAddr || '';
  const slideshowItems = extractSlideshowItems(itemInfo);
  const slideshowImages = slideshowItems.map((i) => i.image);
  const liveMotions = slideshowItems.map((i) => i.motion || '').filter(Boolean);
  const isLivePhoto = slideshowItems.length > 0 && liveMotions.length > 0;

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
    images: slideshowImages,
    isSlideshow: slideshowImages.length > 0,
    livePhotoItems: slideshowItems,
    isLivePhoto,
    stats: itemInfo?.stats || {},
    cookieToken: encryptedCookies,
  };
}

// ─── Fetch with retry ───

async function fetchWithRetry(url: string, headers: Record<string, string>, maxRetries = 2): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const resp = await fetch(url, { headers, redirect: 'follow' });
      if (resp.ok || resp.status < 500) return resp;
      lastError = new Error(`HTTP ${resp.status}`);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
    if (attempt < maxRetries) {
      await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw lastError || new Error('Fetch failed after retries');
}

// ─── Main handler ───

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
        JSON.stringify({ error: 'Please provide a TikTok URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Primary scrape with retry
    let response: Response;
    try {
      response = await fetchWithRetry(trimmed, headers);
    } catch {
      console.log('Primary scrape failed after retries, trying fallback APIs...');
      const encryptedCookies = await encryptCookies('');
      const fallbackResult = await fetchFromFallbackApis(url, encryptedCookies);
      if (fallbackResult) {
        return new Response(JSON.stringify(fallbackResult), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(
        JSON.stringify({ error: 'Failed to fetch video data. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const setCookieHeaders = response.headers.getSetCookie?.() || [];
    const cookies = setCookieHeaders.map((c: string) => c.split(';')[0]).join('; ');
    let encryptedCookies = '';
    if (cookies) {
      encryptedCookies = await encryptCookies(cookies);
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

    const resolvedUrl = response.url || url;

    if (!scriptData) {
      console.log('No embedded script data found, trying fallback APIs...');
      const fallbackResult = await fetchFromFallbackApis(resolvedUrl, encryptedCookies);
      if (fallbackResult) {
        console.log('Successfully fetched via fallback API (no script data)');
        return new Response(JSON.stringify(fallbackResult), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(
        JSON.stringify({ error: 'Could not find video data. TikTok might be blocking the request.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parsedData = JSON.parse(scriptData);

    // Try extracting from primary data
    let result: ReturnType<typeof buildResult> | null = null;

    const videoDetail = parsedData?.__DEFAULT_SCOPE__?.['webapp.video-detail'];
    if (videoDetail && videoDetail.statusCode === 0) {
      const itemInfo = videoDetail.itemInfo?.itemStruct;
      if (itemInfo) {
        result = buildResult(itemInfo, null, encryptedCookies);
      }
    }

    if (!result || result.qualities.length === 0) {
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
          result = buildResult(itemWithAuthor, item.video, encryptedCookies);
        }
      }
    }

    // If primary extraction succeeded, try to enhance with fallback HD qualities
    if (result && result.qualities.length > 0) {
      // Always try fallback enhancement to get HD qualities if available
      const primaryMaxRes = result.qualities.reduce((max, q) => Math.max(max, getQualityResolution(q)), 0);
      if (primaryMaxRes < 1080) {
        try {
          const fallbackResult = await fetchFromFallbackApis(resolvedUrl, encryptedCookies);
          if (fallbackResult && fallbackResult.qualities.length > 0) {
            result.qualities = mergeQualities(result.qualities, fallbackResult.qualities);
            if (result.qualities[0]?.url) {
              result.video.url = result.qualities[0].url;
            }
          }
        } catch (e) {
          console.log('Fallback enhancement failed (non-critical):', e);
        }
      }

      console.log(`Returning ${result.qualities.length} quality options`);
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Primary failed entirely, use fallback
    console.log('Primary extraction empty, trying fallback APIs...');
    const fallbackResult = await fetchFromFallbackApis(resolvedUrl, encryptedCookies);
    if (fallbackResult) {
      console.log('Successfully fetched via fallback APIs');
      return new Response(JSON.stringify(fallbackResult), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
