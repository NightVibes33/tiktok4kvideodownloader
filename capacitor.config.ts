import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.bobbytatum.tiktok4kvideodownloader",
  appName: "TikTok 4K Video Downloader",
  webDir: "dist",
  bundledWebRuntime: false,
  ios: {
    contentInset: "automatic",
  },
};

export default config;
