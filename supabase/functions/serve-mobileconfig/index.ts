const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Fetch the mobileconfig from the static public folder
    const origins = [
      "https://tiktok4kvideodownloader.lovable.app",
      Deno.env.get("SUPABASE_URL")?.replace("supabase.co", "lovable.app") ?? "",
    ];

    let body: Uint8Array | null = null;

    for (const origin of origins) {
      if (!origin) continue;
      try {
        const res = await fetch(`${origin}/TikTok_4k_Downloader_Web_Clip_Profile.mobileconfig`);
        if (res.ok) {
          body = new Uint8Array(await res.arrayBuffer());
          break;
        }
      } catch {
        continue;
      }
    }

    if (!body) {
      return new Response("Profile not found", { status: 404, headers: corsHeaders });
    }

    return new Response(body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/x-apple-aspen-config",
        "Content-Disposition": 'attachment; filename="TikTok_4K_Downloader.mobileconfig"',
      },
    });
  } catch (err) {
    console.error("Error serving mobileconfig:", err);
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});
