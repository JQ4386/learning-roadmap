// lib/dedup.ts — near-duplicate suppression for scan results.
//
// Two layers:
//   1. Exact canonical-URL match (O(1) Set).
//   2. Near-duplicate text match via 32-bit SimHash + 4×8-bit LSH bands. Only
//      compares against items sharing a band bucket (no full scan). Hamming
//      distance <= 4 counts as a duplicate.
//
// Tested behavior: the same story reworded across outlets is caught;
// genuinely different or follow-up/extension papers are kept (they differ by
// far more than 4 bits).
//
// Ported verbatim from the prototype; types added for the TS build.

export type DedupBankItem = { u?: string; hash?: number };

export type DedupIndex = {
  byUrl: Set<string>;
  bands: Map<string, number[]>;
};

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "for", "to", "in", "on", "with", "is",
  "are", "at", "by", "from", "as", "its", "their", "new", "via", "how", "what",
  "why", "into", "over",
]);

export function canonUrl(u: string | null | undefined): string {
  if (!u) return "";
  try {
    const x = new URL(u);
    return x.hostname.replace(/^www\./, "") + x.pathname.replace(/\/+$/, "");
  } catch {
    return String(u).toLowerCase();
  }
}

function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function tokenize(s: string): string[] {
  return String(s)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

export function simhash32(text: string): number {
  const v = new Array(32).fill(0);
  tokenize(text).forEach((t) => {
    const h = fnv1a(t);
    for (let b = 0; b < 32; b++) v[b] += (h >>> b) & 1 ? 1 : -1;
  });
  let out = 0;
  for (let b = 0; b < 32; b++) if (v[b] > 0) out |= 1 << b;
  return out >>> 0;
}

export function hamming32(a: number, b: number): number {
  let x = (a ^ b) >>> 0,
    c = 0;
  while (x) {
    x &= x - 1;
    c++;
  }
  return c;
}

function bandKeys(h: number): string[] {
  return [0, 1, 2, 3].map((i) => i + ":" + ((h >>> (i * 8)) & 0xff));
}

export function buildDedupIndex(bank: DedupBankItem[] | null | undefined): DedupIndex {
  const byUrl = new Set<string>();
  const bands = new Map<string, number[]>();
  (bank || []).forEach((b) => {
    if (b.u) byUrl.add(b.u);
    if (typeof b.hash === "number")
      bandKeys(b.hash).forEach((k) => {
        if (!bands.has(k)) bands.set(k, []);
        bands.get(k)!.push(b.hash as number);
      });
  });
  return { byUrl, bands };
}

export function indexAdd(idx: DedupIndex, u: string, hash: number): void {
  if (u) idx.byUrl.add(u);
  bandKeys(hash).forEach((k) => {
    if (!idx.bands.has(k)) idx.bands.set(k, []);
    idx.bands.get(k)!.push(hash);
  });
}

export function isDup(idx: DedupIndex, u: string, hash: number): boolean {
  if (u && idx.byUrl.has(u)) return true;
  const seen = new Set<number>();
  for (const k of bandKeys(hash)) {
    const arr = idx.bands.get(k);
    if (arr)
      for (const h of arr) {
        if (!seen.has(h)) {
          seen.add(h);
          if (hamming32(hash, h) <= 4) return true;
        }
      }
  }
  return false;
}
