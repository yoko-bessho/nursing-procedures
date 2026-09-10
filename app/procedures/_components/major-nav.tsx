"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 大分類はコンテンツ全体の切り替え軸なので、ヘッダー帯に横並びのタブとして置く。
// レイアウトは再レンダリングされず pathname を読めないため、現在地判定は Client で行う。
export function MajorNav({ items }: { items: { slug: string; title: string }[] }) {
  const pathname = usePathname();
  // /procedures/<major>/... の第2セグメントが選択中の大分類。
  const activeSlug = pathname.split("/")[2];

  return (
    <nav
      aria-label="大分類"
      className="sticky top-0 z-10 border-b border-black/10 bg-background dark:border-white/15"
    >
      <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
        {items.map((item) => {
          const isActive = item.slug === activeSlug;
          return (
            <li key={item.slug}>
              <Link
                href={`/procedures/${item.slug}`}
                aria-current={isActive ? "page" : undefined}
                className={`inline-block whitespace-nowrap border-b-2 px-3 py-3 text-sm transition-colors ${
                  isActive
                    ? "border-foreground font-semibold"
                    : "border-transparent text-black/60 hover:text-foreground dark:text-white/60"
                }`}
              >
                {item.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
