import { getProcedureTree } from "@/lib/procedures";
import { MajorNav } from "./_components/major-nav";
import { ProcedureSearch } from "./_components/procedure-search";

// /procedures 配下だけに 3 ペイン（上=大分類・左=カテゴリ・中央=本文）を被せる。
// トップページなどセクション外には影響させないため、ルートレイアウトではなくここに置く。
export default function ProceduresLayout({ children }: LayoutProps<"/procedures">) {
  // 大分類バーは全ページ共通。ツリー読み込みはビルド時の I/O なのでレイアウトで一度だけ。
  const items = getProcedureTree().map((major) => ({
    slug: major.slug,
    title: major.title,
  }));

  return (
    <div className="flex min-h-full flex-col">
      {/* 検索はどの手順ページからも使えるよう、ヘッダーに大分類タブと並べて置く。 */}
      <header className="sticky top-0 z-10 border-b border-black/10 bg-background dark:border-white/15">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4">
          <MajorNav items={items} />
          <div className="w-full py-2 sm:ml-auto sm:w-64 sm:py-0">
            <ProcedureSearch />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
