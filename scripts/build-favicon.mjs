// npm run brand:favicon. Renders public/brand/mark.svg to 16, 32 and 48 px PNGs and
// packs them into src/app/favicon.ico (ICO files may embed PNG images directly).
// Also writes the app icons: public/icons/ (web app manifest) and src/app/apple-icon.png.
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";

import sharp from "sharp";

const SIZES = [16, 32, 48];
const svg = readFileSync("public/brand/mark.svg");
const pngs = await Promise.all(
  SIZES.map((size) => sharp(svg, { density: 384 }).resize(size, size).png().toBuffer()),
);

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(SIZES.length, 4);

let offset = 6 + 16 * SIZES.length;
const entries = SIZES.map((size, i) => {
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size, 0); // width
  entry.writeUInt8(size, 1); // height
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(pngs[i].length, 8);
  entry.writeUInt32LE(offset, 12);
  offset += pngs[i].length;
  return entry;
});

const target = "src/app/favicon.ico";
writeFileSync(target, Buffer.concat([header, ...entries, ...pngs]));
console.log(`Wrote ${target} (${statSync(target).size} bytes)`);

// App icons. "Maskable" icons keep the mark inside the middle 80% safe zone,
// on the brand background, so Android can crop them to any shape.
const BACKGROUND = "#fbf6ee";
mkdirSync("public/icons", { recursive: true });
const render = (size) => sharp(svg, { density: 384 }).resize(size, size).png().toBuffer();
async function padded(size, markShare) {
  const mark = await render(Math.round(size * markShare));
  return sharp({ create: { width: size, height: size, channels: 4, background: BACKGROUND } })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toBuffer();
}
const icons = [
  ["public/icons/icon-192.png", await render(192)],
  ["public/icons/icon-512.png", await render(512)],
  ["public/icons/maskable-512.png", await padded(512, 0.6)],
  ["src/app/apple-icon.png", await padded(180, 0.78)],
];
for (const [file, png] of icons) {
  writeFileSync(file, png);
  console.log(`Wrote ${file} (${statSync(file).size} bytes)`);
}
