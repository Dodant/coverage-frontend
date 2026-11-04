"use client";

import type { Artwork, Edition } from "@/lib/artworks";
import { editionImage } from "@/lib/artworks";
import { EditionPlaceholder } from "./EditionPlaceholder";

export const editionLabel = (e: Edition) => `${e.lang ?? "??"}${e.country && e.kind === "original" && e.lang !== "KO" ? ` · ${e.country}` : ""} · ${e.year ?? "—"}`;

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="shrink-0">
      <p className="label mb-3">{title}</p>
      <div className="flex items-end gap-4">{children}</div>
    </div>
  );
}

/** Editions of one work, grouped: original · translations · variants of this edition · redesigns. */
const VARIANT_LABEL: Record<string, string> = { INITIAL: "초판", RECOVER: "리커버", SPECIAL: "특별판", PRINTING: "쇄 변경", IMAGE_REPLACEMENT: "이미지 교체" };

export function EditionsRail({ a, current, onSelect, notice, variant = null, onVariant }: {
  a: Artwork; current: string; onSelect: (key: string) => void; notice: (t: string) => void;
  /** Selected cover id within the edition, and a setter (live data only). */
  variant?: string | null; onVariant?: (coverId: string | null) => void;
}) {
  const originals = a.editions.filter((e) => e.kind === "original");
  const translations = a.editions.filter((e) => e.kind === "translation");
  const sel = a.editions.find((e) => e.key === current)!;

  const Item = ({ e }: { e: Edition }) => {
    const on = e.key === current;
    return (
      <button type="button" aria-pressed={on} onClick={() => onSelect(e.key)} className="group block w-[5.5rem] text-left md:w-[6.75rem]">
        {editionImage(a, e) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={editionImage(a, e)!.url} alt="" className={`block w-full shadow-[0_8px_18px_-8px_rgb(0_0_0/0.4)] transition-transform duration-300 group-hover:-translate-y-1 ${on ? "outline outline-2 outline-offset-4 outline-ink" : ""}`} />
        ) : (
          <EditionPlaceholder e={e} workTitle={a.title} size="sm" className={`transition-transform duration-300 group-hover:-translate-y-1 ${on ? "outline outline-2 outline-offset-4 outline-ink" : ""}`} />
        )}
        <span className={`label mt-2 block text-[10px] ${on ? "font-medium" : "text-ink/70"}`}>{editionLabel(e)} {on ? "●" : editionImage(a, e) ? "" : "◌"}</span>
      </button>
    );
  };

  const chip = "label inline-flex h-9 items-center rounded-full px-3.5 text-[10px]";
  return (
    <div className="-mx-[var(--gutter)] overflow-x-auto border-t border-ink bg-museum/80 px-[var(--gutter)] pb-8 pt-5 backdrop-blur-sm">
      <div className="flex w-max items-end gap-8 md:gap-11">
        {originals.length > 0 && <Group title={`Original · 원서`}>{originals.map((e) => <Item key={e.key} e={e} />)}</Group>}
        {translations.length > 0 && (
          <>
            <span aria-hidden="true" className="w-px self-stretch bg-ink/20" />
            <Group title={`Translations · 번역서 (${translations.length})`}>
              {translations.map((e) => <Item key={e.key} e={e} />)}
              <button type="button" onClick={() => notice("판 제보는 준비 중입니다 · Edition submissions are coming soon.")} className="label flex aspect-[2/3] w-[5.5rem] items-center justify-center border border-ink/30 text-center text-[10px] text-ink/70 hover:border-ink md:w-[6.75rem]">＋<br />Add an<br />edition</button>
            </Group>
          </>
        )}
        <span aria-hidden="true" className="w-px self-stretch bg-ink/20" />
        <Group title="This edition · 같은 판의 표지">
          <div className="flex flex-wrap items-center gap-2 pb-6">
            {sel.variants && sel.variants.length > 0 ? (
              <>
                {sel.variants.map((v, i) => {
                  const on = (variant ?? sel.image?.coverId) === v.coverId;
                  const name = [i === 0 ? "Front" : v.label || VARIANT_LABEL[v.variantType] || `Variant ${i + 1}`, v.ribbonStatus === "BANDED" ? "띠지" : null, v.usedFrom?.slice(0, 4)].filter(Boolean).join(" · ");
                  return (
                    <button key={v.coverId} type="button" aria-pressed={on} onClick={() => onVariant?.(i === 0 ? null : v.coverId)} className={`${chip} ${on ? "bg-ink text-museum" : "border border-ink/40 hover:border-ink"}`}>
                      {name}
                    </button>
                  );
                })}
                {sel.back ? (
                  <button type="button" aria-pressed={variant === sel.back.coverId} onClick={() => onVariant?.(sel.back!.coverId)} className={`${chip} ${variant === sel.back.coverId ? "bg-ink text-museum" : "border border-ink/40 hover:border-ink"}`}>Back</button>
                ) : (
                  <span className={`${chip} border border-dashed border-ink/40 text-ink/60`}>Back — none</span>
                )}
              </>
            ) : (
              <>
                <span className={`${chip} ${sel.cover ? "bg-ink text-museum" : "border border-dashed border-ink/40 text-ink/60"}`}>Front{sel.cover ? "" : " — none"}</span>
                <span className={`${chip} border border-dashed border-ink/40 text-ink/60`}>Back — none</span>
                <span className={`${chip} border border-dashed border-ink/40 text-ink/60`}>띠지 — none</span>
                <span className={`${chip} border border-dashed border-ink/40 text-ink/60`}>Recover — none</span>
              </>
            )}
          </div>
        </Group>
        <span aria-hidden="true" className="w-px self-stretch bg-ink/20" />
        <Group title="Redesigns · 리디자인 (0)">
          <button type="button" onClick={() => notice("리디자인 업로드는 준비 중입니다 · Redesign uploads are coming soon.")} className="label flex aspect-[2/3] w-[5.5rem] items-center justify-center border border-ink/30 text-center text-[10px] text-ink/70 hover:border-ink md:w-[6.75rem]">＋<br />Upload a<br />redesign</button>
        </Group>
      </div>
    </div>
  );
}
