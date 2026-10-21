import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildCobaltBody,
  downloadYouTubeFile,
  explainYouTubeFailure,
  parseYouTubeVideoId,
  resolveYouTubeForOriginalUI,
} from "./youtubeRuntime";

const VIDEO_ID = "R35KGQT3fT8";
const USER_VIDEO = "https://youtu.be/" + VIDEO_ID + "?is=UMzhDSFwoT6uHT2b";

afterEach(() => vi.unstubAllGlobals());

describe("YouTube URL validation", () => {
  it("supports this user's shared link and standard video URL formats", () => {
    expect(parseYouTubeVideoId(USER_VIDEO)).toBe(VIDEO_ID);
    expect(parseYouTubeVideoId("https://www.youtube.com/watch?v=" + VIDEO_ID)).toBe(VIDEO_ID);
    expect(parseYouTubeVideoId("https://m.youtube.com/shorts/" + VIDEO_ID)).toBe(VIDEO_ID);
    expect(parseYouTubeVideoId("https://youtube.com/live/" + VIDEO_ID)).toBe(VIDEO_ID);
  });
  it("rejects malformed URLs and a lookalike host", () => {
    expect(parseYouTubeVideoId("https://youtube.com.example/watch?v=" + VIDEO_ID)).toBeNull();
    expect(parseYouTubeVideoId("https://youtu.be/bad")).toBeNull();
    expect(parseYouTubeVideoId("http://youtu.be/" + VIDEO_ID)).toBeNull();
    expect(parseYouTubeVideoId("javascript:alert(1)")).toBeNull();
  });
  it("requests the chosen format instead of an expired direct stream URL", () => {
    const mp4 = buildCobaltBody(USER_VIDEO, "2160", false);
    const audio = buildCobaltBody(USER_VIDEO, "1080", true);
    expect(mp4.url).toBe("https://www.youtube.com/watch?v=" + VIDEO_ID);
    expect("videoQuality" in mp4 && mp4.videoQuality).toBe("2160");
    expect(audio.downloadMode).toBe("audio");
    expect("audioFormat" in audio && audio.audioFormat).toBe("mp3");
  });
});

describe("YouTube service errors", () => {
  it("converts unavailable processors to an actionable explanation", () => {
    expect(explainYouTubeFailure("no_working_processors", 503)).toMatch(/processor.*available/i);
    expect(explainYouTubeFailure("YouTube blocked: sign in to confirm you're not a bot", 502)).toMatch(/blocked/i);
    expect(explainYouTubeFailure("origin_not_allowed", 403)).toMatch(/origin\/CORS/i);
  });
  it("never treats processor errors as a downloaded MP4", async () => {
    const request = vi.fn(async () => ({
      ok: false,
      status: 503,
      json: async () => ({ error: "no_working_processors" }),
    }));
    vi.stubGlobal("fetch", request);
    await expect(downloadYouTubeFile(USER_VIDEO, "1080", false)).rejects.toThrow(/processor.*available/i);
    expect(request).toHaveBeenCalled();
  });
});

describe("extract a YouTube link", () => {
  it("loads the video page without invoking the retired Edge Function", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      calls.push(url);
      if (url.includes("/oembed?")) {
        return { ok: true, json: async () => ({ title: "Video title", author_name: "Uploader" }) };
      }
      return { ok: true, json: async () => ({ ok: true, configured: false }) };
    }));
    const data = await resolveYouTubeForOriginalUI(USER_VIDEO);
    expect(data.id).toBe(VIDEO_ID);
    expect(data.description).toBe("Video title");
    expect(data.video.cover).toContain(VIDEO_ID);
    expect(data.qualities.length).toBeGreaterThan(0);
    expect(data.qualities[0].label).toMatch(/maximum/i);
    expect(calls.every((url) => !url.includes("youtube-scraper"))).toBe(true);
  });
});
