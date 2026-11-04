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
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={src(a, large ? 1400 : 640)}
      srcSet={srcSet(a)}
      sizes={sizes}
      width={a.ratioUnknown ? undefined : a.w}
      height={a.ratioUnknown ? undefined : a.h}
      alt={`${a.title} 표지 — ${a.credit}`}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : undefined}
      className={`art ${className}`}
      // Unknown size (API cover without width/height): let the image's own proportions decide — never stretch.
      style={{ ...(a.ratioUnknown ? {} : { aspectRatio: `${a.w} / ${a.h}` }), backgroundColor: a.key, ...style }}
      draggable={false}
      {...rest}
    />
  );
}
