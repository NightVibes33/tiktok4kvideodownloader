"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
process.env.COBALT_API_KEY = "unit-test-only-secret";
process.env.PUBLIC_BASE_URL = "https://test.example";
const { videoId, ytArgs, token, decodeToken } = require("./server.cjs");

test("accepts only real YouTube 11 character video IDs", () => {
  const id = "R35KGQT3fT8";
  assert.equal(videoId("https://youtu.be/" + id + "?is=UMzhDSFwoT6uHT2b"), id);
  assert.equal(videoId("https://www.youtube.com/watch?v=" + id), id);
  assert.equal(videoId("https://m.youtube.com/shorts/" + id), id);
  assert.equal(videoId("https://youtube.com.evil.example/watch?v=" + id), null);
  assert.equal(videoId("https://youtube.com/watch?v=bad"), null);
  assert.equal(videoId("http://youtube.com/watch?v=" + id), null);
});
test("limits quality to requested upper bound and merges separate audio", () => {
  const args = ytArgs({ id: "R35KGQT3fT8", q: "2160", a: false }, "/tmp/media");
  assert(args.join(" ").includes("height<=2160"));
  assert(args.includes("--merge-output-format"));
  assert(args.includes("mp4"));
  assert(!args.includes("-x"));
  assert(args.includes("--js-runtimes"));
});
test("audio uses FFmpeg MP3 extraction", () => {
  const args = ytArgs({ id: "R35KGQT3fT8", q: "max", a: true }, "/tmp/media");
  assert(args.includes("-x"));
  assert(args.includes("--audio-format"));
  assert(args.includes("mp3"));
});
test("signed links are short-lived and tamper-evident", () => {
  const payload = { id: "R35KGQT3fT8", q: "1080", a: false, exp: Date.now() + 30000 };
  const signed = token(payload);
  assert.deepEqual(decodeToken(signed), payload);
  assert.equal(decodeToken(signed.slice(0, -3) + "bad"), null);
  assert.equal(decodeToken(token({ ...payload, exp: Date.now() - 1000 })), null);
  assert.equal(decodeToken(token({ ...payload, q: "9999" })), null);
});
