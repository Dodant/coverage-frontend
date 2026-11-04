import type { ColorFamily } from "./artworks";

export const hexToHsl = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace("#", "").slice(0, 6).padEnd(6, "0"), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
};

export const hslToHex = (h: number, s: number, l: number) => {
  const k = (n: number) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n: number) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return "#" + [f(0), f(8), f(4)].map((x) => x.toString(16).padStart(2, "0")).join("");
};

/** Same buckets as scripts/build-data.mjs, so mock and API data group identically. */
export function familyOf(hex: string): ColorFamily {
  const [h, s, l] = hexToHsl(hex);
  const chroma = s * (1 - Math.abs(2 * l - 1));
  if (chroma < 0.12) return l > 0.55 ? "light" : "dark";
  if (h < 15 || h >= 340) return "red";
  if (h < 42) return "orange";
  if (h < 68) return "yellow";
  if (h < 160) return "green";
  if (h < 200) return "cyan";
  if (h < 255) return "blue";
  if (h < 295) return "violet";
  return "pink";
}

/** Three luminous aurora hues around one dominant colour (the backend gives us only one). */
export function auroraFrom(hex: string): string[] {
  const [h, s] = hexToHsl(hex);
  const sat = s < 0.15 ? 0.12 : Math.min(0.9, s * 0.9 + 0.25);
  return [hslToHex(h, sat, 0.62), hslToHex((h + 28) % 360, sat * 0.85, 0.68), hslToHex((h + 332) % 360, sat * 0.7, 0.74)];
}
