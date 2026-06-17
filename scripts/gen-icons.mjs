// scripts/gen-icons.mjs — generate PWA PNG icons with zero dependencies.
// Runs automatically before `dev` and `build` (see package.json pre-scripts),
// so the repo stays all-text and Vercel produces the icons during build.

import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function writePng(file, w, h, px) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type, "ascii");
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
    return Buffer.concat([len, t, data, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    px.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  fs.writeFileSync(
    file,
    Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))])
  );
}

const hex = (h) => [
  parseInt(h.slice(0, 2), 16),
  parseInt(h.slice(2, 4), 16),
  parseInt(h.slice(4, 6), 16),
];
const BG = hex("0E1116");
const ACCENT = hex("FF8A3D");
const SKY = hex("7DD3FC");
const PURPLE = hex("C4B5FD");

function render(size, scale = 1.0) {
  const ss = 3;
  const R = size * ss;
  const cx = R / 2;
  const cy = R / 2;
  const buf = Buffer.alloc(R * R * 4);
  for (let i = 0; i < R * R; i++) {
    buf[i * 4] = BG[0];
    buf[i * 4 + 1] = BG[1];
    buf[i * 4 + 2] = BG[2];
    buf[i * 4 + 3] = 255;
  }
  const put = (x, y, c) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= R || y >= R) return;
    const o = (y * R + x) * 4;
    buf[o] = c[0];
    buf[o + 1] = c[1];
    buf[o + 2] = c[2];
    buf[o + 3] = 255;
  };

  const base = (R / 2) * scale;
  const ringR = base * 0.62;
  const ringHalf = base * 0.085;
  const gapStart = ((-90 - 38) * Math.PI) / 180;
  const gapEnd = ((-90 + 38) * Math.PI) / 180;

  for (let y = 0; y < R; y++) {
    for (let x = 0; x < R; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.hypot(dx, dy);
      if (Math.abs(d - ringR) <= ringHalf) {
        const a = Math.atan2(dy, dx);
        if (!(a >= gapStart && a <= gapEnd)) put(x, y, ACCENT);
      }
    }
  }

  const disc = (ccx, ccy, rr, c) => {
    for (let y = Math.floor(ccy - rr - 2); y <= ccy + rr + 2; y++)
      for (let x = Math.floor(ccx - rr - 2); x <= ccx + rr + 2; x++)
        if (Math.hypot(x - ccx, y - ccy) <= rr) put(x, y, c);
  };
  disc(cx, cy, base * 0.14, ACCENT);
  const sat = base * 0.4;
  disc(cx, cy - sat, base * 0.085, ACCENT);
  disc(cx - sat * 0.87, cy + sat * 0.5, base * 0.085, SKY);
  disc(cx + sat * 0.87, cy + sat * 0.5, base * 0.085, PURPLE);

  // box downsample ss x ss
  const out = Buffer.alloc(size * size * 4);
  const n = ss * ss;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0,
        g = 0,
        b = 0;
      for (let j = 0; j < ss; j++)
        for (let i = 0; i < ss; i++) {
          const o = ((y * ss + j) * R + (x * ss + i)) * 4;
          r += buf[o];
          g += buf[o + 1];
          b += buf[o + 2];
        }
      const oo = (y * size + x) * 4;
      out[oo] = (r / n) | 0;
      out[oo + 1] = (g / n) | 0;
      out[oo + 2] = (b / n) | 0;
      out[oo + 3] = 255;
    }
  }
  return out;
}

const dir = path.join(process.cwd(), "public", "icons");
fs.mkdirSync(dir, { recursive: true });
writePng(path.join(dir, "icon-192.png"), 192, 192, render(192, 1.0));
writePng(path.join(dir, "icon-512.png"), 512, 512, render(512, 1.0));
writePng(path.join(dir, "icon-maskable-512.png"), 512, 512, render(512, 0.72));
writePng(path.join(dir, "apple-touch-icon.png"), 180, 180, render(180, 0.86));
console.log("Generated PWA icons in public/icons/");
