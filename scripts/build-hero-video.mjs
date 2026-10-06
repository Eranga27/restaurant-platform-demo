// node scripts/build-hero-video.mjs <video> [--focus 0.5] [--fade 0.8]
//
// Turns a client's kitchen video into the home hero's files (needs ffmpeg and
// ffprobe on the PATH):
//   - a seamless loop: the last `--fade` seconds dissolve into the first frame,
//   - landscape 1920x1080 and portrait 720x1280 cuts (the portrait one is cropped
//     around `--focus`, 0 = left edge, 1 = right edge, of the frame),
//   - each in AV1 (small, for browsers that play it) and H.264 (everything else),
//     silent, with no metadata (phone videos can carry their location),
//   - a poster for each: the loop's first frame, shown until the video plays.
// Files go to public/media/hero/ with a content hash in their names, so they can
// be cached for a year; src/data/hero-video.ts lists them. Old files are removed.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { focus: { type: "string", default: "0.5" }, fade: { type: "string", default: "0.8" } },
});
const [input] = positionals;
if (!input)
  throw new Error("Usage: node scripts/build-hero-video.mjs <video> [--focus 0.5] [--fade 0.8]");
const focus = Number(values.focus);
const fade = Number(values.fade);
if (!(focus >= 0 && focus <= 1)) throw new Error("--focus is between 0 and 1");

const OUT_DIR = "public/media/hero";
const PUBLIC_PATH = "/media/hero";
const ffprobe = (file, entries) =>
  JSON.parse(
    execFileSync("ffprobe", [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-of",
      "json",
      ...entries,
      file,
    ]),
  );

const probe = ffprobe(input, ["-show_entries", "stream=height,r_frame_rate:format=duration"]);
const { height, r_frame_rate } = probe.streams[0];
const duration = Number(probe.format.duration);
const [num, den] = r_frame_rate.split("/").map(Number);
const fps = num / den;
if (duration < fade * 3) throw new Error("The video is too short for the loop's dissolve");

const cuts = {
  landscape: { width: 1920, height: 1080, crop: null },
  // 9:16 from the full height, around the focus point.
  portrait: { width: 720, height: 1280, crop: Math.round((height * 9) / 16 / 2) * 2 },
};
const encoders = {
  av1: ["-c:v", "libsvtav1", "-preset", "4", "-crf", "32", "-svtav1-params", "tune=0"],
  h264: [
    "-c:v",
    "libx264",
    "-preset",
    "veryslow",
    "-crf",
    "24",
    "-profile:v",
    "high",
    "-level:v",
    "4.1",
  ],
};

function filter(cut) {
  const loop =
    `[0:v]split[a][b];[a]trim=start=${fade},setpts=PTS-STARTPTS[a1];` +
    `[b]trim=0:${fade},setpts=PTS-STARTPTS[b1];` +
    `[a1][b1]xfade=transition=fade:duration=${fade}:offset=${duration - 2 * fade}`;
  const crop = cut.crop ? `,crop=${cut.crop}:${height}:(iw-${cut.crop})*${focus}:0` : "";
  return `${loop}${crop},scale=${cut.width}:${cut.height}:flags=lanczos,format=yuv420p[v]`;
}

// <source type> codec strings, from what the encoder chose.
function codecs(file, kind) {
  const { profile, level } = ffprobe(file, ["-show_entries", "stream=profile,level"]).streams[0];
  if (kind === "av1") return `av01.0.${String(level).padStart(2, "0")}M.08`;
  if (profile !== "High") throw new Error(`Unexpected H.264 profile ${profile}`);
  return `avc1.6400${level.toString(16).padStart(2, "0")}`;
}

function hashed(tmp, base, ext) {
  const hash = createHash("sha256").update(readFileSync(tmp)).digest("hex").slice(0, 10);
  const name = `${base}.${hash}.${ext}`;
  renameSync(tmp, join(OUT_DIR, name));
  return `${PUBLIC_PATH}/${name}`;
}

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });
const result = {};
for (const [cutName, cut] of Object.entries(cuts)) {
  const sources = [];
  for (const [kind, args] of Object.entries(encoders)) {
    const tmp = join(OUT_DIR, `tmp-${cutName}-${kind}.mp4`);
    execFileSync(
      "ffmpeg",
      [
        ...["-v", "error", "-y", "-i", input, "-filter_complex", filter(cut), "-map", "[v]"],
        ...args,
        ...["-g", String(Math.round(fps * 2)), "-an", "-map_metadata", "-1", "-map_chapters", "-1"],
        ...["-movflags", "+faststart", tmp],
      ],
      { stdio: ["ignore", "ignore", "inherit"] },
    );
    const type = `video/mp4; codecs="${codecs(tmp, kind)}"`;
    sources.push({ src: hashed(tmp, `hero-${cutName}`, `${kind}.mp4`), type });
  }
  const posterTmp = join(OUT_DIR, `tmp-${cutName}.jpg`);
  const h264 = join("public", sources[1].src);
  execFileSync("ffmpeg", [
    "-v",
    "error",
    "-y",
    "-i",
    h264,
    "-frames:v",
    "1",
    "-q:v",
    "2",
    "-map_metadata",
    "-1",
    posterTmp,
  ]);
  result[cutName] = {
    width: cut.width,
    height: cut.height,
    poster: hashed(posterTmp, `hero-${cutName}`, "jpg"),
    sources,
  };
}

writeFileSync(
  "src/data/hero-video.ts",
  `// Generated by scripts/build-hero-video.mjs. Don't edit by hand.

/** The home hero's video: AV1 first, H.264 for browsers without it. */
export const heroVideo = ${JSON.stringify(result, null, 2)};
`,
);
execFileSync(
  process.execPath,
  ["node_modules/prettier/bin/prettier.cjs", "--write", "src/data/hero-video.ts"],
  {
    stdio: "ignore",
  },
);
for (const file of readdirSync(OUT_DIR)) {
  const kb = Math.round(readFileSync(join(OUT_DIR, file)).length / 1024);
  console.log(`${file.padEnd(40)} ${kb} KB`);
}
