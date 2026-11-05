"use client";

import { useState } from "react";
import type { Artwork } from "@/lib/artworks";
import { src, srcSet } from "@/lib/artworks";

/**
 * The archived artwork itself. Rendered faithfully: original aspect ratio,
 * no filters, no grain, no overlays.
 */
export function ArtworkImage({
  a, sizes = "(max-width: 768px) 45vw, 20vw", priority = false, className = "", large = false, imgRef, style, ...rest
}: {
  a: Artwork; sizes?: string; priority?: boolean; className?: string; large?: boolean;
  imgRef?: React.Ref<HTMLImageElement>; style?: React.CSSProperties;
} & Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src">) {
  const url = src(a, large ? 1400 : 640);
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
  const alt = `${a.title} 표지${a.credit ? ` — ${a.credit}` : ""}`;

  // No file, or the storage object is gone: keep an empty frame at the cover's proportions so
  // rows stay level — never a broken-image icon, never a stand-in picture.
  if (!url || brokenUrl === url) {
    return (
      <div
        role="img"
        aria-label={`${alt} (cover unavailable)`}
        className={`art art-missing ${className}`}
        style={{ aspectRatio: a.ratioUnknown ? "2 / 3" : `${a.w} / ${a.h}`, ...style }}
      >
        <span className="label text-[9px] opacity-70">Cover<br />unavailable</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={url}
      srcSet={srcSet(a)}
      sizes={sizes}
      width={a.ratioUnknown ? undefined : a.w}
      height={a.ratioUnknown ? undefined : a.h}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : undefined}
      className={`art ${className}`}
      // Unknown size (API cover without width/height): let the image's own proportions decide — never stretch.
      style={{ ...(a.ratioUnknown ? {} : { aspectRatio: `${a.w} / ${a.h}` }), backgroundColor: a.key, ...style }}
      draggable={false}
      onError={() => setBrokenUrl(url)}
      {...rest}
    />
  );
}
