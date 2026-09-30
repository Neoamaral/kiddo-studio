/**
 * Builds the site's icon set from the supplied K mark.
 *
 *   npm run make:icons
 *
 * The source is public/images/logo/kiddo-k.png — a black K on TRANSPARENT,
 * which is the shape of the problem this script exists to solve. A black glyph
 * on transparency is invisible in a dark browser tab, and iOS composites
 * transparency to solid black on the home screen. So one file cannot serve
 * every context, and each output here is the answer to a specific one:
 *
 *   src/app/icon.png        the artwork as supplied. Browsers in light mode.
 *   public/icon-dark.png    the same mark in white, for dark mode, chosen by
 *                           a media query in the layout's metadata.
 *   src/app/apple-icon.png  OPAQUE, on the brand lime. iOS has no transparency
 *                           to give, so this is the one place the mark gets a
 *                           background whether we like it or not.
 *   src/app/favicon.ico     the legacy path, which browsers and feed readers
 *                           still request directly. Opaque for the same reason
 *                           as the Apple icon: it has no media query to fall
 *                           back on, so it has to work on any tab bar.
 *
 * Re-run it if the mark changes. Everything is derived; nothing is hand-edited.
 */

import sharp from "sharp";
import { writeFileSync } from "node:fs";

const SRC = "public/images/logo/kiddo-k.png";
const LIME = { r: 0xc8, g: 0xe8, b: 0x20, alpha: 1 };

/** The mark, trimmed of its transparent margin and re-padded evenly. */
async function mark(size, { white = false, background = null } = {}) {
  // Trim first: the supplied file carries about 75% empty space, so scaling it
  // straight to 32px leaves a K a few pixels tall.
  const trimmed = await sharp(SRC).trim().toBuffer();

  const inner = Math.round(size * (background ? 0.62 : 0.82));
  let glyph = sharp(trimmed).resize(inner, inner, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });

  if (white) {
    // Recolour by keeping the alpha and replacing the colour underneath.
    const { data, info } = await glyph
      .raw()
      .toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += info.channels) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
    }
    glyph = sharp(data, {
      raw: { width: info.width, height: info.height, channels: info.channels },
    });
  }

  const composited = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: background ?? { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite([{ input: await glyph.png().toBuffer(), gravity: "centre" }]);

  return composited.png().toBuffer();
}

/**
 * An ICO containing PNG payloads, which every browser since Vista reads.
 *
 * Written by hand because sharp has no ICO encoder and the format is twenty
 * lines: a six-byte header, a sixteen-byte directory entry per image, then the
 * images themselves.
 */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(images.length, 4);

  const entries = [];
  let offset = 6 + images.length * 16;
  for (const { size, data } of images) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0); // 0 means 256
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2); // palette size
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    entries.push(e);
    offset += data.length;
  }

  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

async function main() {
  // The mark as supplied, for a light tab bar.
  writeFileSync("src/app/icon.png", await mark(512));

  // White, for a dark one.
  // public/, not src/app/: Next's file convention only recognises `icon`,
  // `icon1`, `icon2`… so `icon-dark` there would simply never be served. It is
  // referenced explicitly from the layout's metadata instead.
  writeFileSync("public/icon-dark.png", await mark(512, { white: true }));

  // iOS: opaque, on the brand lime.
  writeFileSync("src/app/apple-icon.png", await mark(180, { background: LIME }));

  // The legacy path. Opaque, so it works on any tab bar without a media query.
  const sizes = [16, 32, 48];
  writeFileSync(
    "src/app/favicon.ico",
    ico(
      await Promise.all(
        sizes.map(async (size) => ({
          size,
          data: await mark(size, { background: LIME }),
        }))
      )
    )
  );

  console.log("icons written:");
  for (const f of [
    "src/app/icon.png",
    "public/icon-dark.png",
    "src/app/apple-icon.png",
    "src/app/favicon.ico",
  ]) {
    console.log(`  ${f}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
