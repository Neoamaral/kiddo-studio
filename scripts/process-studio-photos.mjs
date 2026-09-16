/**
 * Turns the studio's raw photos into the site's room images.
 *
 *   node scripts/process-studio-photos.mjs [sourceDir]
 *
 * The source shots are ~6000px, 3-7MB, and exactly 3:2. The site shows the
 * same rooms at 3:2, 4:3, 3:4 and 21:9 depending on the page, all with
 * object-fit: cover — so the framing decisions live here rather than being
 * whatever a centre crop happens to give.
 *
 * WHY THERE ARE -tall VARIANTS: the home "THE SPACE" strip is 3:4 portrait. A
 * centre crop of a 3:2 frame keeps only the middle half of the width, which
 * threw away the pop-art wall in the creative area — the one feature that
 * room's own copy names — and framed the black box on its bright cyclorama
 * end, which reads as the opposite of "black box".
 */

import sharp from "sharp";

const SRC = process.argv[2] ?? "D:/2Think/Kiddo/photos/KIDDO STUDIO PHOTOS WEB";
const MAX_BYTES = 400_000;

const JOBS = [
  // Landscape — studio page, booking cards, heroes.
  { src: "1-_DSC5214.jpg", out: "space-cyclorama.jpg", w: 1920, h: 1280 },
  { src: "3-_DSC6335.jpg", out: "space-black-box.jpg", w: 1920, h: 1280 },
  { src: "4-_DSC6337.jpg", out: "space-creative.jpg", w: 1920, h: 1280 },
  { src: "2-_DSC6310.jpg", out: "space-makeup.jpg", w: 1920, h: 1280 },
  { src: "3-_DSC6335.jpg", out: "studio-interior.jpg", w: 1920, h: 1280 },

  // Portrait — the rooms grid, framed on the painting.
  { src: "4-_DSC6337.jpg", out: "art-collage.jpg", w: 1280, h: 1920, position: "left" },

  // Portrait — the home strip. Framing is per-room, see the note above.
  { src: "1-_DSC5214.jpg", out: "space-cyclorama-tall.jpg", w: 1080, h: 1440 },
  { src: "3-_DSC6335.jpg", out: "space-black-box-tall.jpg", w: 1080, h: 1440, position: "left" },
  { src: "4-_DSC6337.jpg", out: "space-creative-tall.jpg", w: 1080, h: 1440, position: "left" },
  { src: "2-_DSC6310.jpg", out: "space-makeup-tall.jpg", w: 1080, h: 1440 },
];

let total = 0;
for (const j of JOBS) {
  let quality = 82;
  let buf;
  // Step the quality down rather than shipping a 1MB hero. sharp strips EXIF
  // by default, and .rotate() bakes the orientation before the resize so a
  // portrait original is never resized on the wrong axis.
  for (;;) {
    buf = await sharp(`${SRC}/${j.src}`)
      .rotate()
      .resize({ width: j.w, height: j.h, fit: "cover", position: j.position ?? "centre" })
      .jpeg({ quality, mozjpeg: true, chromaSubsampling: "4:2:0" })
      .toBuffer();
    if (buf.length <= MAX_BYTES || quality <= 58) break;
    quality -= 8;
  }
  await sharp(buf).toFile(`public/images/${j.out}`);
  total += buf.length;
  console.log(
    `${j.out.padEnd(26)} ${j.w}x${j.h}  q${quality}  ${String(Math.round(buf.length / 1024)).padStart(4)} KB   <- ${j.src}`
  );
}
console.log(`\n${JOBS.length} images, ${(total / 1024 / 1024).toFixed(1)} MB total`);
