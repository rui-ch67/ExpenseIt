/**
 * Builds every app icon from the brand mark in docs/brand/.
 *
 *   pnpm icons
 *
 * - expenseit-mark.svg           full-bleed artwork for home-screen icons
 * - expenseit-mark-small.svg     simplified artwork for 16 to 48px (browser tabs)
 * - expenseit-mark-maskable.svg  artwork kept inside Android's safe zone, which
 *                                can crop an icon to a circle or squircle
 *
 * The generated files are committed, so builds never depend on this script.
 */
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const BRAND = "docs/brand";
const MARK = `${BRAND}/expenseit-mark.svg`;
const SMALL = `${BRAND}/expenseit-mark-small.svg`;
const MASKABLE = `${BRAND}/expenseit-mark-maskable.svg`;

function png(svg: string, size: number): Promise<Buffer> {
  return sharp(svg, { density: 300 }).resize(size, size).png().toBuffer();
}

/** An .ico file is a small directory of PNG images, one per size. */
function ico(images: { size: number; data: Buffer }[]): Buffer {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const entry = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, entry); // width (0 means 256)
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1); // height
    header.writeUInt16LE(1, entry + 4); // colour planes
    header.writeUInt16LE(32, entry + 6); // bits per pixel
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map((image) => image.data)]);
}

await mkdir("public/icons", { recursive: true });

await writeFile("public/icons/icon-192.png", await png(MARK, 192));
await writeFile("public/icons/icon-512.png", await png(MARK, 512));
await writeFile("public/icons/icon-maskable-512.png", await png(MASKABLE, 512));
// iOS rounds the corners itself and ignores transparency, so this stays square.
await writeFile("src/app/apple-icon.png", await png(MARK, 180));

// Browser tabs: an SVG for modern browsers, an .ico for everything else.
await copyFile(SMALL, "src/app/icon.svg");
const sizes = [16, 32, 48];
await writeFile(
  "src/app/favicon.ico",
  ico(await Promise.all(sizes.map(async (size) => ({ size, data: await png(SMALL, size) })))),
);

console.log("Icons written to public/icons and src/app.");
