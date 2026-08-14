const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory rate limiting
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

function extractVideoId(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null;
    if (!/(^|\.)(youtube\.com|youtube-nocookie\.com|m\.youtube\.com)$/.test(host)) return null;
    if (u.pathname === '/watch') return u.searchParams.get('v');
    const m = u.pathname.match(/^\/(shorts|embed|live|v)\/([A-Za-z0-9_-]{6,})/);
    if (m) return m[2];
    return null;
  } catch {
    return null;
  }
}

interface ClientConfig {
  name: string;
  context: Record<string, unknown>;
  userAgent: string;
}

const CLIENTS: ClientConfig[] = [
  {
    name: 'ANDROID_VR',
    context: {
      client: {
        clientName: 'ANDROID_VR',
        clientVersion: '1.60.19',
        deviceMake: 'Oculus',
        deviceModel: 'Quest 3',
        androidSdkVersion: 32,
        osName: 'Android',
        osVersion: '12',
        hl: 'en',
        gl: 'US',
      },
    },
    userAgent: 'com.google.android.apps.youtube.vr.oculus/1.60.19 (Linux; U; Android 12; en_US)',
  },
  {
    name: 'IOS',
    context: {
      client: {
        clientName: 'IOS',
        clientVersion: '19.45.4',
        deviceMake: 'Apple',
        deviceModel: 'iPhone16,2',
        osName: 'iPhone',
        osVersion: '18.1.0.22B83',
        hl: 'en',
        gl: 'US',
      },
    },
    userAgent: 'com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X;)',
  },
  {
    name: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER',
    context: {
      client: {
        clientName: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER',
        clientVersion: '2.0',
        hl: 'en',
        gl: 'US',
      },
      thirdParty: { embedUrl: 'https://www.youtube.com' },
    },
    userAgent: 'Mozilla/5.0 (PlayStation; PlayStation 4/12.00) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15',
  },
];

const API_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';

async function fetchPlayer(videoId: string, client: ClientConfig) {
  const res = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${API_KEY}&prettyPrint=false`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': client.userAgent,
      'Accept-Language': 'en-US,en;q=0.9',
      'Origin': 'https://www.youtube.com',
    },
    body: JSON.stringify({
      videoId,
      context: client.context,
      contentCheckOk: true,
      racyCheckOk: true,
    }),
  });
  if (!res.ok) throw new Error(`player ${res.status}`);
  return await res.json();
}

interface Quality {
  label: string;
  url: string;
  width: number;
  height: number;
  bitrate: number;
  hasAudio: boolean;
  container: string;
  watermark: boolean;
}

function collectFormats(player: any): { qualities: Quality[]; audio: Quality | null } {
  const sd = player?.streamingData;
  if (!sd) return { qualities: [], audio: null };
  const all = [...(sd.formats || []), ...(sd.adaptiveFormats || [])];
  const qualities: Quality[] = [];
  let bestAudio: Quality | null = null;

  for (const f of all) {
    const url: string | undefined = f.url;
    if (!url) continue; // signatureCipher streams need player JS deciphering — skip
    const mime: string = f.mimeType || '';
    const container = mime.includes('webm') ? 'webm' : mime.includes('mp4a') || mime.includes('mp4') ? 'mp4' : 'bin';
    const isVideo = mime.startsWith('video/');
    const isAudio = mime.startsWith('audio/');
    const hasAudio = isVideo ? !!f.audioQuality || (f.itag === 18 || f.itag === 22) : true;

    if (isAudio) {
      const cand: Quality = {
        label: `Audio ${Math.round((f.bitrate || 0) / 1000)} kbps`,
        url,
        width: 0,
        height: 0,
        bitrate: f.bitrate || 0,
        hasAudio: true,
        container: mime.includes('mp4a') ? 'm4a' : 'webm',
        watermark: false,
      };
      if (!bestAudio || cand.bitrate > bestAudio.bitrate) bestAudio = cand;
      continue;
    }

    if (!isVideo) continue;

    const height = f.height || 0;
    const width = f.width || 0;
    const qLabel = f.qualityLabel || (height ? `${height}p` : 'Video');
    qualities.push({
      label: hasAudio ? qLabel : `${qLabel} (video only)`,
      url,
      width,
      height,
      bitrate: f.bitrate || 0,
      hasAudio,
      container,
      watermark: false,
    });
  }

  // Prefer streams with audio at the same resolution, then higher res, then bitrate
  const seen = new Map<string, Quality>();
  for (const q of qualities) {
    const key = `${q.height}-${q.hasAudio}-${q.container}`;
    const prev = seen.get(key);
    if (!prev || q.bitrate > prev.bitrate) seen.set(key, q);
  }
  const deduped = [...seen.values()].sort((a, b) => {
    if (b.height !== a.height) return b.height - a.height;
    if (a.hasAudio !== b.hasAudio) return a.hasAudio ? -1 : 1;
    return b.bitrate - a.bitrate;
  });

  return { qualities: deduped, audio: bestAudio };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (!checkRateLimit(ip)) {
      return json({ error: 'Rate limit exceeded. Please try again in a minute.' }, 429);
    }

    const body = await req.json().catch(() => ({}));
    const inputUrl: string = body?.url || '';
    const videoId = extractVideoId(inputUrl);
    if (!videoId) {
      return json({ error: 'Please paste a valid YouTube video URL.' }, 400);
    }

    let player: any = null;
    let lastStatus = '';
    for (const client of CLIENTS) {
      try {
        const p = await fetchPlayer(videoId, client);
        const status = p?.playabilityStatus?.status;
        lastStatus = p?.playabilityStatus?.reason || status || '';
        if (status && status !== 'OK') continue;
        const { qualities } = collectFormats(p);
        if (qualities.length) { player = p; break; }
      } catch (e) {
        console.error(`client ${client.name} failed`, e);
      }
    }

    if (!player) {
      return json({
        error: lastStatus
          ? `YouTube refused this video: ${lastStatus}`
          : 'No downloadable streams found. The video may be private, age-restricted or region-locked.',
      }, 422);
    }

    const details = player.videoDetails || {};
    const { qualities, audio } = collectFormats(player);
    const thumbs = details.thumbnail?.thumbnails || [];
    const cover = thumbs.length ? thumbs[thumbs.length - 1].url : `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
    const top = qualities[0];

    return json({
      id: videoId,
      description: details.title || '',
      author: {
        username: (details.author || '').replace(/\s+/g, ''),
        nickname: details.author || '',
        avatar: '',
      },
      video: {
        url: top?.url || '',
        cover,
        duration: Number(details.lengthSeconds || 0),
        width: top?.width || 0,
        height: top?.height || 0,
        ratio: top ? `${top.width}×${top.height}` : '',
      },
      qualities,
      audio,
      stats: {
        playCount: Number(details.viewCount || 0),
      },
    });
  } catch (error) {
    console.error('youtube-scraper error:', error);
    return json({ error: 'Failed to extract video data. Please try again.' }, 500);
  }
});