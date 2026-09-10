import { getProcedureTree } from "@/lib/procedures";
import { MajorNav } from "./_components/major-nav";

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
      <MajorNav items={items} />
      {children}
    </div>
  );
}
