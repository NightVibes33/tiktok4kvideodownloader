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
  // Combine iv + ciphertext, base64url encode
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

function hasOnlyInternalBitrateVariants(video: any): boolean {
  const bitrateInfo = video?.bitrateInfo || video?.bitRateInfo || [];
  if (!Array.isArray(bitrateInfo) || bitrateInfo.length === 0) return false;

  const labels = bitrateInfo
    .map((br) => String(br?.GearName || br?.QualityType || br?.qualityType || '').trim())
    .filter(Boolean);

  return labels.length > 0 && labels.every((label) => /^(lowest|normal|adapt_)/i.test(label));
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
      const codecType = String(br.CodecType || br.codecType || '').toLowerCase();
      const isAdaptive = /^adapt_/i.test(rawLabel);
      const isVideoOnly = isAdaptive || codecType === 'bytevc1';

      // Skip video-only DASH/adaptive variants that break audio sync when downloaded directly.
      if (isVideoOnly) continue;

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
    const resA = Math.max(a.width, a.height);
    const resB = Math.max(b.width, b.height);
    if (resB !== resA) return resB - resA;
    return b.bitrate - a.bitrate;
  });

  return qualities;
}

async function fetchFromFallbackApi(videoUrl: string, encryptedCookies: string): Promise<object | null> {
  try {
    const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(videoUrl)}&hd=1`;
    const resp = await fetch(apiUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    });
    const data = await resp.json();
    if (data?.code !== 0 || !data?.data) return null;

    const d = data.data;
    const qualities: QualityOption[] = [];

    // Check if this is a slideshow/image post
    const slideshowImages: string[] = [];
    if (d.images && Array.isArray(d.images)) {
      for (const imgUrl of d.images) {
        if (typeof imgUrl === 'string' && imgUrl) {
          slideshowImages.push(imgUrl);
        } else if (imgUrl?.url) {
          slideshowImages.push(imgUrl.url);
        }
      }
    }

    if (d.hdplay) {
      qualities.push({ label: 'High quality', url: d.hdplay, width: 0, height: 0, bitrate: 0, watermark: false });
    }
    if (d.play) {
      qualities.push({ label: 'Standard quality', url: d.play, width: 0, height: 0, bitrate: 0, watermark: false });
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
      stats: {
        diggCount: d.digg_count,
        commentCount: d.comment_count,
        shareCount: d.share_count,
        playCount: d.play_count,
      },
      cookieToken: encryptedCookies,
    };
  } catch (e) {
    console.error('Fallback API error:', e);
    return null;
  }
}

function extractSlideshowImages(itemInfo: any): string[] {
  const images: string[] = [];

  // imagePost.images[] structure (common in __UNIVERSAL_DATA)
  const imagePost = itemInfo?.imagePost;
  if (imagePost?.images && Array.isArray(imagePost.images)) {
    for (const img of imagePost.images) {
      const url = img?.imageURL?.urlList?.[0] || img?.imageUrl?.urlList?.[0] || img?.url || '';
      if (url) images.push(url);
    }
  }

  // Alternative: imagePostInfo structure
  const imagePostInfo = itemInfo?.imagePostInfo;
  if (images.length === 0 && imagePostInfo?.images && Array.isArray(imagePostInfo.images)) {
    for (const img of imagePostInfo.images) {
      const url = img?.imageURL?.urlList?.[0] || img?.imageUrl?.urlList?.[0] || img?.url || '';
      if (url) images.push(url);
    }
  }

  // Alternative: sticker/photo structure
  if (images.length === 0 && itemInfo?.stickersOnItem) {
    for (const s of itemInfo.stickersOnItem) {
      const url = s?.stickerText?.[0] || '';
      if (url) images.push(url);
    }
  }

  return images;
}

function buildResult(itemInfo: any, parsedVideo: any, encryptedCookies: string) {
  const video = itemInfo?.video || parsedVideo || {};
  const qualities = extractQualities(video);
  const playAddrUrl = video?.playAddr?.UrlList?.[0]
    || video?.PlayAddr?.UrlList?.[0]
    || (typeof video?.playAddr === 'string' ? video.playAddr : '')
    || (typeof video?.PlayAddr === 'string' ? video.PlayAddr : '');
  const bestUrl = qualities[0]?.url || playAddrUrl || video?.downloadAddr || '';
  const slideshowImages = extractSlideshowImages(itemInfo);

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
    stats: itemInfo?.stats || {},
    cookieToken: encryptedCookies,
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

    const response = await fetch(url, { headers, redirect: 'follow' });

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
      console.log('No embedded script data found, trying fallback API...');
      const fallbackResult = await fetchFromFallbackApi(resolvedUrl, encryptedCookies);
      if (fallbackResult) {
        console.log('Successfully fetched via fallback API (no script data)');
        return new Response(
          JSON.stringify(fallbackResult),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: 'Could not find video data. TikTok might be blocking the request.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parsedData = JSON.parse(scriptData);

    const videoDetail = parsedData?.__DEFAULT_SCOPE__?.['webapp.video-detail'];
    if (videoDetail && videoDetail.statusCode === 0) {
      const itemInfo = videoDetail.itemInfo?.itemStruct;
      if (itemInfo) {
        const result = buildResult(itemInfo, null, encryptedCookies);
        if (result.qualities.length > 0) {
          if (hasOnlyInternalBitrateVariants(itemInfo?.video)) {
            console.log('Only internal bitrate variants found, trying fallback API...');
            const fallbackResult = await fetchFromFallbackApi(resolvedUrl, encryptedCookies);
            if (fallbackResult) {
              console.log('Using fallback API result for stable muxed download');
              return new Response(
                JSON.stringify(fallbackResult),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          }

          console.log(`Extracted ${result.qualities.length} quality options`);
          return new Response(
            JSON.stringify(result),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        // Video found but no qualities (age-restricted/classified) — try fallback
        console.log('Video data empty (possibly content-classified), trying fallback API...');
      }
    }

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
        const result = buildResult(itemWithAuthor, item.video, encryptedCookies);
        if (result.qualities.length > 0) {
          if (hasOnlyInternalBitrateVariants(item?.video)) {
            console.log('Only internal SIGI bitrate variants found, trying fallback API...');
            const fallbackResult = await fetchFromFallbackApi(resolvedUrl, encryptedCookies);
            if (fallbackResult) {
              console.log('Using fallback API result for stable muxed download (SIGI)');
              return new Response(
                JSON.stringify(fallbackResult),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          }

          console.log(`Extracted ${result.qualities.length} quality options (SIGI)`);
          return new Response(
            JSON.stringify(result),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Fallback: use external API for age-restricted or classified videos
    const fallbackResult = await fetchFromFallbackApi(resolvedUrl, encryptedCookies);
    if (fallbackResult) {
      console.log('Successfully fetched via fallback API');
      return new Response(
        JSON.stringify(fallbackResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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