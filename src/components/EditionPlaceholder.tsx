import type { Edition } from "@/lib/artworks";
import { LANG_LABEL } from "@/lib/artworks";

/** The frame an edition occupies before its cover has been archived. Never a stand-in image. */
export function EditionPlaceholder({ e, workTitle, size = "lg", tone = "light", className = "", style }: {
  e: Edition; workTitle: string; size?: "sm" | "lg"; tone?: "light" | "dark"; className?: string; style?: React.CSSProperties;
}) {
  const sm = size === "sm";
  // "light" follows the theme's ink; "dark" is for surfaces that are dark in every theme.
  const line = tone === "dark" ? "rgba(252,251,248,0.45)" : "color-mix(in srgb, var(--c-ink) 40%, transparent)";
  const hatch = tone === "dark" ? "rgba(252,251,248,0.06)" : "color-mix(in srgb, var(--c-ink) 5%, transparent)";
  return (
    <div
      role="img"
      aria-label={`${e.title ?? workTitle} — ${LANG_LABEL[e.lang ?? ""]?.en ?? "unknown language"} edition, cover not yet archived`}
      className={`flex aspect-[2/3] flex-col justify-between border border-dashed ${sm ? "p-2" : "p-[7%]"} ${className}`}
      style={{ borderColor: line, background: `repeating-linear-gradient(135deg, ${hatch} 0 1px, transparent 1px ${sm ? 9 : 12}px)`, ...style }}
    >
      <span className={`serif-i leading-[1] ${sm ? "text-[15px]" : "text-[clamp(1.6rem,3vw,2.6rem)]"} ${e.title ? "" : "opacity-60"}`}>
        {e.title ?? "원제 미기재"}
      </span>
      <span className={`label ${sm ? "text-[9px]" : ""} opacity-75`}>
        Not yet<br />archived
      </span>
    </div>
  );
}
