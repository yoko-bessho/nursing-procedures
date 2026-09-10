"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavProcedure = { title: string; routePath: string };
type NavCategory = {
  slug: string;
  title: string;
  routePath: string;
  procedures: NavProcedure[];
};

// 選択中の大分類のカテゴリを縦に並べ、その下に個別手順をぶら下げる。中央カラムの md へ
// サイドから直接飛べるよう手順まで展開する。現在地判定は pathname の完全一致で行う
// （番号プレフィックスを除いたルートパスは Link の href とそろっている）。
export function CategoryNav({ categories }: { categories: NavCategory[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="カテゴリ" className="text-sm md:sticky md:top-16">
      <ul className="space-y-4">
        {categories.map((category) => {
          const categoryHref = `/procedures/${category.routePath}`;
          const categoryActive = pathname === categoryHref;
          return (
            <li key={category.slug}>
              <Link
                href={categoryHref}
                aria-current={categoryActive ? "page" : undefined}
                className={`block font-semibold ${
                  categoryActive
                    ? "text-foreground"
                    : "text-black/70 hover:text-foreground dark:text-white/70"
                }`}
              >
                {category.title}
              </Link>
              {category.procedures.length > 0 && (
                <ul className="mt-1 border-l border-black/10 dark:border-white/15">
                  {category.procedures.map((procedure) => {
                    const href = `/procedures/${procedure.routePath}`;
                    const active = pathname === href;
                    return (
                      <li key={procedure.routePath}>
                        <Link
                          href={href}
                          aria-current={active ? "page" : undefined}
                          className={`-ml-px block border-l-2 py-1 pl-3 transition-colors ${
                            active
                              ? "border-foreground font-medium text-foreground"
                              : "border-transparent text-black/55 hover:border-black/30 hover:text-foreground dark:text-white/55 dark:hover:border-white/30"
                          }`}
                        >
                          {procedure.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
