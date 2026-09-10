import { notFound } from "next/navigation";
import { getMajor } from "@/lib/procedures";
import { CategoryNav } from "../_components/category-nav";

// この層で初めて major パラメータが確定するので、左のカテゴリナビはここで組み立てる。
// dynamicParams=false の配下ページが対象パスを静的列挙するため、レイアウトも各大分類ぶん
// プリレンダリングされる。
export default async function MajorLayout({
  children,
  params,
}: LayoutProps<"/procedures/[major]">) {
  const { major } = await params;
  const node = getMajor(major);
  if (!node) notFound();

  // Client の CategoryNav へ渡すぶんだけに絞る（description / tags などは不要）。
  const categories = node.categories.map((category) => ({
    slug: category.slug,
    title: category.title,
    routePath: category.routePath,
    procedures: category.procedures.map((procedure) => ({
      title: procedure.title,
      routePath: procedure.routePath,
    })),
  }));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 md:flex-row">
      <aside className="shrink-0 md:w-60">
        <CategoryNav categories={categories} />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
