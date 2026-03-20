const CONFIG_PROFILE = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>PayloadContent</key>
	<array>
		<dict>
			<key>FullScreen</key>
			<true/>
			<key>IgnoreManifestScope</key>
			<true/>
			<key>Icon</key>
			<data>REPLACE_ICON_DATA</data>
			<key>IsRemovable</key>
			<true/>
			<key>Label</key>
			<string>TikTok 4K Downloader</string>
			<key>PayloadDescription</key>
			<string>Configures Web Clip</string>
			<key>PayloadDisplayName</key>
			<string>TikTok 4K Downloader</string>
			<key>PayloadIdentifier</key>
			<string>com.tiktok4kdownloader.webclip</string>
			<key>PayloadType</key>
			<string>com.apple.webClip.managed</string>
			<key>PayloadUUID</key>
			<string>A1B2C3D4-E5F6-7890-ABCD-EF1234567890</string>
			<key>PayloadVersion</key>
			<integer>1</integer>
			<key>Precomposed</key>
			<true/>
			<key>URL</key>
			<string>https://tiktok4kvideodownloader.lovable.app</string>
		</dict>
	</array>
	<key>PayloadDescription</key>
	<string>Adds TikTok 4K Downloader to your Home Screen</string>
	<key>PayloadDisplayName</key>
	<string>TikTok 4K Downloader</string>
	<key>PayloadIdentifier</key>
	<string>com.tiktok4kdownloader.profile</string>
	<key>PayloadOrganization</key>
	<string>TikTok 4K Video Downloader</string>
	<key>PayloadRemovalDisallowed</key>
	<false/>
	<key>PayloadType</key>
	<string>Configuration</string>
	<key>PayloadUUID</key>
	<string>B2C3D4E5-F6A7-8901-BCDE-F12345678901</string>
	<key>PayloadVersion</key>
	<integer>1</integer>
	<key>ConsentText</key>
	<dict>
		<key>default</key>
		<string>This profile will add a TikTok 4K Downloader shortcut to your Home Screen.</string>
	</dict>
</dict>
</plist>`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Read the actual mobileconfig from the uploaded file embedded above
  // We need to serve the original file content with the correct MIME type
  // Let's read it from the request or serve the embedded one

  try {
    // Fetch the original file from the public URL
    const siteUrl = "https://tiktok4kvideodownloader.lovable.app";
    const response = await fetch(`${siteUrl}/TikTok_4k_Downloader_Web_Clip_Profile.mobileconfig`);
    
    if (!response.ok) {
      // Fallback: serve embedded config
      return new Response(CONFIG_PROFILE, {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/x-apple-aspen-config",
          "Content-Disposition": 'attachment; filename="TikTok_4k_Downloader.mobileconfig"',
        },
      });
    }

    const body = await response.text();
    return new Response(body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/x-apple-aspen-config",
        "Content-Disposition": 'attachment; filename="TikTok_4k_Downloader.mobileconfig"',
      },
    });
  } catch {
    return new Response(CONFIG_PROFILE, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/x-apple-aspen-config",
        "Content-Disposition": 'attachment; filename="TikTok_4k_Downloader.mobileconfig"',
      },
    });
  }
});
