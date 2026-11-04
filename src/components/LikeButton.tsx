"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Artwork } from "@/lib/artworks";
import { likeStatus, likeTypeFor, toggleLike } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { useSession } from "@/lib/api/session";
import { HeartIcon } from "./SaveButton";
import { EASE_OUT } from "./motion";

/**
 * Like toggle for one cover (live data). Likes are per cover, and the target type must match
 * the owning book (ORIGINAL_COVER / TRANSLATED_COVER) or the backend counts it twice.
 */
export function LikeButton({ art, className = "" }: { art: Artwork; className?: string }) {
  const router = useRouter();
  const session = useSession();
  const r = art.remote!;
  const type = likeTypeFor(r.kind);
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(r.likeCount);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCount(r.likeCount);
    setLiked(false);
    if (!session || !r.coverId) return;
    let alive = true;
    likeStatus(type, r.coverId).then((s) => { if (alive) { setLiked(s.liked); setCount(s.likeCount); } }).catch(() => {});
    return () => { alive = false; };
  }, [session?.user.id, r.coverId, type, r.likeCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const click = async () => {
    if (!r.coverId || busy) return;
    if (!session) { router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`); return; }
    setBusy(true); setError(null);
    // Optimistic; the server's answer wins.
    setLiked((v) => !v); setCount((c) => c + (liked ? -1 : 1));
    try {
      const res = await toggleLike(type, r.coverId);
      setLiked(res.liked); setCount(res.likeCount);
    } catch (e) {
      setLiked(liked); setCount(count);
      setError(e instanceof ApiError && e.status === 429 ? `잠시 후 다시 · retry in ${e.retryAfter ?? 60}s` : "실패했습니다 · failed");
      window.setTimeout(() => setError(null), 2500);
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        type="button"
        aria-pressed={liked}
        disabled={busy || !r.coverId}
        onClick={click}
        aria-label={liked ? `${art.title} — 좋아요 취소` : `${art.title} — 좋아요`}
        className="label inline-flex h-11 items-center gap-2 rounded-full border border-ink/80 px-5 hover:bg-ink hover:text-museum disabled:opacity-60"
      >
        <span className="relative inline-flex">
          <motion.span key={String(liked)} initial={{ scale: liked ? 0.4 : 1 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 520, damping: 14 }} className="inline-flex">
            <HeartIcon filled={liked} className={`size-[18px] ${liked ? "text-coral" : ""}`} />
          </motion.span>
          <AnimatePresence>
            {liked && <motion.span key="bloom" aria-hidden="true" className="absolute inset-0 rounded-full border border-coral" initial={{ scale: 0.6, opacity: 0.9 }} animate={{ scale: 2.6, opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.7, ease: EASE_OUT }} />}
          </AnimatePresence>
        </span>
        <span>Like · 좋아요</span>
        <span className="tabular-nums">{count}</span>
      </button>
      {error && <span role="status" className="label absolute -top-6 left-0 whitespace-nowrap text-coral">{error}</span>}
    </span>
  );
}
